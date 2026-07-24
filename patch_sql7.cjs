const fs = require('fs');
let code = fs.readFileSync('src/lib/supabase.ts', 'utf-8');

const anchor = '-- 11. Uploaded Files Table';
const tableSql = `
-- 11.7 Settings Table
create table if not exists webnixo_settings_affilate (
  key TEXT primary key,
  value TEXT,
  updated_at timestamp with time zone default NOW()
);

`;

if (!code.includes('webnixo_settings_affilate (')) {
    code = code.replace(anchor, tableSql + anchor);
    fs.writeFileSync('src/lib/supabase.ts', code);
    console.log('Successfully added webnixo_settings_affilate table');
}

const rlsSection = `alter table webnixo_payout_history_affilate ENABLE row LEVEL SECURITY;`;
const newRls = `alter table webnixo_payout_history_affilate ENABLE row LEVEL SECURITY;
alter table webnixo_settings_affilate ENABLE row LEVEL SECURITY;
`;

if (!code.includes('alter table webnixo_settings_affilate ENABLE row LEVEL SECURITY;')) {
    code = code.replace(rlsSection, newRls);
    fs.writeFileSync('src/lib/supabase.ts', code);
    console.log('Successfully added RLS for settings table');
}

const policySection = `create policy "Allow public all on webnixo_payout_history_affilate" on webnixo_payout_history_affilate for all using (true) with check (true);`;
const newPolicy = `create policy "Allow public all on webnixo_payout_history_affilate" on webnixo_payout_history_affilate for all using (true) with check (true);

drop policy IF exists "Allow public all on webnixo_settings_affilate" on webnixo_settings_affilate;
create policy "Allow public all on webnixo_settings_affilate" on webnixo_settings_affilate for all using (true) with check (true);`;

if (!code.includes('Allow public all on webnixo_settings_affilate')) {
    code = code.replace(policySection, newPolicy);
    fs.writeFileSync('src/lib/supabase.ts', code);
    console.log('Successfully added policy for settings table');
}

