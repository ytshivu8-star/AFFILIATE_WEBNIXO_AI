const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = code.replace(/const handleAuth = \(e: React\.FormEvent\) => \{/g, 'const handleAuth = async (e: React.FormEvent) => {');
fs.writeFileSync('src/App.tsx', code);
