-- 1. Add new roles to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'main_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'service_delivery';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'technical';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'billing';