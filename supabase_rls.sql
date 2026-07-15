-- ==========================================
-- SUPABASE RLS SECURITY MIGRATION
-- ==========================================

-- 1. Enable Row Level Security on all user and application tables
ALTER TABLE IF EXISTS public.webnixo_profiles_affilate ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.webnixo_events_affilate ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.webnixo_payout_history_affilate ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.webnixo_otps_affilate ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- 2. Remove insecure "Public" access policies
DROP POLICY IF EXISTS "Public full access to profiles" ON public.webnixo_profiles_affilate;
DROP POLICY IF EXISTS "Public full access to events" ON public.webnixo_events_affilate;
DROP POLICY IF EXISTS "Public full access to payout history" ON public.webnixo_payout_history_affilate;

-- 3. Enforce User Isolation (Profiles)
CREATE POLICY "User isolation for profiles" ON public.webnixo_profiles_affilate
FOR ALL TO authenticated
USING (email = (auth.jwt() ->> 'email'))
WITH CHECK (email = (auth.jwt() ->> 'email'));

-- 4. Enforce User Isolation (Events)
CREATE POLICY "User isolation for events" ON public.webnixo_events_affilate
FOR ALL TO authenticated
USING (user_email = (auth.jwt() ->> 'email'))
WITH CHECK (user_email = (auth.jwt() ->> 'email'));

-- 5. Enforce User Isolation (Payout History)
CREATE POLICY "User isolation for payouts" ON public.webnixo_payout_history_affilate
FOR ALL TO authenticated
USING (user_email = (auth.jwt() ->> 'email'))
WITH CHECK (user_email = (auth.jwt() ->> 'email'));

-- 6. Subscription Plans (Read-Only to Public)
DROP POLICY IF EXISTS "Subscription plans are readable by all" ON public.subscription_plans;
CREATE POLICY "Subscription plans are readable by all" ON public.subscription_plans
FOR SELECT USING (true);

-- 7. OTPs Table (Strict Isolation)
-- No policies are created for anon/authenticated roles.
-- This ensures ONLY the backend using the service_role key can read/write OTPs.
