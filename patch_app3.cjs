const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const oldResetStr = `    if (isSupabaseConfigured()) {
      try {
        const resetRes = await fetch('/api/auth/reset-password', { method: 'POST' });
        if (!resetRes.ok) {
          const errData = await resetRes.json();
          alert(errData.error || "Reset blocked");
          return;
        }
        
        const { error } = await supabase.from('webnixo_profiles_affilate').update({
          password: newPasswordInput
        }).eq('email', emailToReset);`;

const newResetStr = `    if (isSupabaseConfigured()) {
      try {
        const resetRes = await fetch('/api/auth/reset-password', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ email: emailToReset, password: newPasswordInput }) 
        });
        if (!resetRes.ok) {
          const errData = await resetRes.json();
          alert(errData.error || "Reset blocked");
          return;
        }
        const error = null; // Successfully reset on server`;

code = code.replace(oldResetStr, newResetStr);
fs.writeFileSync('src/App.tsx', code);
