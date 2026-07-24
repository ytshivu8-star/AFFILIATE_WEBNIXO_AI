const fs = require('fs');
let code = fs.readFileSync('src/lib/supabase.ts', 'utf-8');

const anchor = '-- 11. Uploaded Files Table';
const tableSql = `
-- 11.6 Payout History Table
create table if not exists webnixo_payout_history_affilate (
  id TEXT primary key,
  user_email TEXT,
  amount DECIMAL(10, 2),
  date TEXT,
  method TEXT,
  destination TEXT,
  status TEXT,
  transaction_id TEXT,
  created_at timestamp with time zone default NOW()
);

`;

if (!code.includes('webnixo_payout_history_affilate (')) {
    code = code.replace(anchor, tableSql + anchor);
    fs.writeFileSync('src/lib/supabase.ts', code);
    console.log('Successfully updated src/lib/supabase.ts');
} else {
    console.log('Table already exists');
}
