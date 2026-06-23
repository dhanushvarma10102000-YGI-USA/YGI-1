create table if not exists community_memberships (
  group_id text not null references community_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table community_memberships enable row level security;

drop policy if exists community_memberships_read_own on community_memberships;
create policy community_memberships_read_own
  on community_memberships
  for select
  using (auth.uid() = user_id);

drop policy if exists community_memberships_insert_own on community_memberships;
create policy community_memberships_insert_own
  on community_memberships
  for insert
  with check (auth.uid() = user_id);

drop policy if exists community_memberships_delete_own on community_memberships;
create policy community_memberships_delete_own
  on community_memberships
  for delete
  using (auth.uid() = user_id);

create index if not exists community_memberships_user_idx
  on community_memberships (user_id, joined_at desc);

create or replace function public.join_community_group(target_group_id text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  inserted_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.community_memberships (group_id, user_id)
  values (target_group_id, auth.uid())
  on conflict (group_id, user_id) do nothing;

  get diagnostics inserted_count = row_count;

  if inserted_count > 0 then
    update public.community_groups
    set member_count = member_count + 1
    where id = target_group_id;
  end if;
end;
$$;

revoke all on function public.join_community_group(text) from public;
grant execute on function public.join_community_group(text) to authenticated;
