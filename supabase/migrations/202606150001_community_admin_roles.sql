alter table public.community_memberships
  add column if not exists role text not null default 'member'
    check (role in ('member', 'admin')),
  add column if not exists display_name text not null default 'Member',
  add column if not exists avatar_url text;

update public.community_memberships memberships
set role = 'admin'
from public.community_groups groups
where groups.id = memberships.group_id
  and groups.created_by = memberships.user_id
  and memberships.role <> 'admin';

create or replace function public.current_community_display_name()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'name', ''),
    nullif(auth.jwt() ->> 'email', ''),
    'Member'
  );
$$;

create or replace function public.current_community_avatar_url()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    nullif(auth.jwt() -> 'user_metadata' ->> 'avatar_url', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'picture', ''),
    null
  );
$$;

create or replace function public.is_community_group_member(target_group_id text, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select target_user_id is not null
    and exists (
      select 1
      from public.community_memberships memberships
      where memberships.group_id = target_group_id
        and memberships.user_id = target_user_id
    );
$$;

create or replace function public.is_community_group_admin(target_group_id text, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select target_user_id is not null
    and exists (
      select 1
      from public.community_memberships memberships
      where memberships.group_id = target_group_id
        and memberships.user_id = target_user_id
        and memberships.role = 'admin'
    );
$$;

drop policy if exists community_memberships_read_group_members on public.community_memberships;
create policy community_memberships_read_group_members
  on public.community_memberships
  for select
  to authenticated
  using (public.is_community_group_member(group_id));

drop policy if exists community_memberships_update_via_rpc_only on public.community_memberships;
create policy community_memberships_update_via_rpc_only
  on public.community_memberships
  for update
  to authenticated
  using (false)
  with check (false);

create or replace function public.join_community_group(target_group_id text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  should_be_admin boolean := false;
begin
  if current_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select coalesce(created_by = current_user_id, false)
  into should_be_admin
  from public.community_groups
  where id = target_group_id;

  if should_be_admin is null then
    raise exception 'community group not found' using errcode = '22023';
  end if;

  insert into public.community_memberships (group_id, user_id, role, display_name, avatar_url)
  values (
    target_group_id,
    current_user_id,
    case when should_be_admin then 'admin' else 'member' end,
    public.current_community_display_name(),
    public.current_community_avatar_url()
  )
  on conflict (group_id, user_id) do update
    set display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        role = case
          when public.community_memberships.role = 'admin' or should_be_admin then 'admin'
          else public.community_memberships.role
        end;

  update public.community_groups
  set member_count = (
    select count(*)::integer
    from public.community_memberships memberships
    where memberships.group_id = target_group_id
  )
  where id = target_group_id;
end;
$$;

create or replace function public.leave_community_group(target_group_id text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  deleted_count integer := 0;
  current_role text;
  admin_count integer := 0;
  total_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select role
  into current_role
  from public.community_memberships
  where group_id = target_group_id
    and user_id = current_user_id;

  select count(*)::integer
  into admin_count
  from public.community_memberships
  where group_id = target_group_id
    and role = 'admin';

  select count(*)::integer
  into total_count
  from public.community_memberships
  where group_id = target_group_id;

  if current_role = 'admin' and admin_count <= 1 and total_count > 1 then
    raise exception 'make another member admin before leaving this group' using errcode = '42501';
  end if;

  delete from public.community_memberships
  where group_id = target_group_id
    and user_id = current_user_id;

  get diagnostics deleted_count = row_count;

  if deleted_count > 0 then
    update public.community_groups
    set member_count = (
      select count(*)::integer
      from public.community_memberships memberships
      where memberships.group_id = target_group_id
    )
    where id = target_group_id;
  end if;
end;
$$;

create or replace function public.set_community_member_role(target_group_id text, target_user_id uuid, next_role text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  admin_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if next_role not in ('member', 'admin') then
    raise exception 'invalid role' using errcode = '22023';
  end if;

  if not public.is_community_group_admin(target_group_id, current_user_id) then
    raise exception 'only group admins can change roles' using errcode = '42501';
  end if;

  if not public.is_community_group_member(target_group_id, target_user_id) then
    raise exception 'member not found' using errcode = '22023';
  end if;

  if next_role = 'member' then
    select count(*)::integer
    into admin_count
    from public.community_memberships
    where group_id = target_group_id
      and role = 'admin';

    if admin_count <= 1 and public.is_community_group_admin(target_group_id, target_user_id) then
      raise exception 'a group must keep at least one admin' using errcode = '42501';
    end if;
  end if;

  update public.community_memberships
  set role = next_role
  where group_id = target_group_id
    and user_id = target_user_id;
end;
$$;

create or replace function public.remove_community_member(target_group_id text, target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  deleted_count integer := 0;
  admin_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not public.is_community_group_admin(target_group_id, current_user_id) then
    raise exception 'only group admins can remove members' using errcode = '42501';
  end if;

  if current_user_id = target_user_id then
    raise exception 'use leave group to remove yourself' using errcode = '42501';
  end if;

  select count(*)::integer
  into admin_count
  from public.community_memberships
  where group_id = target_group_id
    and role = 'admin';

  if admin_count <= 1 and public.is_community_group_admin(target_group_id, target_user_id) then
    raise exception 'a group must keep at least one admin' using errcode = '42501';
  end if;

  delete from public.community_memberships
  where group_id = target_group_id
    and user_id = target_user_id;

  get diagnostics deleted_count = row_count;

  if deleted_count > 0 then
    update public.community_groups
    set member_count = (
      select count(*)::integer
      from public.community_memberships memberships
      where memberships.group_id = target_group_id
    )
    where id = target_group_id;
  end if;
end;
$$;

create or replace function public.delete_community_message(target_message_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  message_group_id text;
  message_author_id uuid;
  message_media_path text;
begin
  if current_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select group_id, author_id, media_path
  into message_group_id, message_author_id, message_media_path
  from public.community_messages
  where id = target_message_id;

  if message_group_id is null then
    return;
  end if;

  if message_author_id is distinct from current_user_id and not public.is_community_group_admin(message_group_id, current_user_id) then
    raise exception 'only the author or a group admin can delete this message' using errcode = '42501';
  end if;

  delete from public.community_messages
  where id = target_message_id;

  if message_media_path is not null and message_media_path <> '' then
    delete from storage.objects
    where bucket_id = 'community-media'
      and name = message_media_path;
  end if;
end;
$$;

revoke all on function public.current_community_display_name() from public;
revoke all on function public.current_community_avatar_url() from public;
revoke all on function public.is_community_group_member(text, uuid) from public;
revoke all on function public.is_community_group_admin(text, uuid) from public;
revoke all on function public.join_community_group(text) from public;
revoke all on function public.leave_community_group(text) from public;
revoke all on function public.set_community_member_role(text, uuid, text) from public;
revoke all on function public.remove_community_member(text, uuid) from public;
revoke all on function public.delete_community_message(uuid) from public;

grant execute on function public.current_community_display_name() to authenticated;
grant execute on function public.current_community_avatar_url() to authenticated;
grant execute on function public.is_community_group_member(text, uuid) to authenticated;
grant execute on function public.is_community_group_admin(text, uuid) to authenticated;
grant execute on function public.join_community_group(text) to authenticated;
grant execute on function public.leave_community_group(text) to authenticated;
grant execute on function public.set_community_member_role(text, uuid, text) to authenticated;
grant execute on function public.remove_community_member(text, uuid) to authenticated;
grant execute on function public.delete_community_message(uuid) to authenticated;

select pg_notify('pgrst', 'reload schema');
