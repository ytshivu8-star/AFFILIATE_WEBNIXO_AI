const fs = require('fs');
let code = fs.readFileSync('src/lib/supabase.ts', 'utf-8');

const rlsSection = `
-- 3. Fix the Row Level Security (RLS) issue
alter table plans ENABLE row LEVEL SECURITY;
`;

const openRlsSql = `
-- Fix the Row Level Security (RLS) issue for all tables
alter table plans ENABLE row LEVEL SECURITY;
alter table webnixo_profiles_affilate ENABLE row LEVEL SECURITY;
alter table webnixo_events_affilate ENABLE row LEVEL SECURITY;
alter table webnixo_otps_affilate ENABLE row LEVEL SECURITY;
alter table webnixo_payout_history_affilate ENABLE row LEVEL SECURITY;

-- Create open policies so app can read/write without auth token
drop policy IF exists "Allow public all on plans" on plans;
create policy "Allow public all on plans" on plans for all using (true) with check (true);

drop policy IF exists "Allow public all on webnixo_profiles_affilate" on webnixo_profiles_affilate;
create policy "Allow public all on webnixo_profiles_affilate" on webnixo_profiles_affilate for all using (true) with check (true);

drop policy IF exists "Allow public all on webnixo_events_affilate" on webnixo_events_affilate;
create policy "Allow public all on webnixo_events_affilate" on webnixo_events_affilate for all using (true) with check (true);

drop policy IF exists "Allow public all on webnixo_otps_affilate" on webnixo_otps_affilate;
create policy "Allow public all on webnixo_otps_affilate" on webnixo_otps_affilate for all using (true) with check (true);

drop policy IF exists "Allow public all on webnixo_payout_history_affilate" on webnixo_payout_history_affilate;
create policy "Allow public all on webnixo_payout_history_affilate" on webnixo_payout_history_affilate for all using (true) with check (true);

`;

code = code.replace(rlsSection, openRlsSql);
fs.writeFileSync('src/lib/supabase.ts', code);
console.log('Successfully updated RLS in getSQLInitializationScript');
