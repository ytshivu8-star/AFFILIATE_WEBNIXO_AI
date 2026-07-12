const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const importIdx = code.indexOf('import React');
if (importIdx > 0) {
  const misplacedCode = code.slice(0, importIdx);
  code = code.slice(importIdx);
  
  // Now we need to insert misplacedCode inside App component.
  // Find a good place, for example after `const resetTurnstile = () => { ... };`
  const insertTarget = '};\n\n  const handleSendOTP';
  // Let's just place it before `const handleVerifyOTP`
  const targetIdx = code.indexOf('const handleVerifyOTP');
  
  if (targetIdx !== -1) {
    code = code.slice(0, targetIdx) + misplacedCode + '\n  ' + code.slice(targetIdx);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Fixed misplaced code");
  } else {
    // maybe just inside the component
    const appStartIdx = code.indexOf('export default function App() {');
    const insertIdx = code.indexOf('\n', appStartIdx) + 1;
    code = code.slice(0, insertIdx) + misplacedCode + '\n' + code.slice(insertIdx);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Fixed misplaced code (fallback)");
  }
}
