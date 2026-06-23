create table if not exists community_groups (
  id text primary key,
  name text not null,
  description text not null default '',
  type text not null check (type in ('School', 'City', 'Custom')),
  location text,
  member_count integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table community_groups enable row level security;

drop policy if exists community_groups_read_all on community_groups;
create policy community_groups_read_all
  on community_groups
  for select
  using (true);

drop policy if exists community_groups_insert_authenticated on community_groups;
create policy community_groups_insert_authenticated
  on community_groups
  for insert
  with check (auth.uid() is not null and created_by = auth.uid());

drop policy if exists community_groups_update_owner on community_groups;
create policy community_groups_update_owner
  on community_groups
  for update
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

create index if not exists community_groups_type_idx on community_groups (type);
create index if not exists community_groups_name_idx on community_groups (name);

create table if not exists community_messages (
  id uuid primary key default gen_random_uuid(),
  group_id text not null,
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table community_messages enable row level security;

drop policy if exists community_messages_read_all on community_messages;
create policy community_messages_read_all
  on community_messages
  for select
  using (true);

drop policy if exists community_messages_insert_authenticated on community_messages;
create policy community_messages_insert_authenticated
  on community_messages
  for insert
  with check (auth.uid() is not null and author_id = auth.uid());

create index if not exists community_messages_group_created_idx
  on community_messages (group_id, created_at);
