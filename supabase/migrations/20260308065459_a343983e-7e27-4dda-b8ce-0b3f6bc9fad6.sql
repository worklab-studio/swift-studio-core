
ALTER TABLE public.assets 
  ADD COLUMN shot_label text,
  ADD COLUMN preset_used text,
  ADD COLUMN prompt_used text;

CREATE POLICY "Users can update their own assets"
ON public.assets
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = assets.project_id
    AND projects.user_id = auth.uid()
));
