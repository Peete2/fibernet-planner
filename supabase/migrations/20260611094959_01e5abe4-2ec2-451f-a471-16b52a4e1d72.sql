-- 1. application_status_history
DROP POLICY IF EXISTS "Anyone can view history (for tracking)" ON public.application_status_history;
DROP POLICY IF EXISTS "System can insert history" ON public.application_status_history;

CREATE POLICY "Users can view own application history"
ON public.application_status_history FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_status_history.application_id AND a.user_id = auth.uid()));

CREATE POLICY "Staff can view application history"
ON public.application_status_history FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'main_admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
  OR public.has_role(auth.uid(), 'service_delivery'::app_role)
  OR public.has_role(auth.uid(), 'technical'::app_role)
  OR public.has_role(auth.uid(), 'billing'::app_role)
);

-- 2. applications
DROP POLICY IF EXISTS "Anyone can search by ref_code" ON public.applications;
DROP POLICY IF EXISTS "Anyone can submit applications" ON public.applications;

CREATE POLICY "Anonymous can submit new applications"
ON public.applications FOR INSERT TO anon
WITH CHECK (user_id IS NULL AND stage = 'moderation' AND status = 'Submitted');

CREATE POLICY "Authenticated can submit own applications"
ON public.applications FOR INSERT TO authenticated
WITH CHECK ((user_id = auth.uid() OR user_id IS NULL) AND stage = 'moderation' AND status = 'Submitted');

-- 3. Secure tracking RPCs
CREATE OR REPLACE FUNCTION public.lookup_application_by_ref_code(_code text)
RETURNS TABLE (
  id uuid, ref_code text, customer_name text, service text, location text,
  district text, status text, technician text, scheduled_date date,
  created_at timestamptz, stage text, rejection_reason text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.ref_code, a.customer_name, a.service, a.location,
         a.district, a.status, a.technician, a.scheduled_date,
         a.created_at, a.stage, a.rejection_reason
  FROM public.applications a
  WHERE a.ref_code = upper(trim(_code))
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.lookup_application_by_ref_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_application_by_ref_code(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.lookup_application_history_by_ref_code(_code text)
RETURNS TABLE (status text, created_at timestamptz, changed_by_name text, note text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT h.status, h.created_at, h.changed_by_name, h.note
  FROM public.application_status_history h
  JOIN public.applications a ON a.id = h.application_id
  WHERE a.ref_code = upper(trim(_code))
  ORDER BY h.created_at ASC;
$$;
REVOKE EXECUTE ON FUNCTION public.lookup_application_history_by_ref_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_application_history_by_ref_code(text) TO anon, authenticated;

-- 4. customer_connections
DROP POLICY IF EXISTS "Anyone can view customer connections" ON public.customer_connections;

CREATE POLICY "Users and staff can view customer connections"
ON public.customer_connections FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'main_admin'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'technical'::app_role)
);

-- 5. notifications
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- 6. system_logs
DROP POLICY IF EXISTS "System can insert logs" ON public.system_logs;
CREATE POLICY "Admins can insert system logs"
ON public.system_logs FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'main_admin'::app_role));

-- 7. storage objects (fwa-documents)
DROP POLICY IF EXISTS "Users can upload fwa documents" ON storage.objects;

CREATE POLICY "Users can upload own fwa documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'fwa-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own fwa documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'fwa-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'fwa-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own fwa documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'fwa-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can manage fwa documents"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'fwa-documents' AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'main_admin'::app_role)))
WITH CHECK (bucket_id = 'fwa-documents' AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'main_admin'::app_role)));

-- 8. Function search_path hardening
ALTER FUNCTION public.parse_plan_price(text) SET search_path = public;
ALTER FUNCTION public.role_for_stage(text) SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;