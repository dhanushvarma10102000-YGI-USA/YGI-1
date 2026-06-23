create extension if not exists pgcrypto;

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

select pg_notify('pgrst', 'reload schema');
