
DROP POLICY IF EXISTS "Users can upload to their project folders" ON storage.objects;

CREATE POLICY "Users can upload to their project folders"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'originals' AND (
    split_part(storage.objects.name, '/', 1) = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = split_part(storage.objects.name, '/', 1)
      AND p.user_id = auth.uid()
    )
    OR (split_part(storage.objects.name, '/', 1) = 'models' AND split_part(storage.objects.name, '/', 2) = auth.uid()::text)
  )
);

DROP POLICY IF EXISTS "Users can delete from their project folders" ON storage.objects;

CREATE POLICY "Users can delete from their project folders"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'originals' AND (
    split_part(storage.objects.name, '/', 1) = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = split_part(storage.objects.name, '/', 1)
      AND p.user_id = auth.uid()
    )
    OR (split_part(storage.objects.name, '/', 1) = 'models' AND split_part(storage.objects.name, '/', 2) = auth.uid()::text)
  )
);
