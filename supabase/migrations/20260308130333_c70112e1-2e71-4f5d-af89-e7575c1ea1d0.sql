
-- Allow non-authenticated users to submit applications (user_id = null)
CREATE POLICY "Anyone can submit applications" ON public.applications
  FOR INSERT WITH CHECK (true);
