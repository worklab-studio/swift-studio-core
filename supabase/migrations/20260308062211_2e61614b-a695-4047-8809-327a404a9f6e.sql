
-- Add shot_type column to projects
ALTER TABLE public.projects ADD COLUMN shot_type text NOT NULL DEFAULT 'product_showcase';

-- Create originals storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('originals', 'originals', true);

-- Storage RLS: authenticated users can upload to their own folder
CREATE POLICY "Users can upload originals"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'originals' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage RLS: users can view their own files
CREATE POLICY "Users can view own originals"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'originals' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage RLS: users can delete their own files
CREATE POLICY "Users can delete own originals"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'originals' AND (storage.foldername(name))[1] = auth.uid()::text);
