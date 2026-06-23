-- YourGuideInUSA Supabase setup/update script
-- Run this in the Supabase SQL Editor for your project.
-- It is written to be safe to run more than once.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles used by signup/account cleanup
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

grant select, insert, update on public.profiles to authenticated;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Member'
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

-- ---------------------------------------------------------------------------
-- Blog/admin articles
-- ---------------------------------------------------------------------------
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  category text not null default 'General',
  excerpt text not null default '',
  content text not null,
  read_time integer not null default 1 check (read_time > 0),
  image_url text,
  views integer not null default 0 check (views >= 0),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.articles
  add column if not exists title text,
  add column if not exists slug text,
  add column if not exists category text not null default 'General',
  add column if not exists excerpt text not null default '',
  add column if not exists content text not null default '',
  add column if not exists read_time integer not null default 1,
  add column if not exists image_url text,
  add column if not exists views integer not null default 0,
  add column if not exists published_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists articles_published_at_idx on public.articles (published_at desc);
create index if not exists articles_category_idx on public.articles (category);
create index if not exists articles_slug_idx on public.articles (slug);

alter table public.articles enable row level security;

drop policy if exists articles_read_public on public.articles;
create policy articles_read_public
  on public.articles
  for select
  to anon, authenticated
  using (true);

grant select on public.articles to anon, authenticated;

-- Service role bypasses RLS, but the explicit grant keeps REST writes simple.
grant select, insert, update, delete on public.articles to service_role;

-- ---------------------------------------------------------------------------
-- Contact form submissions
-- ---------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  email text not null check (
    char_length(email) <= 254
    and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  ),
  topic text check (topic is null or char_length(topic) <= 120),
  message text not null check (char_length(btrim(message)) between 10 and 4000),
  page_url text check (page_url is null or char_length(page_url) <= 1000),
  user_agent text check (user_agent is null or char_length(user_agent) <= 1000),
  status text not null default 'new' check (status in ('new', 'reviewed', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

revoke all on table public.contact_messages from public;
revoke all on table public.contact_messages from anon;
revoke all on table public.contact_messages from authenticated;

grant insert (name, email, topic, message, page_url, user_agent)
on table public.contact_messages
to anon, authenticated;

drop policy if exists contact_messages_insert_public on public.contact_messages;
create policy contact_messages_insert_public
  on public.contact_messages
  for insert
  to anon, authenticated
  with check (
    status = 'new'
    and char_length(btrim(name)) between 2 and 120
    and char_length(email) <= 254
    and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    and (topic is null or char_length(topic) <= 120)
    and char_length(btrim(message)) between 10 and 4000
    and (page_url is null or char_length(page_url) <= 1000)
    and (user_agent is null or char_length(user_agent) <= 1000)
  );

grant select, update, delete on public.contact_messages to service_role;

-- ---------------------------------------------------------------------------
-- Community groups, memberships, messages
-- ---------------------------------------------------------------------------
create table if not exists public.community_groups (
  id text primary key,
  name text not null,
  description text not null default '',
  type text not null check (type in ('School', 'City', 'Custom')),
  location text,
  member_count integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists community_groups_type_idx on public.community_groups (type);
create index if not exists community_groups_name_idx on public.community_groups (name);

create table if not exists public.community_memberships (
  group_id text not null references public.community_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  role text not null default 'member' check (role in ('member', 'admin')),
  display_name text not null default 'Member',
  avatar_url text,
  primary key (group_id, user_id)
);

alter table public.community_memberships
  add column if not exists joined_at timestamptz not null default now(),
  add column if not exists role text not null default 'member',
  add column if not exists display_name text not null default 'Member',
  add column if not exists avatar_url text;

update public.community_memberships
set
  role = case when role in ('member', 'admin') then role else 'member' end,
  display_name = coalesce(nullif(display_name, ''), 'Member');

alter table public.community_memberships
  alter column joined_at set default now(),
  alter column joined_at set not null,
  alter column role set default 'member',
  alter column role set not null,
  alter column display_name set default 'Member',
  alter column display_name set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'community_memberships_role_check'
      and conrelid = 'public.community_memberships'::regclass
  ) then
    alter table public.community_memberships
      add constraint community_memberships_role_check
      check (role in ('member', 'admin'));
  end if;
end;
$$;

create index if not exists community_memberships_user_idx
  on public.community_memberships (user_id, joined_at desc);

create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  group_id text not null references public.community_groups(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  body text not null,
  message_type text not null default 'text',
  media_url text,
  media_path text,
  file_name text,
  mime_type text,
  duration_seconds integer,
  created_at timestamptz not null default now()
);

alter table public.community_messages
  add column if not exists message_type text not null default 'text',
  add column if not exists media_url text,
  add column if not exists media_path text,
  add column if not exists file_name text,
  add column if not exists mime_type text,
  add column if not exists duration_seconds integer;

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

update public.community_messages
set
  message_type = 'text',
  media_url = null,
  media_path = null,
  file_name = null,
  mime_type = null,
  duration_seconds = null,
  body = case
    when btrim(coalesce(body, '')) = '' then '[Voice note removed]'
    else body
  end
where message_type = 'voice';

alter table public.community_messages
  drop constraint if exists community_messages_message_type_check;

alter table public.community_messages
  add constraint community_messages_message_type_check
  check (message_type in ('text', 'image'));

create index if not exists community_messages_group_created_idx
  on public.community_messages (group_id, created_at);

create table if not exists public.community_channel_messages (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('general', 'announcements')),
  author_name text not null default 'Admin',
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

alter table public.community_channel_messages
  add column if not exists channel text not null default 'general',
  add column if not exists author_name text not null default 'Admin',
  add column if not exists body text not null default '',
  add column if not exists created_at timestamptz not null default now();

alter table public.community_channel_messages
  drop constraint if exists community_channel_messages_channel_check;

alter table public.community_channel_messages
  add constraint community_channel_messages_channel_check
  check (channel in ('general', 'announcements'));

create index if not exists community_channel_messages_channel_created_idx
  on public.community_channel_messages (channel, created_at desc);

create table if not exists public.community_moderators (
  email text primary key check (
    char_length(email) <= 254
    and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  ),
  enabled boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.community_moderators
  add column if not exists enabled boolean not null default true,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

update public.community_moderators
set email = lower(btrim(email))
where email <> lower(btrim(email));

create index if not exists community_moderators_enabled_idx
  on public.community_moderators (enabled, email);

alter table public.community_groups enable row level security;
alter table public.community_memberships enable row level security;
alter table public.community_messages enable row level security;
alter table public.community_channel_messages enable row level security;
alter table public.community_moderators enable row level security;

grant select on public.community_groups to anon, authenticated;
grant insert on public.community_groups to authenticated;
grant update (name, description, type, location) on public.community_groups to authenticated;
revoke update (member_count, created_by, created_at) on public.community_groups from authenticated;

grant select, insert, update, delete on public.community_memberships to authenticated;
grant select, insert, update, delete on public.community_messages to authenticated;
grant select, insert, delete on public.community_channel_messages to authenticated;
grant select, insert, update, delete on public.community_moderators to authenticated;

create or replace function public.is_global_community_moderator(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select target_user_id is not null
    and exists (
      select 1
      from auth.users users
      join public.community_moderators moderators
        on lower(moderators.email) = lower(users.email)
      where users.id = target_user_id
        and moderators.enabled = true
    );
$$;

drop policy if exists community_moderators_read_moderators on public.community_moderators;
create policy community_moderators_read_moderators
  on public.community_moderators
  for select
  to authenticated
  using (public.is_global_community_moderator(auth.uid()));

drop policy if exists community_moderators_insert_moderators on public.community_moderators;
create policy community_moderators_insert_moderators
  on public.community_moderators
  for insert
  to authenticated
  with check (public.is_global_community_moderator(auth.uid()));

drop policy if exists community_moderators_update_moderators on public.community_moderators;
create policy community_moderators_update_moderators
  on public.community_moderators
  for update
  to authenticated
  using (public.is_global_community_moderator(auth.uid()))
  with check (public.is_global_community_moderator(auth.uid()));

drop policy if exists community_moderators_delete_moderators on public.community_moderators;
create policy community_moderators_delete_moderators
  on public.community_moderators
  for delete
  to authenticated
  using (public.is_global_community_moderator(auth.uid()));

drop policy if exists community_channel_messages_read_authenticated on public.community_channel_messages;
create policy community_channel_messages_read_authenticated
  on public.community_channel_messages
  for select
  to authenticated
  using (true);

drop policy if exists community_channel_messages_insert_moderators on public.community_channel_messages;
create policy community_channel_messages_insert_moderators
  on public.community_channel_messages
  for insert
  to authenticated
  with check (public.is_global_community_moderator(auth.uid()));

drop policy if exists community_channel_messages_delete_moderators on public.community_channel_messages;
create policy community_channel_messages_delete_moderators
  on public.community_channel_messages
  for delete
  to authenticated
  using (public.is_global_community_moderator(auth.uid()));

-- Seed the current project owner as the first global community moderator.
insert into public.community_moderators (email, enabled)
values ('dhanushvarma10102000@gmail.com', true)
on conflict (email) do update
set enabled = true;

create or replace function public.is_community_group_member(target_group_id text, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select target_user_id is not null
    and (
      public.is_global_community_moderator(target_user_id)
      or exists (
        select 1
        from public.community_memberships memberships
        where memberships.group_id = target_group_id
          and memberships.user_id = target_user_id
      )
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
    and (
      public.is_global_community_moderator(target_user_id)
      or exists (
        select 1
        from public.community_memberships memberships
        where memberships.group_id = target_group_id
          and memberships.user_id = target_user_id
          and memberships.role = 'admin'
      )
    );
$$;

drop policy if exists community_groups_read_all on public.community_groups;
create policy community_groups_read_all
  on public.community_groups
  for select
  using (true);

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

drop policy if exists community_memberships_read_own on public.community_memberships;
drop policy if exists community_memberships_read_group_members on public.community_memberships;
create policy community_memberships_read_group_members
  on public.community_memberships
  for select
  to authenticated
  using (public.is_community_group_member(group_id));

drop policy if exists community_memberships_insert_own on public.community_memberships;
drop policy if exists community_memberships_insert_via_rpc_only on public.community_memberships;
create policy community_memberships_insert_via_rpc_only
  on public.community_memberships
  for insert
  to authenticated
  with check (false);

drop policy if exists community_memberships_update_via_rpc_only on public.community_memberships;
create policy community_memberships_update_via_rpc_only
  on public.community_memberships
  for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists community_memberships_delete_own on public.community_memberships;
drop policy if exists community_memberships_delete_via_rpc_only on public.community_memberships;
create policy community_memberships_delete_via_rpc_only
  on public.community_memberships
  for delete
  to authenticated
  using (false);

drop policy if exists community_messages_read_all on public.community_messages;
drop policy if exists community_messages_read_members on public.community_messages;
create policy community_messages_read_members
  on public.community_messages
  for select
  to authenticated
  using (public.is_community_group_member(community_messages.group_id, auth.uid()));

drop policy if exists community_messages_insert_authenticated on public.community_messages;
drop policy if exists community_messages_insert_members on public.community_messages;
create policy community_messages_insert_members
  on public.community_messages
  for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and message_type in ('text', 'image')
    and public.is_community_group_member(community_messages.group_id, auth.uid())
  );

drop policy if exists community_messages_update_own_recent on public.community_messages;
create policy community_messages_update_own_recent
  on public.community_messages
  for update
  to authenticated
  using (
    author_id = auth.uid()
    and message_type = 'text'
    and created_at >= now() - interval '2 minutes'
    and public.is_community_group_member(community_messages.group_id, auth.uid())
  )
  with check (
    author_id = auth.uid()
    and message_type = 'text'
    and created_at >= now() - interval '2 minutes'
    and public.is_community_group_member(community_messages.group_id, auth.uid())
  );

drop policy if exists community_messages_delete_own on public.community_messages;
create policy community_messages_delete_own
  on public.community_messages
  for delete
  to authenticated
  using (author_id = auth.uid());

revoke update on public.community_messages from authenticated;
grant update (body) on public.community_messages to authenticated;

-- ---------------------------------------------------------------------------
-- Community media storage bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-media',
  'community-media',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists community_media_read_all on storage.objects;
drop policy if exists community_media_insert_authenticated on storage.objects;
drop policy if exists community_media_read_members on storage.objects;
drop policy if exists community_media_insert_owner_or_member on storage.objects;
drop policy if exists community_media_delete_owner on storage.objects;

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
      or public.is_community_group_member((storage.foldername(name))[1], auth.uid())
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
        and public.is_community_group_member((storage.foldername(name))[1], auth.uid())
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

-- ---------------------------------------------------------------------------
-- Community helper RPCs
-- ---------------------------------------------------------------------------
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
    and (
      public.is_global_community_moderator(target_user_id)
      or exists (
        select 1
        from public.community_memberships memberships
        where memberships.group_id = target_group_id
          and memberships.user_id = target_user_id
      )
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
    and (
      public.is_global_community_moderator(target_user_id)
      or exists (
        select 1
        from public.community_memberships memberships
        where memberships.group_id = target_group_id
          and memberships.user_id = target_user_id
          and memberships.role = 'admin'
      )
    );
$$;

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

  delete from public.profiles
  where id = current_user_id;

  delete from auth.users
  where id = current_user_id;
end;
$$;

revoke all on function public.current_community_display_name() from public;
revoke all on function public.current_community_avatar_url() from public;
revoke all on function public.is_global_community_moderator(uuid) from public;
revoke all on function public.is_community_group_member(text, uuid) from public;
revoke all on function public.is_community_group_admin(text, uuid) from public;
revoke all on function public.join_community_group(text) from public;
revoke all on function public.leave_community_group(text) from public;
revoke all on function public.set_community_member_role(text, uuid, text) from public;
revoke all on function public.remove_community_member(text, uuid) from public;
revoke all on function public.delete_community_message(uuid) from public;
revoke all on function public.delete_current_user(text) from public;

grant execute on function public.current_community_display_name() to authenticated;
grant execute on function public.current_community_avatar_url() to authenticated;
grant execute on function public.is_global_community_moderator(uuid) to authenticated;
grant execute on function public.is_community_group_member(text, uuid) to authenticated;
grant execute on function public.is_community_group_admin(text, uuid) to authenticated;
grant execute on function public.join_community_group(text) to authenticated;
grant execute on function public.leave_community_group(text) to authenticated;
grant execute on function public.set_community_member_role(text, uuid, text) to authenticated;
grant execute on function public.remove_community_member(text, uuid) to authenticated;
grant execute on function public.delete_community_message(uuid) to authenticated;
grant execute on function public.delete_current_user(text) to authenticated;

-- Make existing group creators admins.
update public.community_memberships memberships
set role = 'admin'
from public.community_groups groups
where groups.id = memberships.group_id
  and groups.created_by = memberships.user_id
  and memberships.role <> 'admin';

-- ---------------------------------------------------------------------------
-- Preset community groups
-- ---------------------------------------------------------------------------
insert into public.community_groups (id, name, description, type, location, member_count)
values
  ('asu', 'Arizona State University', 'International student community for ASU.', 'School', 'Tempe, Arizona', 0),
  ('gcu', 'Grand Canyon University', 'International student community for GCU.', 'School', 'Phoenix, Arizona', 0),
  ('university-of-arizona', 'University of Arizona', 'International student community for University of Arizona.', 'School', 'Tucson, Arizona', 0),
  ('ut-austin', 'University of Texas at Austin', 'International student community for UT Austin.', 'School', 'Austin, Texas', 0),
  ('texas-am', 'Texas A&M University', 'International student community for Texas A&M.', 'School', 'College Station, Texas', 0),
  ('ucla', 'UCLA', 'International student community for UCLA.', 'School', 'Los Angeles, California', 0),
  ('usc', 'University of Southern California', 'International student community for USC.', 'School', 'Los Angeles, California', 0),
  ('uc-berkeley', 'UC Berkeley', 'International student community for UC Berkeley.', 'School', 'Berkeley, California', 0),
  ('stanford', 'Stanford University', 'International student community for Stanford.', 'School', 'Stanford, California', 0),
  ('nyu', 'New York University', 'International student community for NYU.', 'School', 'New York, New York', 0),
  ('columbia', 'Columbia University', 'International student community for Columbia.', 'School', 'New York, New York', 0),
  ('northeastern', 'Northeastern University', 'International student community for Northeastern.', 'School', 'Boston, Massachusetts', 0),
  ('boston-university', 'Boston University', 'International student community for BU.', 'School', 'Boston, Massachusetts', 0),
  ('uiuc', 'University of Illinois Urbana-Champaign', 'International student community for UIUC.', 'School', 'Urbana-Champaign, Illinois', 0),
  ('university-of-washington', 'University of Washington', 'International student community for UW.', 'School', 'Seattle, Washington', 0),
  ('georgia-tech', 'Georgia Tech', 'International student community for Georgia Tech.', 'School', 'Atlanta, Georgia', 0),
  ('university-of-michigan', 'University of Michigan', 'International student community for University of Michigan.', 'School', 'Ann Arbor, Michigan', 0),
  ('purdue', 'Purdue University', 'International student community for Purdue.', 'School', 'West Lafayette, Indiana', 0),
  ('university-of-florida', 'University of Florida', 'International student community for University of Florida.', 'School', 'Gainesville, Florida', 0),
  ('upenn', 'University of Pennsylvania', 'International student community for Penn.', 'School', 'Philadelphia, Pennsylvania', 0),
  ('phoenix', 'Phoenix', 'City group for international students and newcomers in Phoenix.', 'City', 'Arizona', 0),
  ('tempe', 'Tempe', 'City group for international students and newcomers in Tempe.', 'City', 'Arizona', 0),
  ('los-angeles', 'Los Angeles', 'City group for international students and newcomers in Los Angeles.', 'City', 'California', 0),
  ('san-francisco-bay-area', 'San Francisco Bay Area', 'City group for international students and newcomers in the Bay Area.', 'City', 'California', 0),
  ('new-york-city', 'New York City', 'City group for international students and newcomers in New York City.', 'City', 'New York', 0),
  ('boston', 'Boston', 'City group for international students and newcomers in Boston.', 'City', 'Massachusetts', 0),
  ('chicago', 'Chicago', 'City group for international students and newcomers in Chicago.', 'City', 'Illinois', 0),
  ('austin', 'Austin', 'City group for international students and newcomers in Austin.', 'City', 'Texas', 0),
  ('dallas-fort-worth', 'Dallas-Fort Worth', 'City group for international students and newcomers in DFW.', 'City', 'Texas', 0),
  ('houston', 'Houston', 'City group for international students and newcomers in Houston.', 'City', 'Texas', 0),
  ('seattle', 'Seattle', 'City group for international students and newcomers in Seattle.', 'City', 'Washington', 0),
  ('atlanta', 'Atlanta', 'City group for international students and newcomers in Atlanta.', 'City', 'Georgia', 0),
  ('miami', 'Miami', 'City group for international students and newcomers in Miami.', 'City', 'Florida', 0),
  ('washington-dc', 'Washington, DC', 'City group for international students and newcomers in Washington, DC.', 'City', 'District of Columbia', 0),
  ('san-diego', 'San Diego', 'City group for international students and newcomers in San Diego.', 'City', 'California', 0),
  ('denver', 'Denver', 'City group for international students and newcomers in Denver.', 'City', 'Colorado', 0)
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  type = excluded.type,
  location = excluded.location;

select pg_notify('pgrst', 'reload schema');

commit;
