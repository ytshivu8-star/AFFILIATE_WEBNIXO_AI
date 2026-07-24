const fs = require('fs');
let code = fs.readFileSync('src/lib/supabase.ts', 'utf-8');

const oldProfileSql = `create table if not exists webnixo_profiles_affilate (
  email TEXT primary key,
  full_name TEXT,
  referral_code TEXT,
  custom_coupon_code TEXT,
  stats JSONB,
  joined_at timestamp with time zone default NOW(),
  updated_at timestamp with time zone default NOW()
);`;

const newProfileSql = `create table if not exists webnixo_profiles_affilate (
  email TEXT primary key,
  id TEXT,
  password TEXT,
  full_name TEXT,
  phone TEXT,
  company_name TEXT,
  website TEXT,
  promo_strategy TEXT,
  country TEXT,
  is_registered BOOLEAN default false,
  referral_code TEXT,
  custom_coupon_code TEXT,
  is_admin BOOLEAN default false,
  stats JSONB,
  payout_details JSONB,
  joined_at timestamp with time zone default NOW(),
  updated_at timestamp with time zone default NOW()
);`;

if (code.includes(oldProfileSql)) {
    code = code.replace(oldProfileSql, newProfileSql);
    fs.writeFileSync('src/lib/supabase.ts', code);
    console.log('Successfully updated profiles schema in src/lib/supabase.ts');
} else {
    console.log('Could not find old profiles schema');
}
