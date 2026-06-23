drop policy if exists community_messages_delete_own on community_messages;
create policy community_messages_delete_own
  on community_messages
  for delete
  using (auth.uid() = author_id);
