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

drop policy if exists community_messages_insert_members on public.community_messages;
create policy community_messages_insert_members
  on public.community_messages
  for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and message_type in ('text', 'image')
    and exists (
      select 1
      from public.community_memberships memberships
      where memberships.group_id = community_messages.group_id
        and memberships.user_id = auth.uid()
    )
  );

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]::text[]
where id = 'community-media';

select pg_notify('pgrst', 'reload schema');
