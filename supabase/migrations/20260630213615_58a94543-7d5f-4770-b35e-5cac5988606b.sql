
-- 1) Concurrency-safe ref_code via sequence + base36 suffix
CREATE SEQUENCE IF NOT EXISTS public.application_ref_seq;
GRANT USAGE, SELECT ON SEQUENCE public.application_ref_seq TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.generate_application_ref()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  n bigint;
  s text := '';
  alphabet text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
BEGIN
  n := nextval('public.application_ref_seq');
  IF n = 0 THEN s := '0'; END IF;
  WHILE n > 0 LOOP
    s := substr(alphabet, ((n % 36)::int) + 1, 1) || s;
    n := n / 36;
  END LOOP;
  RETURN 'ETL-' || to_char(now(),'YY') || '-' || lpad(s, 5, '0');
END;
$$;

ALTER TABLE public.applications
  ALTER COLUMN ref_code SET DEFAULT public.generate_application_ref();

-- 2) Race-proof auto-attach on completion (lock node row, recheck capacity)
CREATE OR REPLACE FUNCTION public.attach_customer_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate_id uuid;
  locked_capacity int;
  locked_connected int;
  locked_status text;
  inserted_rows integer := 0;
BEGIN
  IF NEW.stage <> 'completed' OR (OLD.stage IS NOT NULL AND OLD.stage = 'completed') THEN
    RETURN NEW;
  END IF;
  IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
    RETURN NEW;
  END IF;

  -- Pick nearest candidate (no lock yet)
  SELECT id INTO candidate_id FROM (
    SELECT n.id,
      6371 * 2 * asin(sqrt(
        sin(radians((n.latitude - NEW.latitude)/2))^2 +
        cos(radians(NEW.latitude)) * cos(radians(n.latitude)) *
        sin(radians((n.longitude - NEW.longitude)/2))^2
      )) AS dist,
      n.radius_km, n.status, n.connected_customers, n.capacity
    FROM public.fiber_nodes n
    WHERE n.status = 'Active'
  ) sub
  WHERE sub.dist <= sub.radius_km AND sub.connected_customers < sub.capacity
  ORDER BY sub.dist ASC
  LIMIT 1;

  IF candidate_id IS NULL THEN RETURN NEW; END IF;

  -- Lock the node row and re-verify capacity under the lock
  SELECT capacity, connected_customers, status
    INTO locked_capacity, locked_connected, locked_status
  FROM public.fiber_nodes WHERE id = candidate_id FOR UPDATE;

  IF locked_status <> 'Active' OR locked_connected >= locked_capacity THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.customer_connections (
    fiber_node_id, application_id, user_id, customer_name, latitude, longitude, source
  ) VALUES (
    candidate_id, NEW.id, NEW.user_id, NEW.customer_name, NEW.latitude, NEW.longitude, 'auto'
  )
  ON CONFLICT (application_id) DO NOTHING;

  GET DIAGNOSTICS inserted_rows = ROW_COUNT;

  IF inserted_rows > 0 THEN
    UPDATE public.fiber_nodes
      SET connected_customers = connected_customers + 1, updated_at = now()
      WHERE id = candidate_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Hot-path indexes for dashboards and reporting
CREATE INDEX IF NOT EXISTS idx_applications_status_created ON public.applications (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_stage_created ON public.applications (stage, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_user_created ON public.applications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_created ON public.applications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stage_actions_app ON public.application_stage_actions (application_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_plans_cat_active ON public.service_plans (category_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_fiber_nodes_active ON public.fiber_nodes (status) WHERE status = 'Active';
