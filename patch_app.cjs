const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Inside authenticateUser:
const oldLoginStr = `        if (isSupabaseConfigured()) {
          try {
            const remoteData = await loadProfileFromSupabase(cleanEmail);
            if (remoteData) {
              // Password check (if they configured a password)
              if (remoteData.profile.password && remoteData.profile.password !== password) {
                alert("The password entered is incorrect for this registered Supabase email.");
                return;
              }`;

const newLoginStr = `        if (isSupabaseConfigured()) {
          try {
            const loginRes = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: cleanEmail, password: password })
            });
            if (!loginRes.ok) {
              const errData = await loginRes.json();
              alert(errData.error || "Login failed");
              return;
            }
            
            const remoteData = await loadProfileFromSupabase(cleanEmail);
            if (remoteData) {`;

code = code.replace(oldLoginStr, newLoginStr);


// Now for Signup
const oldSignupStr = `      if (authMode === 'signup') {
        // Trigger registration OTP verification
        setVerificationMode('signup_otp');
        handleSendOTP(cleanEmail, 'register');
        return;
      }`;

const newSignupStr = `      if (authMode === 'signup') {
        const signupRes = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: cleanEmail }) });
        if (!signupRes.ok) {
          const errData = await signupRes.json();
          alert(errData.error || "Signup blocked.");
          return;
        }
        // Trigger registration OTP verification
        setVerificationMode('signup_otp');
        handleSendOTP(cleanEmail, 'register');
        return;
      }`;

code = code.replace(oldSignupStr, newSignupStr);

// Now for reset password
const resetStr = `    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('webnixo_profiles_affilate').update({
          password: newPasswordInput
        }).eq('email', emailToReset);`;

const newResetStr = `    if (isSupabaseConfigured()) {
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

code = code.replace(resetStr, newResetStr);

// Now for forgot password handleSendOTP
const forgotStr = `                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (forgotEmailInput && forgotEmailInput.includes('@')) {
                    setVerificationMode('forgot_otp');
                    handleSendOTP(forgotEmailInput.trim(), 'forgot_password');
                  }
                }}`;

const newForgotStr = `                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (forgotEmailInput && forgotEmailInput.includes('@')) {
                    const forgotRes = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: forgotEmailInput.trim() }) });
                    if (!forgotRes.ok) {
                      const errData = await forgotRes.json();
                      alert(errData.error || "Request blocked");
                      return;
                    }
                    const data = await forgotRes.json();
                    if (data.messageId === "simulated") {
                       // Silently pretend we sent it
                       setVerificationMode('forgot_otp');
                       setOtpStatusMsg(data.message || "If an account exists, we've sent reset instructions.");
                       return;
                    }
                    setVerificationMode('forgot_otp');
                    handleSendOTP(forgotEmailInput.trim(), 'forgot_password');
                  }
                }}`;

code = code.replace(forgotStr, newForgotStr);

fs.writeFileSync('src/App.tsx', code);
