
-- Add scheduled_date to applications for technician scheduling
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS scheduled_date DATE;

-- Create a view for admin to easily get technicians with their profile info
-- We'll query profiles joined with user_roles instead
-- Allow admins to read technician profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
