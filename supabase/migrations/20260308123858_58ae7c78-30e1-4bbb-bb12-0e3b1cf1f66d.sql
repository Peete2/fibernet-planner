-- Applications table
CREATE TABLE public.applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ref_code TEXT NOT NULL UNIQUE DEFAULT 'ETL-' || to_char(now(), 'YYYY') || '-' || lpad(floor(random() * 999 + 1)::text, 3, '0'),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  service TEXT NOT NULL,
  district TEXT NOT NULL,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Site Survey', 'Approved', 'Installation Scheduled', 'Completed')),
  technician TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Customers can view their own applications
CREATE POLICY "Users can view own applications" ON public.applications
  FOR SELECT USING (auth.uid() = user_id);

-- Customers can insert their own applications
CREATE POLICY "Users can insert own applications" ON public.applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all applications
CREATE POLICY "Admins can view all applications" ON public.applications
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update any application
CREATE POLICY "Admins can update all applications" ON public.applications
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete applications
CREATE POLICY "Admins can delete applications" ON public.applications
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Anyone can search by ref_code (for tracking without login)
CREATE POLICY "Anyone can search by ref_code" ON public.applications
  FOR SELECT USING (true);

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fiber nodes table
CREATE TABLE public.fiber_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Planned' CHECK (status IN ('Active', 'Planned', 'Maintenance')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fiber_nodes ENABLE ROW LEVEL SECURITY;

-- Everyone can view fiber nodes (public coverage data)
CREATE POLICY "Anyone can view fiber nodes" ON public.fiber_nodes
  FOR SELECT USING (true);

-- Only admins can manage fiber nodes
CREATE POLICY "Admins can insert fiber nodes" ON public.fiber_nodes
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update fiber nodes" ON public.fiber_nodes
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete fiber nodes" ON public.fiber_nodes
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_fiber_nodes_updated_at
  BEFORE UPDATE ON public.fiber_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fiber routes table
CREATE TABLE public.fiber_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_name TEXT NOT NULL,
  coordinates JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fiber_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view fiber routes" ON public.fiber_routes
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert fiber routes" ON public.fiber_routes
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update fiber routes" ON public.fiber_routes
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete fiber routes" ON public.fiber_routes
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));