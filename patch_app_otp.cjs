const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Rewrite forgot password submit
const oldForgotForm = code.indexOf('<form onSubmit={async (e) => {');
const endOfForgotForm = code.indexOf('className="space-y-4">', oldForgotForm);
if (oldForgotForm !== -1 && endOfForgotForm !== -1) {
  const formCode = code.slice(oldForgotForm, endOfForgotForm);
  const newFormCode = `<form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!turnstileToken) {
                    alert("Please complete the security check.");
                    return;
                  }
                  if (forgotEmailInput && forgotEmailInput.includes('@')) {
                    const forgotRes = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: forgotEmailInput.trim(), turnstileToken }) });
                    if (!forgotRes.ok) {
                      const errData = await forgotRes.json();
                      alert(errData.error || "Request blocked");
                      resetTurnstile();
                      return;
                    }
                    const data = await forgotRes.json();
                    if (data.messageId === "simulated") {
                       setVerificationMode('forgot_otp');
                       setOtpStatusMsg(data.message || "If an account exists, we've sent reset instructions.");
                       resetTurnstile();
                       return;
                    }
                    setVerificationMode('forgot_otp');
                    handleSendOTP(forgotEmailInput.trim(), 'forgot_password', turnstileToken);
                    resetTurnstile();
                  }
                }}`;
  code = code.replace(formCode, newFormCode);
} else {
  // If we didn't find the patched version, fallback to the original submit logic:
  const oldForgotForm2 = code.indexOf('<form onSubmit={(e) => {');
  const endOfForgotForm2 = code.indexOf('className="space-y-4">', oldForgotForm2);
  if (oldForgotForm2 !== -1 && endOfForgotForm2 !== -1) {
     const formCode2 = code.slice(oldForgotForm2, endOfForgotForm2);
     const newFormCode2 = `<form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!forgotEmailInput.trim()) return;
                  if (!turnstileToken) {
                    alert("Please complete the security check.");
                    return;
                  }
                  
                  const forgotRes = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: forgotEmailInput.trim(), turnstileToken }) });
                  if (!forgotRes.ok) {
                    const errData = await forgotRes.json();
                    alert(errData.error || "Request blocked");
                    resetTurnstile();
                    return;
                  }
                  const data = await forgotRes.json();
                  setVerificationMode('forgot_otp');
                  handleSendOTP(forgotEmailInput.trim(), 'forgot_password', turnstileToken);
                  resetTurnstile();
                }}`;
      code = code.replace(formCode2, newFormCode2);
  }
}

// 2. Rewrite verify OTP form
const oldVerifyForm = code.indexOf('<form onSubmit={async (e) => {');
const endOfVerifyForm = code.indexOf('</div>', oldVerifyForm); // Wait, this might match the wrong div. Let's just find "const res = await verifyOTPFromSupabase"
const oldVerifyLine = code.indexOf('const res = await verifyOTPFromSupabase(emailToVerify, otpInput.trim(), purposeStr);');
if (oldVerifyLine !== -1) {
  const newVerifyLine = `if (!turnstileToken) {
                        setOtpError("Please complete the security check.");
                        setOtpLoading(false);
                        return;
                      }
                      const res = await verifyOTPFromSupabase(emailToVerify, otpInput.trim(), purposeStr, turnstileToken);`;
  code = code.replace('const res = await verifyOTPFromSupabase(emailToVerify, otpInput.trim(), purposeStr);', newVerifyLine);
  
  // also add resetTurnstile after successful or failed verification
  code = code.replace(`verified = true;\n                      } else {`, `verified = true;\n                        resetTurnstile();\n                      } else {`);
  code = code.replace(`setOtpError(res.error || "Incorrect security code.");\n                        }`, `setOtpError(res.error || "Incorrect security code.");\n                          resetTurnstile();\n                        }`);
}

fs.writeFileSync('src/App.tsx', code);
