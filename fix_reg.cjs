const fs = require('fs');
let code = fs.readFileSync('src/components/AffiliateRegistration.tsx', 'utf-8');
code = code.replace(/\\n/g, '\n');
fs.writeFileSync('src/components/AffiliateRegistration.tsx', code);
