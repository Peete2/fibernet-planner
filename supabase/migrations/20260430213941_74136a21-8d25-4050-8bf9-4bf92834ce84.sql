
CREATE TABLE public.application_status_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  status text NOT NULL,
  changed_by uuid,
  changed_by_name text,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_ash_app ON public.application_status_history(application_id, created_at);

ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all history"
  ON public.application_status_history FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view history (for tracking)"
  ON public.application_status_history FOR SELECT
  USING (true);

CREATE POLICY "System can insert history"
  ON public.application_status_history FOR INSERT
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_application_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.application_status_history(application_id, status, changed_by)
    VALUES (NEW.id, NEW.status, NEW.user_id);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT full_name INTO actor_name FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
    INSERT INTO public.application_status_history(application_id, status, changed_by, changed_by_name)
    VALUES (NEW.id, NEW.status, auth.uid(), actor_name);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_application_status
AFTER INSERT OR UPDATE OF status ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.log_application_status();

-- Backfill: insert initial Submitted entry for existing applications that have no history
INSERT INTO public.application_status_history (application_id, status, created_at, changed_by)
SELECT a.id, 'Submitted', a.created_at, a.user_id
FROM public.applications a
WHERE NOT EXISTS (
  SELECT 1 FROM public.application_status_history h WHERE h.application_id = a.id
);

-- And current status if different from Submitted
INSERT INTO public.application_status_history (application_id, status, created_at)
SELECT a.id, a.status, a.updated_at
FROM public.applications a
WHERE a.status <> 'Submitted'
  AND NOT EXISTS (
    SELECT 1 FROM public.application_status_history h
    WHERE h.application_id = a.id AND h.status = a.status
  );
