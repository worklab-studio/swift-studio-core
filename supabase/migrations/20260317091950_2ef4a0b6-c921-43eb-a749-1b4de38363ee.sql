CREATE TABLE public.preset_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  preset_id text NOT NULL,
  image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category, preset_id)
);
ALTER TABLE public.preset_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read preset images" ON public.preset_images FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert" ON public.preset_images FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update" ON public.preset_images FOR UPDATE TO authenticated USING (true);