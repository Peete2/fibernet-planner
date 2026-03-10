ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS national_id text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS building_type text DEFAULT 'residential',
  ADD COLUMN IF NOT EXISTS floors integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS nearest_landmark text,
  ADD COLUMN IF NOT EXISTS preferred_date text,
  ADD COLUMN IF NOT EXISTS notes text;