const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// Ensure crypto is required at the top
if (!code.includes("const crypto = require('crypto');")) {
  code = code.replace(
    'import express from "express";',
    `import express from "express";\nimport crypto from "crypto";`
  );
}

// Add OTP Store
if (!code.includes("const otpStore = new Map();")) {
  code = code.replace(
    'const app = express();',
    `const app = express();\nconst otpStore = new Map();`
  );
}

// Rewrite send-otp endpoint completely
const sendOtpRegex = /app\.post\("\/api\/send-otp"[\s\S]*?(?=\/\/ Setup Vite)/;

const newSendOtp = `app.post("/api/send-otp", async (req, res) => {
  try {
    const ip = getIP(req);
    const turnstileData = await verifyTurnstile(req.body.turnstileToken, ip);
    if (!turnstileData.success) {
      logTurnstileEvent(req, '/api/send-otp', false, turnstileData['error-codes']?.join(', '));
      return res.status(403).json({ success: false, error: "Turnstile verification failed. Please try again." });
    }
    logTurnstileEvent(req, '/api/send-otp', true);
    
    const { toEmail, purpose } = req.body;
    if (!toEmail || !purpose) {
      return res.status(400).json({ success: false, error: "Missing required fields (toEmail, purpose)" });
    }

    const email = toEmail.toLowerCase().trim();

    if (purpose === 'forgot_password') {
      const rlForgot = await checkRateLimit(\`forgot_email\`, email, 3, 10 * 60 * 1000);
      if (!rlForgot.allowed) {
        logSecurityEvent(req, '/api/send-otp (forgot)', email, 'Blocked', 'Rate limit exceeded (3/10m)');
        return res.json({ success: true, messageId: "simulated" }); // "Always return the same response"
      }
    } else if (purpose === 'register') {
      const rlResend = await checkRateLimit(\`resend_email\`, email, 3, 10 * 60 * 1000);
      if (!rlResend.allowed) {
         logSecurityEvent(req, '/api/send-otp (resend)', email, 'Blocked', 'Rate limit exceeded (3/10m)');
         return res.json({ success: true, messageId: "simulated" });
      }
    }

    // Generate secure random OTP (6 digits)
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

    if (supabase) {
      await supabase.from('webnixo_otps_affilate').delete().eq('email', email).eq('purpose', purpose);
      
      const { error } = await supabase.from('webnixo_otps_affilate').insert({
        id: Math.random().toString(36).substring(2, 15),
        email,
        otp_code: otpHash,
        purpose,
        verified: false,
        expires_at: expiresAt.toISOString(),
      });
      // Handle missing 'attempts' column gracefully if it doesn't exist by not adding it.
    } else {
      otpStore.set(\`\${email}_\${purpose}\`, {
        hash: otpHash,
        expiresAt: expiresAt.getTime(),
        attempts: 0
      });
    }

    let rawApiKey = (process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY || "re_KANKrYPv_NCYbaoLUnEauu2TbhyCnnMKj").trim();
    rawApiKey = rawApiKey.replace(/^["']|["']$/g, "").trim();

    let rawFromEmail = (process.env.VITE_RESEND_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "").trim();
    rawFromEmail = rawFromEmail.replace(/^["']|["']$/g, "").trim();

    let fromEmail = "WEBNIXO AI <onboarding@resend.dev>";
    if (rawFromEmail) {
      fromEmail = rawFromEmail;
    } else if (rawApiKey !== "re_KANKrYPv_NCYbaoLUnEauu2TbhyCnnMKj") {
      fromEmail = "WEBNIXO AI <info@webnixo.in>";
    }

    const emailHtml = \`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>WEBNIXO Verification</h2>
        <p>Your verification code is: <strong>\${otpCode}</strong></p>
        <p>This code will expire in 5 minutes.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>
    \`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": \`Bearer \${rawApiKey}\`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: \`WEBNIXO - Your Verification Code: \${otpCode}\`,
        html: emailHtml
      })
    });

    const data = await response.json();
    if (response.ok) {
      logSecurityEvent(req, '/api/send-otp', email, 'Allowed', 'OTP Generated & Sent');
      return res.json({ success: true, messageId: data.id });
    } else {
      throw new Error(data.message || "Failed to send email");
    }
  } catch (err: any) {
    console.error("Error in /api/send-otp endpoint:", err);
    return res.status(500).json({ success: false, error: err?.message || "Internal server error" });
  }
});

`;

code = code.replace(sendOtpRegex, newSendOtp);
fs.writeFileSync('server.ts', code);
