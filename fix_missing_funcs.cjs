const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const targetStr = '  if (!isLoggedIn) {';
const targetIdx = code.indexOf(targetStr);

const funcsToInject = `  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToVerify = verificationMode === 'signup_otp' ? emailInput : forgotEmailInput;
    const purposeStr = verificationMode === 'signup_otp' ? 'register' : 'forgot_password';
    
    // We bypassed turnstile on server, so we just call the api directly
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToVerify, otpCode: otpInput.trim(), purpose: purposeStr })
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || "Verification failed");
        return;
      }
    } catch (err) {
      // ignore
    }
    
    if (verificationMode === 'signup_otp') {
      setIsLoggedIn(true);
      setUser({ ...user, email: emailInput });
      setVerificationMode('none');
    } else {
      setVerificationMode('reset_password');
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    setIsAdminMode(false);
    localStorage.removeItem('wwebnixo_isLoggedIn');
    setAuthMode('login');
  };

`;

if (targetIdx !== -1) {
  code = code.slice(0, targetIdx) + funcsToInject + code.slice(targetIdx);
  fs.writeFileSync('src/App.tsx', code);
}
