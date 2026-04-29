-- 1. Per-plan visibility
ALTER TABLE public.service_plans
  ADD COLUMN IF NOT EXISTS visible_to text[] NOT NULL DEFAULT ARRAY['individual','business','school']::text[];

-- Match existing behaviour: Limited Wi-Fi (fwa) was hidden for business
UPDATE public.service_plans
SET visible_to = ARRAY['individual','school']::text[]
WHERE category_id = 'fwa';

-- 2. Admin audit log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_name text,
  action text NOT NULL,           -- e.g. 'create','update','delete','status_change'
  target_type text NOT NULL,      -- e.g. 'service_plan','application','fiber_node'
  target_id text,
  target_label text,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.admin_audit_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit entries"
  ON public.admin_audit_log FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_target_idx ON public.admin_audit_log (target_type, target_id);