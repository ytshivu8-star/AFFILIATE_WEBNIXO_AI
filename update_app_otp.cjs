const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Update handleSendOTP
const handleSendOtpRegex = /const handleSendOTP = async \(email: string, purpose: 'register' \| 'forgot_password', currentTurnstileToken\?: string\) => \{[\s\S]*?(?=const handleAuth =)/;

const newHandleSendOtp = `const handleSendOTP = async (email: string, purpose: 'register' | 'forgot_password', currentTurnstileToken?: string) => {
    setOtpLoading(true);
    setOtpError('');
    setOtpStatusMsg('');

    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          toEmail: email, 
          purpose,
          turnstileToken: currentTurnstileToken || turnstileToken 
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOtpStatusMsg("Verification email sent.");
      } else {
        setOtpError(data.error || "Failed to send email");
      }
    } catch (err) {
      setOtpError("Network error.");
    }
    setOtpLoading(false);
  };

  `;

code = code.replace(handleSendOtpRegex, newHandleSendOtp);

// Also remove `setOtpCode('')` and `const [otpCode, setOtpCode] = useState('');` if we don't need it. But wait, `otpCode` state might be used to store generated OTP locally?
// The user types into `otpInput`. `otpCode` is never needed!
code = code.replace(/const \[otpCode, setOtpCode\] = useState\(''\);\n/, '');
code = code.replace(/setOtpCode\(''\);\n/g, '');

fs.writeFileSync('src/App.tsx', code);
