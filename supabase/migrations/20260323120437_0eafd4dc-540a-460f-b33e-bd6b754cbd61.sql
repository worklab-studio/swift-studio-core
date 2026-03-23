ALTER TABLE public.custom_models 
ADD COLUMN IF NOT EXISTS identity_profile jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS support_reference_images text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS body_visibility text DEFAULT NULL;