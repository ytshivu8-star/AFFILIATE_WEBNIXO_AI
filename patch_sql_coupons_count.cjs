const fs = require('fs');
let code = fs.readFileSync('src/lib/supabase.ts', 'utf-8');

const target = `create table if not exists coupons (
  code TEXT primary key,
  discount_percent INTEGER,
  description TEXT,
  is_active BOOLEAN default true,
  created_at timestamp with time zone default NOW()
);`;

const replacement = `create table if not exists coupons (
  code TEXT primary key,
  discount_percent INTEGER,
  description TEXT,
  is_active BOOLEAN default true,
  used_count INTEGER default 0,
  created_at timestamp with time zone default NOW()
);`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/lib/supabase.ts', code);
    console.log('Successfully added used_count to coupons table');
} else {
    console.log('Could not find target string');
}
