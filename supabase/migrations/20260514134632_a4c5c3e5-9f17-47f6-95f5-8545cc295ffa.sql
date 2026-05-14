DROP INDEX IF EXISTS public.uq_customer_connections_app;
CREATE UNIQUE INDEX IF NOT EXISTS customer_connections_application_id_key
  ON public.customer_connections (application_id);

CREATE OR REPLACE FUNCTION public.attach_customer_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nearest_id uuid;
  nearest_dist double precision;
  inserted_rows integer := 0;
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
      n.radius_km,
      n.status,
      n.connected_customers,
      n.capacity
    FROM public.fiber_nodes n
    WHERE n.status = 'Active'
  ) sub
  WHERE sub.dist <= sub.radius_km AND sub.connected_customers < sub.capacity
  ORDER BY sub.dist ASC
  LIMIT 1;

  IF nearest_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.customer_connections (
    fiber_node_id,
    application_id,
    user_id,
    customer_name,
    latitude,
    longitude,
    source
  )
  VALUES (
    nearest_id,
    NEW.id,
    NEW.user_id,
    NEW.customer_name,
    NEW.latitude,
    NEW.longitude,
    'auto'
  )
  ON CONFLICT (application_id) DO NOTHING;

  GET DIAGNOSTICS inserted_rows = ROW_COUNT;

  IF inserted_rows > 0 THEN
    UPDATE public.fiber_nodes
    SET connected_customers = connected_customers + 1,
        updated_at = now()
    WHERE id = nearest_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_application_service_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_service text := lower(coalesce(NEW.service, ''));
  nearest_id uuid;
BEGIN
  IF requested_service LIKE '%fibre%' OR requested_service LIKE '%fiber%' OR requested_service LIKE '%gpon%' THEN
    IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
      RAISE EXCEPTION 'Fiber applications require GPS coordinates so coverage can be checked';
    END IF;

    SELECT id INTO nearest_id
    FROM (
      SELECT n.id,
        6371 * 2 * asin(sqrt(
          sin(radians((n.latitude - NEW.latitude)/2))^2 +
          cos(radians(NEW.latitude)) * cos(radians(n.latitude)) *
          sin(radians((n.longitude - NEW.longitude)/2))^2
        )) AS dist,
        n.radius_km,
        n.status,
        n.connected_customers,
        n.capacity
      FROM public.fiber_nodes n
      WHERE n.status = 'Active'
    ) sub
    WHERE sub.dist <= sub.radius_km AND sub.connected_customers < sub.capacity
    ORDER BY sub.dist ASC
    LIMIT 1;

    IF nearest_id IS NULL THEN
      RAISE EXCEPTION 'Fiber is not available at this location. Please choose another service.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_application_service_eligibility ON public.applications;
CREATE TRIGGER trg_validate_application_service_eligibility
BEFORE INSERT OR UPDATE OF service, latitude, longitude ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.validate_application_service_eligibility();