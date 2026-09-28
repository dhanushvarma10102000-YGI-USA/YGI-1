-- Security hardening found in the September 2026 review. Safe to run more than once.

-- ---------------------------------------------------------------------------
-- 1. Stories: users may only write their own content columns.
--    Before this, the update-own policy let authors set upvotes/comments directly.
-- ---------------------------------------------------------------------------
alter table public.stories add column if not exists display_name text;

revoke insert, update on public.stories from anon, authenticated;
grant insert (user_id, title, excerpt, body_html, category, city, uni, anon, read_time, display_name)
  on public.stories to authenticated;
grant update (title, excerpt, body_html, category, city, uni, anon, read_time, display_name)
  on public.stories to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Hide author account ids so anonymous stories/comments/votes can't be traced.
--    Row policies still use user_id internally; clients just can't read it.
-- ---------------------------------------------------------------------------
revoke select on public.stories from anon, authenticated;
grant select (id, title, excerpt, body_html, category, city, uni, anon, display_name, upvotes, comments, read_time, created_at)
  on public.stories to anon, authenticated;

-- The owner's "My Stories" list, which needs to filter by user_id.
create or replace function public.my_stories()
returns setof public.stories
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select *
  from public.stories
  where user_id = auth.uid()
  order by created_at desc;
$$;

revoke all on function public.my_stories() from public;
grant execute on function public.my_stories() to authenticated;

revoke select, insert on public.reddit_post_comments from anon, authenticated;
grant select (id, post_id, body, anon, display_name, created_at)
  on public.reddit_post_comments to anon, authenticated;
grant insert (post_id, user_id, body, anon, display_name)
  on public.reddit_post_comments to authenticated;

drop policy if exists votes_public_read on public.story_votes;
drop policy if exists votes_read_own on public.story_votes;
create policy votes_read_own on public.story_votes
  for select to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. Community author names come from the signed-in account, not the client.
--    Before this, anyone could post in General (or a group) as "Admin".
--    Service-role writes (the admin API) and global moderators keep their chosen name.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_community_author_name()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null or public.is_global_community_moderator(auth.uid()) then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.author_name := old.author_name;
  else
    new.author_name := public.current_community_display_name();
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_community_author_name() from public;

drop trigger if exists community_messages_enforce_author_name on public.community_messages;
create trigger community_messages_enforce_author_name
  before insert or update on public.community_messages
  for each row
  execute function public.enforce_community_author_name();

drop trigger if exists community_channel_messages_enforce_author_name on public.community_channel_messages;
create trigger community_channel_messages_enforce_author_name
  before insert or update on public.community_channel_messages
  for each row
  execute function public.enforce_community_author_name();

-- ---------------------------------------------------------------------------
-- 4. Failed admin two-step attempts, for rate limiting (/api/admin/2fa).
--    Only the service role touches this table.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_2fa_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  attempted_at timestamptz not null default now()
);

create index if not exists admin_2fa_attempts_user_time_idx
  on public.admin_2fa_attempts (user_id, attempted_at desc);

alter table public.admin_2fa_attempts enable row level security;
revoke all on public.admin_2fa_attempts from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. articles.read_time is text ("7 min read"): the blog prints it as-is and the
--    cron writes that format. Convert databases created from the old integer schema,
--    and fix rows saved as a bare number.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'articles'
      and column_name = 'read_time' and data_type = 'integer'
  ) then
    alter table public.articles drop constraint if exists articles_read_time_check;
    alter table public.articles alter column read_time drop default;
    alter table public.articles alter column read_time type text using read_time::text;
  end if;
end;
$$;

alter table public.articles alter column read_time set default '1 min read';

update public.articles
set read_time = read_time || ' min read'
where read_time ~ '^\d+$';

select pg_notify('pgrst', 'reload schema');
