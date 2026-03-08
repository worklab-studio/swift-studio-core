ALTER TABLE public.projects ADD COLUMN description text;
ALTER TABLE public.projects ADD COLUMN default_output text NOT NULL DEFAULT 'photos';