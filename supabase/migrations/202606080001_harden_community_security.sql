alter table public.community_messages
  add column if not exists media_path text;

delete from public.community_messages message
where not exists (
  select 1
  from public.community_groups groups
  where groups.id = message.group_id
);

alter table public.community_messages
  drop constraint if exists community_messages_group_id_fkey;

alter table public.community_messages
  add constraint community_messages_group_id_fkey
  foreign key (group_id)
  references public.community_groups(id)
  on delete cascade;

alter table public.community_groups enable row level security;
alter table public.community_messages enable row level security;
alter table public.community_memberships enable row level security;

drop policy if exists community_groups_insert_authenticated on public.community_groups;
create policy community_groups_insert_authenticated
  on public.community_groups
  for insert
  to authenticated
  with check (
    auth.uid() is not null
    and created_by = auth.uid()
    and member_count = 0
  );

drop policy if exists community_groups_update_owner on public.community_groups;
create policy community_groups_update_owner
  on public.community_groups
  for update
  to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

revoke update (member_count, created_by, created_at) on public.community_groups from authenticated;
grant update (name, description, type, location) on public.community_groups to authenticated;

drop policy if exists community_memberships_insert_own on public.community_memberships;
drop policy if exists community_memberships_insert_via_rpc_only on public.community_memberships;
create policy community_memberships_insert_via_rpc_only
  on public.community_memberships
  for insert
  to authenticated
  with check (false);

drop policy if exists community_memberships_delete_own on public.community_memberships;
drop policy if exists community_memberships_delete_via_rpc_only on public.community_memberships;
create policy community_memberships_delete_via_rpc_only
  on public.community_memberships
  for delete
  to authenticated
  using (false);

create or replace function public.join_community_group(target_group_id text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  inserted_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.community_groups
    where id = target_group_id
  ) then
    raise exception 'community group not found' using errcode = '22023';
  end if;

  insert into public.community_memberships (group_id, user_id)
  values (target_group_id, current_user_id)
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

create or replace function public.leave_community_group(target_group_id text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  deleted_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  delete from public.community_memberships
  where group_id = target_group_id
    and user_id = current_user_id;

  get diagnostics deleted_count = row_count;

  if deleted_count > 0 then
    update public.community_groups
    set member_count = greatest(member_count - 1, 0)
    where id = target_group_id;
  end if;
end;
$$;

revoke all on function public.leave_community_group(text) from public;
grant execute on function public.leave_community_group(text) to authenticated;

drop policy if exists community_messages_read_all on public.community_messages;
drop policy if exists community_messages_read_members on public.community_messages;
create policy community_messages_read_members
  on public.community_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.community_memberships memberships
      where memberships.group_id = community_messages.group_id
        and memberships.user_id = auth.uid()
    )
  );

drop policy if exists community_messages_insert_authenticated on public.community_messages;
drop policy if exists community_messages_insert_members on public.community_messages;
create policy community_messages_insert_members
  on public.community_messages
  for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1
      from public.community_memberships memberships
      where memberships.group_id = community_messages.group_id
        and memberships.user_id = auth.uid()
    )
  );

drop policy if exists community_messages_update_own_recent on public.community_messages;
create policy community_messages_update_own_recent
  on public.community_messages
  for update
  to authenticated
  using (
    author_id = auth.uid()
    and message_type = 'text'
    and created_at >= now() - interval '3 minutes'
    and exists (
      select 1
      from public.community_memberships memberships
      where memberships.group_id = community_messages.group_id
        and memberships.user_id = auth.uid()
    )
  )
  with check (
    author_id = auth.uid()
    and message_type = 'text'
    and created_at >= now() - interval '3 minutes'
    and exists (
      select 1
      from public.community_memberships memberships
      where memberships.group_id = community_messages.group_id
        and memberships.user_id = auth.uid()
    )
  );

revoke update on public.community_messages from authenticated;
grant update (body) on public.community_messages to authenticated;

drop policy if exists community_media_read_all on storage.objects;
drop policy if exists community_media_insert_authenticated on storage.objects;
drop policy if exists community_media_read_members on storage.objects;
drop policy if exists community_media_insert_owner_or_member on storage.objects;
drop policy if exists community_media_delete_owner on storage.objects;

update storage.buckets
set public = false,
    file_size_limit = 10485760
where id = 'community-media';

create policy community_media_read_members
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'community-media'
    and (
      (
        (storage.foldername(name))[1] = 'profile-photos'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
      or exists (
        select 1
        from public.community_memberships memberships
        where memberships.group_id = (storage.foldername(name))[1]
          and memberships.user_id = auth.uid()
      )
    )
  );

create policy community_media_insert_owner_or_member
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'community-media'
    and (
      (
        (storage.foldername(name))[1] = 'profile-photos'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
      or (
        (storage.foldername(name))[2] = auth.uid()::text
        and exists (
          select 1
          from public.community_memberships memberships
          where memberships.group_id = (storage.foldername(name))[1]
            and memberships.user_id = auth.uid()
        )
      )
    )
  );

create policy community_media_delete_owner
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'community-media'
    and (
      (
        (storage.foldername(name))[1] = 'profile-photos'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
      or (storage.foldername(name))[2] = auth.uid()::text
    )
  );

drop function if exists public.delete_current_user();

create or replace function public.delete_current_user(confirmation_email text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, auth
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  token_issued_at bigint;
begin
  if current_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  token_issued_at := nullif(auth.jwt() ->> 'iat', '')::bigint;
  if token_issued_at is null or to_timestamp(token_issued_at) < now() - interval '10 minutes' then
    raise exception 'please sign in again before deleting your account' using errcode = '28000';
  end if;

  select email
  into current_email
  from auth.users
  where id = current_user_id;

  if current_email is null then
    raise exception 'account not found' using errcode = '22023';
  end if;

  if lower(btrim(coalesce(confirmation_email, ''))) <> lower(current_email) then
    raise exception 'confirmation email does not match' using errcode = '28000';
  end if;

  delete from storage.objects
  where bucket_id = 'community-media'
    and (
      name like 'profile-photos/' || current_user_id::text || '/%'
      or name like '%/' || current_user_id::text || '/%'
    );

  delete from public.community_messages
  where author_id = current_user_id;

  delete from public.community_memberships
  where user_id = current_user_id;

  update public.community_groups
  set created_by = null
  where created_by = current_user_id;

  if to_regclass('public.profiles') is not null then
    execute 'delete from public.profiles where id = $1'
    using current_user_id;
  end if;

  delete from auth.users
  where id = current_user_id;
end;
$$;

revoke all on function public.delete_current_user(text) from public;
grant execute on function public.delete_current_user(text) to authenticated;

select pg_notify('pgrst', 'reload schema');
