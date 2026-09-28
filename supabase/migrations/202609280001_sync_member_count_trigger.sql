-- Keep community_groups.member_count in sync with community_memberships.
-- Deleting an account cascades to its memberships without going through
-- leave_community_group, which left stale counts behind. A row trigger fires
-- for cascaded deletes too, so every add/remove path now recounts.

create or replace function public.sync_community_group_member_count()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_group_id text := coalesce(new.group_id, old.group_id);
begin
  -- Lock the group row first so concurrent joins/leaves serialize; the count
  -- below then runs as a new statement and sees the other transaction's change.
  perform 1 from public.community_groups where id = target_group_id for update;

  update public.community_groups
  set member_count = (
    select count(*)::integer
    from public.community_memberships memberships
    where memberships.group_id = target_group_id
  )
  where id = target_group_id;
  return null;
end;
$$;

revoke all on function public.sync_community_group_member_count() from public;

drop trigger if exists community_memberships_sync_member_count on public.community_memberships;
create trigger community_memberships_sync_member_count
  after insert or delete on public.community_memberships
  for each row
  execute function public.sync_community_group_member_count();

-- One-time repair of any counts that already drifted.
update public.community_groups groups
set member_count = counts.total
from (
  select g.id, count(m.user_id)::integer as total
  from public.community_groups g
  left join public.community_memberships m on m.group_id = g.id
  group by g.id
) counts
where counts.id = groups.id
  and groups.member_count is distinct from counts.total;
