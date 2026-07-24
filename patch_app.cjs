const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace the handleAuth block to show an alert if password is too short
code = code.replace(
  /if \(cleanEmail && passwordInput.length >= 6\) \{/,
  `if (cleanEmail && passwordInput.length < 6) { alert('Password must be at least 6 characters.'); return; }
    if (cleanEmail && passwordInput.length >= 6) {`
);

fs.writeFileSync('src/App.tsx', code);
console.log('Successfully updated App.tsx');
