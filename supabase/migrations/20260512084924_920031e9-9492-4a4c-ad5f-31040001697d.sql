-- Fix: status check constraint blocked stage advancement (e.g. 'Service Delivery')
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;

-- Allow any stage-derived status; we still validate via the advance_application_stage RPC
ALTER TABLE public.applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IS NOT NULL AND length(status) > 0);

-- Allow staff to insert their own stage actions (for audit) — RPC is SECURITY DEFINER
-- but adding an explicit policy keeps things consistent if called directly.
DROP POLICY IF EXISTS "Staff can insert their stage actions" ON public.application_stage_actions;
CREATE POLICY "Staff can insert their stage actions"
ON public.application_stage_actions
FOR INSERT TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND (
    public.has_role(auth.uid(),'main_admin')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'moderator')
    OR public.has_role(auth.uid(),'service_delivery')
    OR public.has_role(auth.uid(),'technical')
    OR public.has_role(auth.uid(),'billing')
  )
);