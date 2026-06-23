alter table community_messages
  add column if not exists message_type text not null default 'text'
    check (message_type in ('text', 'image', 'voice')),
  add column if not exists media_url text,
  add column if not exists file_name text,
  add column if not exists mime_type text,
  add column if not exists duration_seconds integer;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-media',
  'community-media',
  true,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'audio/webm',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/ogg'
  ]::text[]
)
on conflict (id) do update
set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists community_media_read_all on storage.objects;
create policy community_media_read_all
  on storage.objects
  for select
  using (bucket_id = 'community-media');

drop policy if exists community_media_insert_authenticated on storage.objects;
create policy community_media_insert_authenticated
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'community-media');
