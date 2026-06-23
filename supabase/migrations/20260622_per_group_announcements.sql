-- Per-group announcements + media support + general open to all authenticated users
ALTER TABLE public.community_channel_messages
  ADD COLUMN IF NOT EXISTS group_id text REFERENCES public.community_groups(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_path text;

-- Fast lookup index
DROP INDEX IF EXISTS community_channel_messages_channel_created_idx;
DROP INDEX IF EXISTS community_channel_messages_lookup_idx;
CREATE INDEX IF NOT EXISTS community_channel_messages_lookup_idx
  ON public.community_channel_messages (channel, group_id, created_at DESC);

-- All authenticated users can post to general channel
-- group_id must be NULL (prevents spoofing an announcement)
-- media_url must be NULL or from this project's Supabase storage (prevents external content injection)
DROP POLICY IF EXISTS community_channel_messages_insert_general ON public.community_channel_messages;
CREATE POLICY community_channel_messages_insert_general
  ON public.community_channel_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    channel = 'general'
    AND group_id IS NULL
    AND (
      media_url IS NULL
      OR media_url LIKE 'https://zujoryawjzsxixuwyhyp.supabase.co/%'
    )
  );

-- Group admins can post announcements for their own group only
DROP POLICY IF EXISTS community_channel_messages_insert_group_admin ON public.community_channel_messages;
CREATE POLICY community_channel_messages_insert_group_admin
  ON public.community_channel_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    channel = 'announcements'
    AND group_id IS NOT NULL
    AND public.is_community_group_admin(group_id, auth.uid())
    AND (media_url IS NULL OR media_url LIKE 'https://zujoryawjzsxixuwyhyp.supabase.co/%')
  );

-- Moderators can UPDATE (edit) any channel message
DROP POLICY IF EXISTS community_channel_messages_update_moderators ON public.community_channel_messages;
CREATE POLICY community_channel_messages_update_moderators
  ON public.community_channel_messages
  FOR UPDATE
  TO authenticated
  USING (public.is_global_community_moderator(auth.uid()))
  WITH CHECK (public.is_global_community_moderator(auth.uid()));

-- Storage policies for channel image uploads
-- Run this block ONCE (idempotent: DROP IF EXISTS before CREATE)
DROP POLICY IF EXISTS "Authenticated users can upload channel media" ON storage.objects;
CREATE POLICY "Authenticated users can upload channel media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'community-media' AND name LIKE 'channels/%');

DROP POLICY IF EXISTS "Channel media is publicly readable" ON storage.objects;
CREATE POLICY "Channel media is publicly readable"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'community-media' AND name LIKE 'channels/%');

SELECT pg_notify('pgrst', 'reload schema');
