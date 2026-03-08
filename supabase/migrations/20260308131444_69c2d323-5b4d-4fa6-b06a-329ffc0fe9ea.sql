
CREATE TABLE public.model_portraits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_key text NOT NULL UNIQUE,
  image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.model_portraits ENABLE ROW LEVEL SECURITY;

-- Public read access (shared AI models, not user-specific)
CREATE POLICY "Anyone can read model portraits"
  ON public.model_portraits
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only authenticated users can insert
CREATE POLICY "Authenticated users can insert model portraits"
  ON public.model_portraits
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only authenticated users can update (for upsert)
CREATE POLICY "Authenticated users can update model portraits"
  ON public.model_portraits
  FOR UPDATE
  TO authenticated
  USING (true);
