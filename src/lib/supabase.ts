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
  return `-- Run this entire script in Supabase SQL Editor
-- 1. Profiles Table
create table if not exists profiles (
  email TEXT primary key,
  full_name TEXT,
  name TEXT,
  theme TEXT,
  credits_remaining INTEGER default 30,
  updated_at timestamp with time zone default NOW(),
  created_at timestamp with time zone default NOW()
);

-- 2. Payments Table
create table if not exists payments (
  order_id TEXT primary key,
  email TEXT,
  amount DECIMAL(10, 2),
  plan_id TEXT,
  status TEXT,
  payment_session_id TEXT,
  created_at timestamp with time zone default NOW()
);

-- 3. User Subscriptions Table
create table if not exists user_subscriptions (
  email TEXT primary key,
  plan_id TEXT,
  amount DECIMAL(10, 2),
  order_id TEXT,
  status TEXT,
  updated_at timestamp with time zone default NOW()
);

-- 4. Conversions Table
create table if not exists conversions (
  id TEXT primary key,
  email TEXT,
  conversion_type TEXT,
  conversion_value DECIMAL(10, 2),
  details JSONB,
  created_at timestamp with time zone default NOW()
);

-- 5. Affiliate Profiles
create table if not exists webnixo_profiles_affilate (
  email TEXT primary key,
  full_name TEXT,
  referral_code TEXT,
  custom_coupon_code TEXT,
  stats JSONB,
  joined_at timestamp with time zone default NOW(),
  updated_at timestamp with time zone default NOW()
);

-- 6. Affiliate Events
create table if not exists webnixo_events_affilate (
  id TEXT primary key,
  user_email TEXT,
  type TEXT,
  order_id TEXT,
  details TEXT,
  timestamp timestamp with time zone default NOW(),
  commission DECIMAL(10, 2),
  created_at timestamp with time zone default NOW()
);

-- 7. Chats Table
create table if not exists chats (
  id TEXT primary key,
  email TEXT,
  title TEXT,
  model TEXT,
  search_grounding BOOLEAN,
  messages JSONB,
  created_at timestamp with time zone default NOW()
);

-- 8. Coupons
create table if not exists coupons (
  code TEXT primary key,
  discount_percent INTEGER,
  description TEXT,
  is_active BOOLEAN default true,
  created_at timestamp with time zone default NOW()
);

-- 9. Coupon Usages
create table if not exists coupon_usages (
  id TEXT primary key,
  email TEXT,
  coupon_code TEXT,
  plan_id TEXT,
  original_price DECIMAL(10, 2),
  discounted_price DECIMAL(10, 2),
  applied_at timestamp with time zone default NOW()
);

-- 10. Plans & Prices Table (For Passes & Topups)
create table if not exists plans (
  id TEXT primary key,
  name TEXT,
  description TEXT,
  price DECIMAL(10, 2),
  type TEXT, -- 'subscription' or 'topup'
  billing_interval TEXT, -- 'monthly', 'yearly', or 'one-time'
  credits INTEGER,
  features JSONB,
  is_active BOOLEAN default true,
  created_at timestamp with time zone default NOW(),
  updated_at timestamp with time zone default NOW()
);

-- 11. Uploaded Files Table (For tracking file uploads)
create table if not exists uploaded_files (
  id UUID primary key default gen_random_uuid (),
  email TEXT,
  file_name TEXT,
  file_size INTEGER,
  content_type TEXT,
  storage_path TEXT,
  created_at timestamp with time zone default NOW()
);

-- Seed Plans and Topup Prices Data
insert into
  plans (
    id,
    name,
    description,
    price,
    type,
    billing_interval,
    credits,
    features
  )
values
  (
    'starter_monthly',
    'Starter Pass',
    'Monthly basic access',
    199.00,
    'subscription',
    'monthly',
    2000,
    '[\"Webnixo Base Engine\"]'
  ),
  (
    'starter_yearly',
    'Starter Pass',
    'Yearly basic access',
    1999.00,
    'subscription',
    'yearly',
    24000,
    '[\"Webnixo Base Engine\"]'
  ),
  (
    'pro_monthly',
    'Pro Elite Pass',
    'Monthly unlimited access',
    499.00,
    'subscription',
    'monthly',
    10000,
    '[\"All Advanced Engines\", \"Priority Support\"]'
  ),
  (
    'pro_yearly',
    'Pro Elite Pass',
    'Yearly unlimited access',
    4999.00,
    'subscription',
    'yearly',
    120000,
    '[\"All Advanced Engines\", \"Priority Support\"]'
  ),
  (
    'refill_500',
    'Topup 500 Credits',
    'One-time refill',
    159.00,
    'topup',
    'one-time',
    500,
    '[]'
  ),
  (
    'refill_1500',
    'Topup 1500 Credits',
    'One-time refill',
    349.00,
    'topup',
    'one-time',
    1500,
    '[]'
  ),
  (
    'refill_3500',
    'Topup 3500 Credits',
    'One-time refill',
    599.00,
    'topup',
    'one-time',
    3500,
    '[]'
  ),
  (
    'refill_8000',
    'Topup 8000 Credits',
    'One-time refill',
    999.00,
    'topup',
    'one-time',
    8000,
    '[]'
  ),
  (
    'refill_20000',
    'Topup 20000 Credits',
    'One-time refill',
    1999.00,
    'topup',
    'one-time',
    20000,
    '[]'
  )
on conflict (id) do update
set
  price = EXCLUDED.price,
  name = EXCLUDED.name;

-- 1. Insert or update the subscription and top-up plans
insert into
  plans (
    id,
    name,
    description,
    price,
    type,
    billing_interval,
    credits,
    is_active
  )
values
  (
    'monthly',
    'Monthly Pass',
    '2,000 credits every month',
    499,
    'subscription',
    'month',
    2000,
    true
  ),
  (
    'premium',
    'Premium Monthly',
    '10,000 credits every month',
    499,
    'subscription',
    'month',
    10000,
    true
  ),
  (
    'premium_yearly',
    'Yearly Pass',
    '10,000 credits every month (refreshed monthly)',
    9999,
    'subscription',
    'year',
    10000,
    true
  ),
  (
    'refill_500',
    '500 Credits',
    null,
    159,
    'topup',
    null,
    500,
    true
  ),
  (
    'refill_1500',
    '1500 Credits',
    null,
    349,
    'topup',
    null,
    1500,
    true
  ),
  (
    'refill_3500',
    '3500 Credits',
    null,
    599,
    'topup',
    null,
    3500,
    true
  ),
  (
    'refill_8000',
    '8000 Credits',
    null,
    999,
    'topup',
    null,
    8000,
    true
  ),
  (
    'refill_20000',
    '20000 Credits',
    null,
    1999,
    'topup',
    null,
    20000,
    true
  )
on conflict (id) do update
set
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  type = EXCLUDED.type,
  billing_interval = EXCLUDED.billing_interval,
  credits = EXCLUDED.credits,
  is_active = EXCLUDED.is_active;

-- 2. Optional: Remove any unused legacy plans if they still exist
delete from plans
where
  id not in (
    'monthly',
    'premium',
    'premium_yearly',
    'refill_500',
    'refill_1500',
    'refill_3500',
    'refill_8000',
    'refill_20000'
  );

-- 3. Fix the Row Level Security (RLS) issue
alter table plans ENABLE row LEVEL SECURITY;

-- Drop the policy if it already exists to avoid errors
drop policy IF exists "Allow public read on plans" on plans;

-- Create a policy that allows anyone (including your website) to read the plans
create policy "Allow public read on plans" on plans for
select
  using (true);`;
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
    const { data, error } = await supabase.from('plans').select('*').order('price', { ascending: true });
    if (error) return null;
    return data;
  } catch (err) {
    return null;
  }
};

export const saveSubscriptionPlanToSupabase = async (plan: any): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) return { success: false, error: "Supabase not configured" };
  try {
    const { error } = await supabase.from('plans').upsert(plan);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};
