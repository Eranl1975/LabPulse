-- 029_visual_media_storage
-- Private Storage bucket for Visual Troubleshooting originals (photos and the
-- optional short video), kept only when the user ticks "keep a private copy".
--
-- * Private bucket: no public URLs. Objects are read with the user's own session
--   or a short-lived signed URL.
-- * One folder per user: object names are `<auth.uid()>/<uuid>.<ext>`.
-- * RLS on storage.objects limits every operation to the folder owner.
-- * Uploads arrive through signed upload URLs issued by
--   /api/troubleshooting/visual/upload-url (service role), so media never passes
--   through a Vercel function.
-- * Images are re-encoded in the browser before upload, which strips EXIF/GPS.
--
-- Numbered 029: 026/027 are reserved by the security branch, 028 is the column catalogue.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'visual-media',
  'visual-media',
  false,
  52428800, -- 50 MB: the video limit
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "visual_media_owner_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'visual-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "visual_media_owner_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'visual-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "visual_media_owner_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'visual-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'visual-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "visual_media_owner_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'visual-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
