
-- Allow technicians to view applications assigned to them (by matching their profile full_name to technician column)
CREATE POLICY "Technicians can view assigned applications"
ON public.applications
FOR SELECT
TO authenticated
USING (
  technician = (SELECT full_name FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  AND has_role(auth.uid(), 'technician'::app_role)
);

-- Allow technicians to update status on their assigned applications
CREATE POLICY "Technicians can update assigned applications"
ON public.applications
FOR UPDATE
TO authenticated
USING (
  technician = (SELECT full_name FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  AND has_role(auth.uid(), 'technician'::app_role)
)
WITH CHECK (
  technician = (SELECT full_name FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  AND has_role(auth.uid(), 'technician'::app_role)
);
