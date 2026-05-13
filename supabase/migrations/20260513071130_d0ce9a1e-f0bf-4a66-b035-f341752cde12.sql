
-- 1. customer_connections table
CREATE TABLE IF NOT EXISTS public.customer_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiber_node_id uuid NOT NULL REFERENCES public.fiber_nodes(id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  user_id uuid,
  customer_name text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  source text NOT NULL DEFAULT 'auto',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_connections_node ON public.customer_connections(fiber_node_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_connections_app ON public.customer_connections(application_id) WHERE application_id IS NOT NULL;

ALTER TABLE public.customer_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view customer connections"
  ON public.customer_connections FOR SELECT USING (true);

CREATE POLICY "Main admin can insert customer connections"
  ON public.customer_connections FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'main_admin') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Main admin can delete customer connections"
  ON public.customer_connections FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'main_admin') OR public.has_role(auth.uid(),'admin'));

-- 2. Auto-attach trigger
CREATE OR REPLACE FUNCTION public.attach_customer_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nearest_id uuid;
  nearest_dist double precision;
BEGIN
  IF NEW.stage <> 'completed' OR (OLD.stage IS NOT NULL AND OLD.stage = 'completed') THEN
    RETURN NEW;
  END IF;
  IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, dist INTO nearest_id, nearest_dist FROM (
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

  IF nearest_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.customer_connections (fiber_node_id, application_id, user_id, customer_name, latitude, longitude, source)
  VALUES (nearest_id, NEW.id, NEW.user_id, NEW.customer_name, NEW.latitude, NEW.longitude, 'auto')
  ON CONFLICT (application_id) DO NOTHING;

  UPDATE public.fiber_nodes SET connected_customers = connected_customers + 1, updated_at = now()
  WHERE id = nearest_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attach_customer_on_completion ON public.applications;
CREATE TRIGGER trg_attach_customer_on_completion
  AFTER UPDATE OF stage ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.attach_customer_on_completion();

-- 3. Sync fiber_nodes.connected_customers when manual connection inserted/deleted
CREATE OR REPLACE FUNCTION public.sync_node_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.fiber_nodes SET connected_customers = connected_customers + 1, updated_at = now() WHERE id = NEW.fiber_node_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.fiber_nodes SET connected_customers = GREATEST(0, connected_customers - 1), updated_at = now() WHERE id = OLD.fiber_node_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Note: only count manual inserts (auto path already increments above).
CREATE OR REPLACE FUNCTION public.sync_node_count_manual_only()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.source <> 'auto' THEN
    UPDATE public.fiber_nodes SET connected_customers = connected_customers + 1, updated_at = now() WHERE id = NEW.fiber_node_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cc_insert ON public.customer_connections;
CREATE TRIGGER trg_cc_insert
  AFTER INSERT ON public.customer_connections
  FOR EACH ROW EXECUTE FUNCTION public.sync_node_count_manual_only();

DROP TRIGGER IF EXISTS trg_cc_delete ON public.customer_connections;
CREATE TRIGGER trg_cc_delete
  AFTER DELETE ON public.customer_connections
  FOR EACH ROW EXECUTE FUNCTION public.sync_node_count();

-- 4. user_roles: allow main_admin to add/remove staff roles
CREATE POLICY "Main admin can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'main_admin') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Main admin can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'main_admin') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Main admin can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'main_admin') OR public.has_role(auth.uid(),'admin'));

-- 5. Allow main_admin to delete profiles directly (auth user deletion via edge function)
CREATE POLICY "Main admin can delete profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'main_admin') OR public.has_role(auth.uid(),'admin'));
