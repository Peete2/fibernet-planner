
-- Add account_type to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'individual';

-- Add account_type to applications
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'individual';

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can update (mark read) their own notifications
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- System can insert notifications
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger function to notify on status change
CREATE OR REPLACE FUNCTION public.notify_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      NEW.user_id,
      'Application Status Updated',
      'Your application ' || NEW.ref_code || ' status changed from "' || OLD.status || '" to "' || NEW.status || '".'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to applications table
CREATE TRIGGER on_application_status_change
  AFTER UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_status_change();

-- Update handle_new_user to include account_type
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, account_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'individual')
  );
  RETURN NEW;
END;
$$;
