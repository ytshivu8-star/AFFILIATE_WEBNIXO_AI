import { createClient } from '@supabase/supabase-js';
import { UserProfile, AffiliateStats, PayoutDetails, ReferralEvent, PayoutHistoryItem } from '../types';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

// Initialize client if configured
export const isSupabaseConfigured = () => {
  return (
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project') &&
    supabaseUrl.startsWith('https://')
  );
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Error state tracker to avoid flooding logs and enable beautiful UI warning
export let supabaseErrorState: {
  hasSchemaError: boolean;
  errorMessage: string;
} = {
  hasSchemaError: false,
  errorMessage: ''
};

// Raw SQL script for the user to paste into Supabase SQL Editor
export const getSQLInitializationScript = () => {
  return `-- ==========================================
-- SECTION 1: CORE APPLICATION TABLES
-- ==========================================

-- 1. Create Core Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    theme TEXT DEFAULT 'dark',
    credits_remaining INTEGER DEFAULT 30,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS and setup policies safely
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access to profiles" ON public.profiles;
CREATE POLICY "Public full access to profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);


-- 2. Create Core Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    order_id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    plan_id TEXT NOT NULL,
    status TEXT NOT NULL,
    payment_session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS and setup policies safely
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access to payments" ON public.payments;
CREATE POLICY "Public full access to payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);


-- 3. Create Core User Subscriptions Table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    email TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    status TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'INR',
    order_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS and setup policies safely
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access to user_subscriptions" ON public.user_subscriptions;
CREATE POLICY "Public full access to user_subscriptions" ON public.user_subscriptions FOR ALL USING (true) WITH CHECK (true);


-- 4. Create Core Conversions Table
CREATE TABLE IF NOT EXISTS public.conversions (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    conversion_type TEXT NOT NULL,
    conversion_value NUMERIC DEFAULT 0,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS and setup policies safely
ALTER TABLE public.conversions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access to conversions" ON public.conversions;
CREATE POLICY "Public full access to conversions" ON public.conversions FOR ALL USING (true) WITH CHECK (true);


-- ==========================================
-- SECTION 2: WEBNIXO AFFILIATE SYSTEM TABLES
-- ==========================================

-- 1. Create Profiles Affiliate Table (webnixo_profiles_affilate)
CREATE TABLE IF NOT EXISTS public.webnixo_profiles_affilate (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    full_name TEXT NOT NULL,
    phone TEXT,
    company_name TEXT,
    website TEXT,
    promo_strategy TEXT,
    country TEXT,
    is_registered BOOLEAN DEFAULT false,
    referral_code TEXT UNIQUE,
    custom_coupon_code TEXT,
    joined_at TEXT,
    is_admin BOOLEAN DEFAULT false,
    stats JSONB DEFAULT '{"clicks":0,"signups":0,"sales":0,"commissionEarned":0,"unpaidCommission":0,"payoutStatus":"None"}'::jsonb,
    payout_details JSONB DEFAULT '{"payoutMethod":"upi","upiId":"","bankName":"","accountNumber":"","accountHolderName":"","ifscCode":""}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS and setup policies safely
ALTER TABLE public.webnixo_profiles_affilate ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access to profiles" ON public.webnixo_profiles_affilate;
CREATE POLICY "Public full access to profiles" ON public.webnixo_profiles_affilate FOR ALL USING (true) WITH CHECK (true);


-- 2. Create Events Affiliate Table (webnixo_events_affilate)
CREATE TABLE IF NOT EXISTS public.webnixo_events_affilate (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    type TEXT NOT NULL,
    details TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    commission NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS and setup policies safely
ALTER TABLE public.webnixo_events_affilate ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access to events" ON public.webnixo_events_affilate;
CREATE POLICY "Public full access to events" ON public.webnixo_events_affilate FOR ALL USING (true) WITH CHECK (true);


-- 3. Create Payout History Affiliate Table (webnixo_payout_history_affilate)
CREATE TABLE IF NOT EXISTS public.webnixo_payout_history_affilate (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date TEXT NOT NULL,
    method TEXT NOT NULL,
    destination TEXT NOT NULL,
    status TEXT NOT NULL,
    transaction_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS and setup policies safely
ALTER TABLE public.webnixo_payout_history_affilate ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access to payout history" ON public.webnixo_payout_history_affilate;
CREATE POLICY "Public full access to payout history" ON public.webnixo_payout_history_affilate FOR ALL USING (true) WITH CHECK (true);


-- 4. Create Settings Affiliate Table (webnixo_settings_affilate)
CREATE TABLE IF NOT EXISTS public.webnixo_settings_affilate (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS and setup policies safely
ALTER TABLE public.webnixo_settings_affilate ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access to settings" ON public.webnixo_settings_affilate;
CREATE POLICY "Public full access to settings" ON public.webnixo_settings_affilate FOR ALL USING (true) WITH CHECK (true);


-- 5. Create OTP Affiliate Table (webnixo_otps_affilate)
CREATE TABLE IF NOT EXISTS public.webnixo_otps_affilate (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    purpose TEXT NOT NULL,
    verified BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS and setup policies safely
ALTER TABLE public.webnixo_otps_affilate ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access to otps" ON public.webnixo_otps_affilate;
CREATE POLICY "Public full access to otps" ON public.webnixo_otps_affilate FOR ALL USING (true) WITH CHECK (true);


-- ==========================================
-- SECTION 3: SEED DEFAULT DATA
-- ==========================================

-- Insert Initial Default Settings for Affiliate System
INSERT INTO public.webnixo_settings_affilate (key, value) VALUES
('commission_rate', '20'),
('min_payout', '1000'),
('comm_199', '39.80'),
('comm_499', '99.80'),
('comm_999', '199.80'),
('admin_password', '123456')
ON CONFLICT (key) DO NOTHING;


-- ==========================================
-- SUBSCRIPTION PLANS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cost NUMERIC NOT NULL,
  period TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Insert default subscription plans and refill plans
INSERT INTO public.subscription_plans (id, name, cost, period, is_active) VALUES
  ('free', 'Starter Plan', 0, 'forever', true),
  ('monthly', 'Monthly Pass', 49, 'mo', true),
  ('premium', 'Premium Pass', 99, 'mo', true),
  ('yearly', 'Yearly Elite', 499, 'yr', true),
  ('refill_500', '500 Credits', 159, 'one-time', true),
  ('refill_1500', '1500 Credits', 349, 'one-time', true),
  ('refill_3500', '3500 Credits', 599, 'one-time', true),
  ('refill_8000', '8000 Credits', 999, 'one-time', true),
  ('refill_20000', '20000 Credits', 1999, 'one-time', true)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  cost = EXCLUDED.cost,
  period = EXCLUDED.period;

-- Set up RLS (Row Level Security)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Drop the old policy name if it exists to avoid conflicts
DROP POLICY IF EXISTS "Allow public read access to subscription plans" ON public.subscription_plans;

-- Drop the new policy name if it exists (for clean re-runs)
DROP POLICY IF EXISTS "Public full access to subscription plans" ON public.subscription_plans;

-- Allow anonymous read and write access for admin purposes
CREATE POLICY "Public full access to subscription plans" ON public.subscription_plans FOR ALL USING (true) WITH CHECK (true);


-- ==========================================
-- COUPONS & USAGES
-- ==========================================

CREATE TABLE IF NOT EXISTS public.coupons (
    code TEXT PRIMARY KEY,
    discount_percent NUMERIC NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access to coupons" ON public.coupons;
CREATE POLICY "Public full access to coupons" ON public.coupons FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.coupon_usages (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    email TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    original_price NUMERIC NOT NULL,
    discounted_price NUMERIC NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access to coupon_usages" ON public.coupon_usages;
CREATE POLICY "Public full access to coupon_usages" ON public.coupon_usages FOR ALL USING (true) WITH CHECK (true);


-- ==========================================
-- MODEL PRICES (For Landing Page)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.model_prices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cost NUMERIC NOT NULL,
    is_active BOOLEAN DEFAULT true
);

INSERT INTO public.model_prices (id, name, cost, is_active) VALUES
('chatgpt', 'ChatGPT Plus', 2000, true),
('claude', 'Claude Pro', 2000, true),
('grok', 'Grok', 1500, true),
('perplexity', 'Perplexity Pro', 2000, true),
('mistral', 'Mistral Large', 1800, true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.model_prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access to model_prices" ON public.model_prices;
CREATE POLICY "Public full access to model_prices" ON public.model_prices FOR ALL USING (true) WITH CHECK (true);
`;
};

// Check connection schema status helper
export const checkSupabaseConnection = async (): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('webnixo_settings_affilate').select('key').limit(1);
    if (error) {
      supabaseErrorState.hasSchemaError = true;
      supabaseErrorState.errorMessage = error.message;
      return false;
    }
    supabaseErrorState.hasSchemaError = false;
    return true;
  } catch (err: any) {
    supabaseErrorState.hasSchemaError = true;
    supabaseErrorState.errorMessage = err.message || 'Unknown network error';
    return false;
  }
};

// 1. Settings Synchronization Helpers
export const syncSettingsToSupabase = async (settings: {
  commission_rate: string;
  min_payout: string;
  comm_199: string;
  comm_499: string;
  comm_999: string;
  admin_password?: string;
  marketing_logoUrl?: string;
  marketing_videoCode?: string;
  marketing_banners?: string;
}) => {
  if (!supabase) return;
  try {
    const upserts = Object.entries(settings).map(([key, val]) => {
      if (val === undefined) return null;
      return { key, value: typeof val === 'string' ? val : JSON.stringify(val) };
    }).filter(Boolean);

    if (upserts.length > 0) {
      await supabase.from('webnixo_settings_affilate').upsert(upserts);
    }
  } catch (err: any) {
    console.warn("Supabase settings sync error:", err.message);
  }
};

export const loadSettingsFromSupabase = async (): Promise<Record<string, string> | null> => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('webnixo_settings_affilate').select('*');
    if (error || !data) return null;
    
    const settingsMap: Record<string, string> = {};
    data.forEach(item => {
      settingsMap[item.key] = item.value;
    });
    return settingsMap;
  } catch (err) {
    console.warn("Supabase load settings error:", err);
    return null;
  }
};

// 2. Profile/Affiliates Synchronization Helpers
export const syncProfileToSupabase = async (
  profile: UserProfile,
  stats: AffiliateStats,
  payoutDetails: PayoutDetails
) => {
  if (!supabase) return;
  try {
    const upsertData = {
      id: profile.id,
      email: profile.email,
      password: profile.password || '',
      full_name: profile.fullName,
      phone: profile.phone,
      company_name: profile.companyName,
      website: profile.website,
      promo_strategy: profile.promoStrategy,
      country: profile.country,
      is_registered: profile.isRegisteredAffiliate,
      referral_code: profile.referralCode,
      custom_coupon_code: profile.customCouponCode || '',
      joined_at: profile.joinedAt,
      is_admin: profile.email === 'shiva@webnixo.in',
      stats: stats,
      payout_details: payoutDetails,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('webnixo_profiles_affilate').upsert(upsertData, { onConflict: 'email' });
    if (error) {
      supabaseErrorState.hasSchemaError = true;
      supabaseErrorState.errorMessage = error.message;
    }
  } catch (err: any) {
    console.warn("Supabase profile sync error:", err.message);
  }
};

export const loadProfileFromSupabase = async (email: string): Promise<{
  profile: UserProfile;
  stats: AffiliateStats;
  payout: PayoutDetails;
} | null> => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('webnixo_profiles_affilate')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error || !data) return null;

    const profile: UserProfile = {
      id: data.id,
      email: data.email,
      password: data.password,
      fullName: data.full_name,
      phone: data.phone || '',
      companyName: data.company_name || '',
      website: data.website || '',
      promoStrategy: data.promo_strategy || '',
      country: data.country || '',
      isRegisteredAffiliate: data.is_registered || false,
      referralCode: data.referral_code || '',
      customCouponCode: data.custom_coupon_code || '',
      joinedAt: data.joined_at || new Date().toISOString()
    };

    const stats: AffiliateStats = data.stats || {
      clicks: 0,
      signups: 0,
      sales: 0,
      commissionEarned: 0,
      unpaidCommission: 0,
      payoutStatus: 'None'
    };

    const payout: PayoutDetails = data.payout_details || {
      payoutMethod: 'upi',
      upiId: '',
      bankName: '',
      accountNumber: '',
      accountHolderName: '',
      ifscCode: ''
    };

    return { profile, stats, payout };
  } catch (err) {
    console.warn("Supabase load profile error:", err);
    return null;
  }
};

// 3. Events Synchronization Helpers
export const syncEventsToSupabase = async (email: string, events: ReferralEvent[]) => {
  if (!supabase) return;
  try {
    if (events.length === 0) return;
    const upserts = events.map(event => ({
      id: event.id,
      user_email: email,
      type: event.type,
      details: event.details,
      timestamp: event.timestamp,
      commission: event.commission || null
    }));

    await supabase.from('webnixo_events_affilate').upsert(upserts);
  } catch (err: any) {
    console.warn("Supabase events sync error:", err.message);
  }
};

export const loadEventsFromSupabase = async (email: string): Promise<ReferralEvent[] | null> => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('webnixo_events_affilate')
      .select('*')
      .eq('user_email', email)
      .order('timestamp', { ascending: false })
      .limit(30);

    if (error || !data) return null;

    return data.map(item => ({
      id: item.id,
      type: item.type as 'click' | 'signup' | 'sale',
      details: item.details,
      timestamp: item.timestamp,
      commission: item.commission ? Number(item.commission) : undefined
    }));
  } catch (err) {
    console.warn("Supabase load events error:", err);
    return null;
  }
};

// 4. Payout History Helpers
export const syncPayoutsToSupabase = async (email: string, payouts: PayoutHistoryItem[]) => {
  if (!supabase) return;
  try {
    if (payouts.length === 0) return;
    const upserts = payouts.map(item => ({
      id: item.id,
      user_email: email,
      amount: item.amount,
      date: item.date,
      method: item.method,
      destination: item.destination,
      status: item.status,
      transaction_id: item.transactionId || null
    }));

    await supabase.from('webnixo_payout_history_affilate').upsert(upserts);
  } catch (err: any) {
    console.warn("Supabase payouts sync error:", err.message);
  }
};

export const loadPayoutsFromSupabase = async (email: string): Promise<PayoutHistoryItem[] | null> => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('webnixo_payout_history_affilate')
      .select('*')
      .eq('user_email', email)
      .order('created_at', { ascending: false });

    if (error || !data) return null;

    return data.map(item => ({
      id: item.id,
      amount: Number(item.amount),
      date: item.date,
      method: item.method as 'upi' | 'bank',
      destination: item.destination,
      status: item.status as 'Pending' | 'Credited',
      transactionId: item.transaction_id || undefined
    }));
  } catch (err) {
    console.warn("Supabase load payouts error:", err);
    return null;
  }
};

// 5. Admin Loader Functions
export const loadAllProfilesFromSupabase = async (): Promise<any[] | null> => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('webnixo_profiles_affilate')
      .select('*')
      .order('joined_at', { ascending: false });

    if (error || !data) return null;

    return data.map(u => {
      const stats = u.stats || { clicks: 0, signups: 0, sales: 0, commissionEarned: 0, unpaidCommission: 0 };
      const payoutDetailsObj = u.payout_details || {};
      const payoutMethod = payoutDetailsObj.payoutMethod || 'upi';
      const payoutDetails = payoutMethod === 'upi' 
        ? payoutDetailsObj.upiId || '' 
        : `${payoutDetailsObj.bankName || ''} (A/C: ${payoutDetailsObj.accountNumber || ''})`;

      return {
        id: u.id,
        email: u.email,
        password: u.password,
        fullName: u.full_name,
        companyName: u.company_name || '',
        website: u.website || '',
        promoStrategy: u.promo_strategy || '',
        country: u.country || '',
        referralCode: u.referral_code || '',
        customCouponCode: u.custom_coupon_code || undefined,
        sales: stats.sales || 0,
        commissionEarned: stats.commissionEarned || 0,
        unpaidCommission: stats.unpaidCommission || 0,
        payoutMethod: payoutMethod,
        payoutDetails: payoutDetails,
        status: u.is_admin ? 'Active' : 'Active', // Defaults to active
        joinedAt: u.joined_at,
        isRegisteredAffiliate: u.is_registered
      };
    });
  } catch (err) {
    console.warn("Supabase load all profiles error:", err);
    return null;
  }
};

export const loadAllPayoutsFromSupabase = async (): Promise<any[] | null> => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('webnixo_payout_history_affilate')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return null;

    return data.map(item => ({
      id: item.id,
      userEmail: item.user_email,
      amount: Number(item.amount),
      date: item.date,
      method: item.method,
      destination: item.destination,
      status: item.status,
      transactionId: item.transaction_id || undefined
    }));
  } catch (err) {
    console.warn("Supabase load all payouts error:", err);
    return null;
  }
};

export const storeOTPInSupabase = async (
  email: string,
  otpCode: string,
  purpose: string
): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const id = Math.random().toString(36).substring(2, 15);
    // OTP expires in 10 minutes (using current UTC timestamp)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    
    const { error } = await supabase.from('webnixo_otps_affilate').insert({
      id,
      email: email.toLowerCase().trim(),
      otp_code: otpCode,
      purpose,
      verified: false,
      expires_at: expiresAt
    });

    if (error) {
      console.warn("Error storing OTP in Supabase:", error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn("storeOTPInSupabase exception:", err.message);
    return false;
  }
};

export const verifyOTPFromSupabase = async (
  email: string,
  otpCode: string,
  purpose: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otpCode, purpose })
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || "Verification failed" };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};


export const loadSubscriptionPlansFromSupabase = async (): Promise<any[] | null> => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('subscription_plans').select('*').order('cost', { ascending: true });
    if (error) return null;
    return data;
  } catch (err) {
    return null;
  }
};

export const saveSubscriptionPlanToSupabase = async (plan: any): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) return { success: false, error: "Supabase not configured" };
  try {
    const { error } = await supabase.from('subscription_plans').upsert(plan);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};
