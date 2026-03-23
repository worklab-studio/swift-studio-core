
CREATE TABLE public.custom_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  gender text NOT NULL DEFAULT 'female',
  ethnicity text NOT NULL DEFAULT '',
  body_type text NOT NULL DEFAULT 'average',
  skin_tone text DEFAULT '',
  age_range text DEFAULT '',
  facial_features text DEFAULT '',
  portrait_url text,
  reference_images text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom models"
  ON public.custom_models FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own custom models"
  ON public.custom_models FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own custom models"
  ON public.custom_models FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own custom models"
  ON public.custom_models FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
