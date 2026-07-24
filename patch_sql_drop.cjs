const fs = require('fs');
let code = fs.readFileSync('src/lib/supabase.ts', 'utf-8');

const anchor = '-- 5. Affiliate Profiles';
const replacement = `
-- Drop existing affiliate tables to ensure schema updates apply cleanly
drop table if exists webnixo_profiles_affilate cascade;
drop table if exists webnixo_events_affilate cascade;
drop table if exists webnixo_otps_affilate cascade;
drop table if exists webnixo_payout_history_affilate cascade;
drop table if exists webnixo_settings_affilate cascade;

-- 5. Affiliate Profiles`;

if (!code.includes('drop table if exists webnixo_profiles_affilate')) {
    code = code.replace(anchor, replacement);
    fs.writeFileSync('src/lib/supabase.ts', code);
    console.log('Successfully added drop table statements');
} else {
    console.log('Already has drop statements');
}
