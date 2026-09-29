-- Articles: soft delete + a saved topic queue for the admin dashboard. Safe to run more than once.

-- ---------------------------------------------------------------------------
-- 1. Soft delete. "Delete" in the admin hides an article (deleted_at is set) so
--    "Restore" can bring it back; "Delete forever" removes the row.
--    The public read policy hides deleted rows, so the blog, sitemap, and
--    llms.txt drop them without any code change.
-- ---------------------------------------------------------------------------
alter table public.articles add column if not exists deleted_at timestamptz;

create index if not exists articles_deleted_at_idx on public.articles (deleted_at);

drop policy if exists articles_read_public on public.articles;
create policy articles_read_public
  on public.articles
  for select
  to anon, authenticated
  using (deleted_at is null);

-- ---------------------------------------------------------------------------
-- 2. Topic queue (was a hard-coded list that reset on every page load).
--    Only the admin API (service role) reads or writes it.
-- ---------------------------------------------------------------------------
create table if not exists public.article_queue (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'Daily Life',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists article_queue_position_idx on public.article_queue (position);

alter table public.article_queue enable row level security;
revoke all on public.article_queue from anon, authenticated;

-- Seed with the topics that used to be hard-coded, skipping any already published.
insert into public.article_queue (title, category, position)
select seed.title, seed.category, seed.position
from (values
  ('2026-27 University Health Insurance Waiver Checklist: What to Verify Before You Decline a School Plan', 'Insurance', 1),
  ('F-1 Summer Internship Timeline: CPT, Pre-OPT, Offer Letter, and DSO Steps to Verify', 'Visa & OPT', 2),
  ('Apartment Scam Checklist for Newcomers Signing a Lease Before Reaching the USA', 'Housing', 3),
  ('First 72 Hours After Landing in the USA: SIM, Bank, Groceries, Transit, and Campus Tasks', 'Daily Life', 4),
  ('Best eSIM and Phone Plan Setup for People Arriving in the USA This Semester', 'Daily Life', 5),
  ('Opening a US Bank Account Without SSN History: Documents to Confirm Before Visiting a Branch', 'Banking', 6),
  ('CPT vs On-Campus Work vs Volunteering: Common Mistakes to Check Before Starting', 'Visa & OPT', 7),
  ('Move-In Week Grocery and Essentials List for a First Apartment Near Campus', 'Daily Life', 9),
  ('Credit Score From Zero: Secured Card, Authorized User, Rent Reporting, and What to Avoid', 'Banking', 10),
  ('City Safety Checklist Before Choosing Off-Campus Housing Near a University', 'Housing', 11),
  ('OPT Application Prep: Photos, I-765 Details, Timing, and Official Pages to Recheck', 'Visa & OPT', 12),
  ('How to Ask Useful Questions in YourGuideInUSA Community Groups Before You Move', 'General', 13),
  ('Public Transit, Rideshare, and Bike Costs to Compare Before Picking a Neighborhood', 'City Guides', 14),
  ('Resume and Job Search Basics for Newcomers: What to Customize Before Applying', 'Jobs', 15)
) as seed(title, category, position)
where not exists (select 1 from public.article_queue)
  and not exists (
    select 1 from public.articles a
    where a.slug = trim(both '-' from regexp_replace(lower(seed.title), '[^a-z0-9]+', '-', 'g'))
  );

select pg_notify('pgrst', 'reload schema');
