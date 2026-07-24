const fs = require('fs');
let code = fs.readFileSync('src/lib/supabase.ts', 'utf-8');

const anchor = '-- 11. Uploaded Files Table';
const tableSql = `
-- 11.5 OTPs Table
create table if not exists webnixo_otps_affilate (
  id TEXT primary key,
  email TEXT,
  otp_code TEXT,
  purpose TEXT,
  verified BOOLEAN default false,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default NOW()
);

`;

if (!code.includes('webnixo_otps_affilate (')) {
    code = code.replace(anchor, tableSql + anchor);
    fs.writeFileSync('src/lib/supabase.ts', code);
    console.log('Successfully updated src/lib/supabase.ts');
} else {
    console.log('Table already exists');
}
