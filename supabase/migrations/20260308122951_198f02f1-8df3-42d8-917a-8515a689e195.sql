
INSERT INTO storage.buckets (id, name, public) VALUES ('model-portraits', 'model-portraits', true);

CREATE POLICY "Anyone can read model portraits" ON storage.objects FOR SELECT USING (bucket_id = 'model-portraits');
CREATE POLICY "Authenticated users can upload model portraits" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'model-portraits');
