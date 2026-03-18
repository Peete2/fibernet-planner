
ALTER TABLE public.fiber_nodes ADD COLUMN IF NOT EXISTS radius_km double precision NOT NULL DEFAULT 4;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS title text;
