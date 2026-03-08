-- Drop old policies
DROP POLICY IF EXISTS "Users can upload originals" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own originals" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own originals" ON storage.objects;

-- Allow upload if the folder name matches a project owned by the user
CREATE POLICY "Users can upload to their project folders"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'originals' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
    )
  )
);

-- Public read (bucket is already public)
CREATE POLICY "Public read originals"
ON storage.objects FOR SELECT
USING (bucket_id = 'originals');

-- Allow delete if user owns the project folder
CREATE POLICY "Users can delete from their project folders"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'originals' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
    )
  )
);