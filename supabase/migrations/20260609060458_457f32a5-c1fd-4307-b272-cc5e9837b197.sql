
-- 1. Add 'distributor' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'distributor';

-- 2. Distributors table
CREATE TABLE IF NOT EXISTS public.distributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  business_name text NOT NULL,
  contact_name text NOT NULL,
  phone text,
  email text,
  district text,
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
  commission_rate numeric NOT NULL DEFAULT 10,
  commission_months int NOT NULL DEFAULT 3,
  notes text,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.distributors TO authenticated;
GRANT ALL ON public.distributors TO service_role;

ALTER TABLE public.distributors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "distributors view own" ON public.distributors
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'main_admin') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "distributors self insert" ON public.distributors
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "distributors admin update" ON public.distributors
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'main_admin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'main_admin') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "distributors admin delete" ON public.distributors
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'main_admin'));

CREATE TRIGGER trg_distributors_updated_at BEFORE UPDATE ON public.distributors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Add distributor_id to applications
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS distributor_id uuid REFERENCES public.distributors(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_applications_distributor ON public.applications(distributor_id);

-- 4. Commissions table
CREATE TABLE IF NOT EXISTS public.distributor_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL REFERENCES public.distributors(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  month_index int NOT NULL CHECK (month_index BETWEEN 1 AND 12),
  plan_price numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  due_date date,
  paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  paid_by uuid,
  paid_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, month_index)
);

GRANT SELECT ON public.distributor_commissions TO authenticated;
GRANT ALL ON public.distributor_commissions TO service_role;

ALTER TABLE public.distributor_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commissions view own" ON public.distributor_commissions
  FOR SELECT TO authenticated
  USING (
    distributor_id IN (SELECT id FROM public.distributors WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(),'main_admin') OR public.has_role(auth.uid(),'admin')
  );

CREATE POLICY "commissions admin manage" ON public.distributor_commissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'main_admin') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'main_admin') OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_commissions_updated_at BEFORE UPDATE ON public.distributor_commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Helper: parse numeric price from text like "M 350/month" or "350"
CREATE OR REPLACE FUNCTION public.parse_plan_price(_text text)
RETURNS numeric
LANGUAGE sql IMMUTABLE
AS $$
  SELECT COALESCE((regexp_match(coalesce(_text,''), '([0-9]+(?:\.[0-9]+)?)'))[1]::numeric, 0)
$$;

-- 6. Trigger: when application reaches 'completed', generate 3 monthly commission rows for distributor
CREATE OR REPLACE FUNCTION public.create_distributor_commissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dist public.distributors;
  price numeric;
  i int;
BEGIN
  IF NEW.stage <> 'completed' OR (OLD.stage IS NOT NULL AND OLD.stage = 'completed') THEN
    RETURN NEW;
  END IF;
  IF NEW.distributor_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT * INTO dist FROM public.distributors WHERE id = NEW.distributor_id AND status = 'approved';
  IF NOT FOUND THEN RETURN NEW; END IF;

  price := public.parse_plan_price(NEW.service);

  FOR i IN 1..dist.commission_months LOOP
    INSERT INTO public.distributor_commissions (distributor_id, application_id, month_index, plan_price, commission_amount, due_date)
    VALUES (
      dist.id, NEW.id, i, price,
      round(price * dist.commission_rate / 100.0, 2),
      (now()::date + (i * INTERVAL '1 month'))::date
    )
    ON CONFLICT (application_id, month_index) DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_distributor_commissions ON public.applications;
CREATE TRIGGER trg_app_distributor_commissions
  AFTER UPDATE OF stage ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.create_distributor_commissions();

-- 7. Helper RPC: lookup distributor by code (public — used by /apply?ref=CODE)
CREATE OR REPLACE FUNCTION public.lookup_distributor_by_code(_code text)
RETURNS TABLE(id uuid, business_name text, code text, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, business_name, code, status FROM public.distributors
  WHERE code = upper(trim(_code)) AND status = 'approved'
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.lookup_distributor_by_code(text) TO anon, authenticated;
