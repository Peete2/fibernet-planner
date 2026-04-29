-- Service plans table (categories remain fixed: fmc, lte, fibre, fwa)
CREATE TABLE IF NOT EXISTS public.service_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id text NOT NULL CHECK (category_id IN ('fmc','lte','fibre','fwa')),
  name text NOT NULL,
  price text NOT NULL,
  speed text,
  details jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active service plans"
  ON public.service_plans FOR SELECT USING (true);

CREATE POLICY "Admins can insert service plans"
  ON public.service_plans FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update service plans"
  ON public.service_plans FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete service plans"
  ON public.service_plans FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_service_plans_updated_at
  BEFORE UPDATE ON public.service_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with current hardcoded plans
INSERT INTO public.service_plans (category_id, name, price, speed, details, sort_order) VALUES
  ('fmc', 'Bronze', 'M499/mo', '30 Mbps ↓ / 20 Mbps ↑', '["Integrated mobile data & voice","Home WiFi router included"]'::jsonb, 1),
  ('fmc', 'Silver', 'M649/mo', '70 Mbps ↓ / 25 Mbps ↑', '["Integrated mobile data & voice","Home WiFi router included"]'::jsonb, 2),
  ('fmc', 'Gold', 'M899/mo', '90 Mbps ↓ / 30 Mbps ↑', '["Up to 300GB FUP","Integrated mobile data & voice","Home WiFi router included"]'::jsonb, 3),
  ('lte', 'Always On Combo', 'M748/mo', 'Unlimited LTE', '["Unlimited LTE included","10GB Mobile Data bonus"]'::jsonb, 1),
  ('lte', 'Unlimited 15Mbps', 'M649/mo', '15 Mbps', '["100GB Fair Usage Policy","No contract required"]'::jsonb, 2),
  ('lte', 'Unlimited 20Mbps', 'M899/mo', '20 Mbps', '["200GB Fair Usage Policy"]'::jsonb, 3),
  ('lte', 'Unlimited 40Mbps', 'M1,599/mo', '40 Mbps', '["300GB Fair Usage Policy","Best for heavy usage"]'::jsonb, 4),
  ('fibre', 'Fibre Silver', 'M1,599/mo', '90 Mbps ↓ / 30 Mbps ↑', '["Dedicated fibre line","Symmetrical speeds available"]'::jsonb, 1),
  ('fibre', 'Top-Up 75GB', 'M870', NULL, '["75GB once-off data bundle"]'::jsonb, 2),
  ('fibre', 'Top-Up 100GB', 'M1,080', NULL, '["100GB once-off data bundle"]'::jsonb, 3),
  ('fibre', 'Top-Up 150GB', 'M1,240', NULL, '["150GB once-off data bundle"]'::jsonb, 4),
  ('fwa', 'Limited Wi-Fi for School', 'M129/mo', NULL, '["40GB data allocation","Ideal for institutions"]'::jsonb, 1),
  ('fwa', 'LTE Hybrid 10GB', 'M50/mo', NULL, '["10GB monthly data","Student / Teacher plan"]'::jsonb, 2),
  ('fwa', 'LTE Hybrid 25GB', 'M99/mo', NULL, '["25GB monthly data","Student / Teacher plan"]'::jsonb, 3),
  ('fwa', 'LTE Hybrid 40GB', 'M129/mo', NULL, '["40GB monthly data","Student / Teacher plan"]'::jsonb, 4),
  ('fwa', 'LTE Hybrid 80GB', 'M249/mo', NULL, '["80GB monthly data","Student / Teacher plan"]'::jsonb, 5);