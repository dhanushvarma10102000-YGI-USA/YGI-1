alter table public.community_messages
  add column if not exists media_path text;

select pg_notify('pgrst', 'reload schema');
