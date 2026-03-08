
CREATE TABLE public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  level text NOT NULL DEFAULT 'info',
  source text NOT NULL DEFAULT 'system',
  message text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false
);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view system logs"
  ON public.system_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update system logs"
  ON public.system_logs FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete system logs"
  ON public.system_logs FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert logs"
  ON public.system_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert some sample logs for demonstration
INSERT INTO public.system_logs (level, source, message, details) VALUES
  ('error', 'auth', 'Failed login attempt - invalid credentials', '{"ip": "192.168.1.45", "email": "unknown@test.com"}'),
  ('warning', 'database', 'Slow query detected on applications table', '{"duration_ms": 2340, "query": "SELECT * FROM applications"}'),
  ('error', 'edge_function', 'admin-signup function timeout after 30s', '{"function": "admin-signup", "status": 504}'),
  ('info', 'system', 'Scheduled backup completed successfully', '{"size_mb": 42}'),
  ('critical', 'database', 'Connection pool exhausted - max connections reached', '{"active": 100, "max": 100}'),
  ('warning', 'storage', 'Storage bucket approaching capacity limit', '{"used_pct": 87}'),
  ('info', 'auth', 'New admin user registered', '{"user_id": "abc-123"}'),
  ('error', 'api', 'Rate limit exceeded for endpoint /api/applications', '{"requests_per_min": 150, "limit": 100}');

ALTER PUBLICATION supabase_realtime ADD TABLE public.system_logs;
