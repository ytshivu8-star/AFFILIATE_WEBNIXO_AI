const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const injection = `
    const ipLimit = await checkRateLimit("otp_ip", ip, 10, 60 * 60 * 1000);
    if (!ipLimit.allowed) return res.status(429).json({ success: false, error: "Too many OTP requests. Please try again later." });

    if (supabase) {
      await supabase.from('webnixo_otps_affilate').insert({
        id: Math.random().toString(36).substring(2, 15),
        email: toEmail.toLowerCase().trim(),
        otp_code: otpCode,
        purpose,
        verified: false,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      });
    }
`;

code = code.replace(`    const ipLimit = await checkRateLimit("otp_ip", ip, 10, 60 * 60 * 1000);\n    if (!ipLimit.allowed) return res.status(429).json({ success: false, error: "Too many OTP requests. Please try again later." });`, injection);

fs.writeFileSync('server.ts', code);
