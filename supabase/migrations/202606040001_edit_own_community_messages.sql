drop policy if exists community_messages_update_own_recent on community_messages;
create policy community_messages_update_own_recent
  on community_messages
  for update
  using (
    auth.uid() = author_id
    and message_type = 'text'
    and created_at >= now() - interval '3 minutes'
  )
  with check (
    auth.uid() = author_id
    and message_type = 'text'
    and created_at >= now() - interval '3 minutes'
  );
