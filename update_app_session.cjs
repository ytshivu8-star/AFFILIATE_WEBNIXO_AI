const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Update App.tsx handleAuth
code = code.replace(
  /if \(!loginRes\.ok\) \{\n              const errData = await loginRes\.json\(\);\n              setOtpError\(errData\.error \|\| "Login failed"\);\n              resetTurnstile\(\);\n              return;\n            }/,
  `const dataRes = await loginRes.json();
            if (!loginRes.ok) {
              setOtpError(dataRes.error || "Login failed");
              resetTurnstile();
              return;
            }
            if (dataRes.session && isSupabaseConfigured()) {
              await supabase.auth.setSession({ access_token: dataRes.session.access_token, refresh_token: dataRes.session.refresh_token });
            }`
);

// Update App.tsx handleVerifyOTP
code = code.replace(
  /body: JSON\.stringify\(\{ email: emailToVerify, otpCode: otpInput\.trim\(\), purpose: purposeStr \}\)/,
  `body: JSON.stringify({ email: emailToVerify, otpCode: otpInput.trim(), purpose: purposeStr, password: passwordInput })`
);

code = code.replace(
  /if \(!res\.ok\) \{\n        setOtpError\(data\.error \|\| "Verification failed"\);\n        return;\n      \}/,
  `if (!res.ok) {
        setOtpError(data.error || "Verification failed");
        return;
      }
      if (data.session && isSupabaseConfigured()) {
        await supabase.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
      }`
);

fs.writeFileSync('src/App.tsx', code);
