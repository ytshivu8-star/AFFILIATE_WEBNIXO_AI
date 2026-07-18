const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const oldStr = `    // Save to Supabase OTP table if configured
    if (isSupabaseConfigured()) {
      try {
        await storeOTPInSupabase(email, code, purpose);
      } catch (err) {
        console.warn("Supabase OTP store error:", err);
      }
    }`;

code = code.replace(oldStr, `// Supabase OTP storage is now handled securely on the server-side via /api/send-otp`);

fs.writeFileSync('src/App.tsx', code);
