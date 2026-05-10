
-- Promote existing admins to main_admin
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'main_admin'::app_role FROM public.user_roles WHERE role = 'admin'
ON CONFLICT DO NOTHING;

-- Add stage columns to applications
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'moderation',
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS assigned_sim text,
  ADD COLUMN IF NOT EXISTS assigned_port text,
  ADD COLUMN IF NOT EXISTS assigned_equipment jsonb,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS payment_amount numeric,
  ADD COLUMN IF NOT EXISTS payment_receipt_url text,
  ADD COLUMN IF NOT EXISTS advisory_note text;

-- Backfill: any non-completed/rejected app starts in moderation
UPDATE public.applications SET stage = 'moderation' WHERE stage IS NULL;

CREATE INDEX IF NOT EXISTS idx_applications_stage ON public.applications(stage);

-- Stage actions log
CREATE TABLE IF NOT EXISTS public.application_stage_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_name text,
  actor_role text,
  from_stage text NOT NULL,
  to_stage text NOT NULL,
  action text NOT NULL CHECK (action IN ('approve','reject','note','complete')),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.application_stage_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view actions on apps they have access to"
  ON public.application_stage_actions FOR SELECT
  USING (
    public.has_role(auth.uid(),'main_admin')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'moderator')
    OR public.has_role(auth.uid(),'service_delivery')
    OR public.has_role(auth.uid(),'technical')
    OR public.has_role(auth.uid(),'billing')
    OR EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id AND a.user_id = auth.uid())
  );

-- Helper: role that owns a stage
CREATE OR REPLACE FUNCTION public.role_for_stage(_stage text)
RETURNS app_role LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _stage
    WHEN 'moderation' THEN 'moderator'::app_role
    WHEN 'service_delivery' THEN 'service_delivery'::app_role
    WHEN 'technical' THEN 'technical'::app_role
    WHEN 'billing' THEN 'billing'::app_role
  END
$$;

-- Core RPC: advance / reject an application
CREATE OR REPLACE FUNCTION public.advance_application_stage(
  _app_id uuid,
  _action text,
  _comment text DEFAULT NULL,
  _patch jsonb DEFAULT '{}'::jsonb
)
RETURNS public.applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app public.applications;
  current_stage text;
  next_stage text;
  prev_stage text;
  actor_role text;
  actor_name text;
  is_main boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO app FROM public.applications WHERE id = _app_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;

  current_stage := app.stage;
  is_main := public.has_role(auth.uid(),'main_admin') OR public.has_role(auth.uid(),'admin');

  -- Permission: main admin can act on any stage; otherwise must hold the role for current stage
  IF NOT is_main AND NOT public.has_role(auth.uid(), public.role_for_stage(current_stage)) THEN
    RAISE EXCEPTION 'You do not have permission to act on this application at stage %', current_stage;
  END IF;

  -- Determine next / prev stage
  next_stage := CASE current_stage
    WHEN 'moderation' THEN 'service_delivery'
    WHEN 'service_delivery' THEN 'technical'
    WHEN 'technical' THEN 'billing'
    WHEN 'billing' THEN 'completed'
  END;
  prev_stage := CASE current_stage
    WHEN 'service_delivery' THEN 'moderation'
    WHEN 'technical' THEN 'service_delivery'
    WHEN 'billing' THEN 'technical'
  END;

  SELECT full_name, (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1)
    INTO actor_name, actor_role FROM public.profiles WHERE user_id = auth.uid();

  IF _action = 'approve' THEN
    IF next_stage IS NULL THEN RAISE EXCEPTION 'Cannot advance from stage %', current_stage; END IF;
    UPDATE public.applications
      SET stage = next_stage,
          status = CASE WHEN next_stage = 'completed' THEN 'Completed' ELSE initcap(replace(next_stage,'_',' ')) END,
          rejection_reason = NULL,
          advisory_note = COALESCE(_patch->>'advisory_note', advisory_note),
          assigned_sim = COALESCE(_patch->>'assigned_sim', assigned_sim),
          assigned_port = COALESCE(_patch->>'assigned_port', assigned_port),
          assigned_equipment = COALESCE(_patch->'assigned_equipment', assigned_equipment),
          technician = COALESCE(_patch->>'technician', technician),
          scheduled_date = COALESCE((_patch->>'scheduled_date')::date, scheduled_date),
          payment_method = COALESCE(_patch->>'payment_method', payment_method),
          payment_reference = COALESCE(_patch->>'payment_reference', payment_reference),
          payment_amount = COALESCE((_patch->>'payment_amount')::numeric, payment_amount),
          payment_receipt_url = COALESCE(_patch->>'payment_receipt_url', payment_receipt_url),
          updated_at = now()
      WHERE id = _app_id RETURNING * INTO app;

    INSERT INTO public.application_stage_actions(application_id, actor_id, actor_name, actor_role, from_stage, to_stage, action, comment)
      VALUES (_app_id, auth.uid(), actor_name, actor_role, current_stage, next_stage,
              CASE WHEN next_stage='completed' THEN 'complete' ELSE 'approve' END, _comment);

  ELSIF _action = 'reject' THEN
    IF prev_stage IS NULL THEN RAISE EXCEPTION 'Cannot send back from stage %', current_stage; END IF;
    IF _comment IS NULL OR length(trim(_comment)) = 0 THEN
      RAISE EXCEPTION 'A comment is required when sending an application back';
    END IF;
    UPDATE public.applications
      SET stage = prev_stage,
          status = initcap(replace(prev_stage,'_',' ')),
          rejection_reason = _comment,
          updated_at = now()
      WHERE id = _app_id RETURNING * INTO app;

    INSERT INTO public.application_stage_actions(application_id, actor_id, actor_name, actor_role, from_stage, to_stage, action, comment)
      VALUES (_app_id, auth.uid(), actor_name, actor_role, current_stage, prev_stage, 'reject', _comment);

  ELSE
    RAISE EXCEPTION 'Unknown action: %', _action;
  END IF;

  RETURN app;
END;
$$;

REVOKE ALL ON FUNCTION public.advance_application_stage(uuid, text, text, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.advance_application_stage(uuid, text, text, jsonb) TO authenticated;

-- Update RLS on applications: each role sees their stage; main_admin sees all (existing admin policies remain)
DROP POLICY IF EXISTS "Stage staff can view their stage" ON public.applications;
CREATE POLICY "Stage staff can view their stage"
  ON public.applications FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'main_admin')
    OR (stage = 'moderation' AND public.has_role(auth.uid(),'moderator'))
    OR (stage = 'service_delivery' AND public.has_role(auth.uid(),'service_delivery'))
    OR (stage = 'technical' AND public.has_role(auth.uid(),'technical'))
    OR (stage = 'billing' AND public.has_role(auth.uid(),'billing'))
  );

DROP POLICY IF EXISTS "Moderators can create applications" ON public.applications;
CREATE POLICY "Moderators can create applications"
  ON public.applications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'moderator') OR public.has_role(auth.uid(),'main_admin'));
