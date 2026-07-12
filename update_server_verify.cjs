const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const verifyOtpRegex = /app\.post\("\/api\/auth\/verify-otp"[\s\S]*?(?=\napp\.post\("\/api\/auth\/reset-password")/g;

const newVerifyOtp = `app.post("/api/auth/verify-otp", async (req, res) => {
  const ip = getIP(req);
  const turnstileData = await verifyTurnstile(req.body.turnstileToken, ip);
  if (!turnstileData.success) {
    logTurnstileEvent(req, '/api/auth/verify-otp', false, turnstileData['error-codes']?.join(', '));
    return res.status(403).json({ error: "Turnstile verification failed. Please try again." });
  }
  logTurnstileEvent(req, '/api/auth/verify-otp', true);
  
  const { email, otpCode, purpose } = req.body;
  const cleanEmail = email.toLowerCase().trim();
  const inputHash = crypto.createHash('sha256').update(otpCode.trim()).digest('hex');

  const rl = await checkRateLimit(\`verify_otp\`, cleanEmail, 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    if (supabase) await supabase.from('webnixo_otps_affilate').delete().eq('email', cleanEmail).eq('purpose', purpose);
    else otpStore.delete(\`\${cleanEmail}_\${purpose}\`);
    logSecurityEvent(req, '/api/auth/verify-otp', cleanEmail, 'Blocked', 'Rate limit exceeded (5/15m) - OTP invalidated');
    return res.status(429).json({ error: "Too many incorrect attempts. OTP invalidated. Request a new one." });
  }

  if (supabase) {
    const { data, error } = await supabase.from('webnixo_otps_affilate')
      .select('*').eq('email', cleanEmail).eq('purpose', purpose).maybeSingle();

    if (error || !data) {
      logSecurityEvent(req, '/api/auth/verify-otp', cleanEmail, 'Blocked', 'OTP not found');
      return res.status(400).json({ error: "Invalid or expired OTP." });
    }

    const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : new Date(data.created_at).getTime() + 5 * 60 * 1000;
    if (expiresAt < Date.now()) {
      await supabase.from('webnixo_otps_affilate').delete().eq('id', data.id);
      logSecurityEvent(req, '/api/auth/verify-otp', cleanEmail, 'Blocked', 'OTP expired'); 
      return res.status(400).json({ error: "OTP expired. Please request a new one." });
    }

    if (data.otp_code !== inputHash && data.otp_code !== otpCode.trim()) {
      logSecurityEvent(req, '/api/auth/verify-otp', cleanEmail, 'Blocked', 'Incorrect security code');
      return res.status(400).json({ error: "Incorrect security code." });
    }

    await supabase.from('webnixo_otps_affilate').delete().eq('id', data.id);
  } else {
    const key = \`\${cleanEmail}_\${purpose}\`;
    const record = otpStore.get(key);
    
    if (!record) {
      logSecurityEvent(req, '/api/auth/verify-otp', cleanEmail, 'Blocked', 'OTP not found');
      return res.status(400).json({ error: "Invalid or expired OTP." });
    }
    
    if (Date.now() > record.expiresAt) {
      otpStore.delete(key);
      logSecurityEvent(req, '/api/auth/verify-otp', cleanEmail, 'Blocked', 'OTP expired'); 
      return res.status(400).json({ error: "OTP expired. Please request a new one." });
    }
    
    if (record.hash !== inputHash) {
      record.attempts += 1;
      if (record.attempts >= 5) {
        otpStore.delete(key);
        logSecurityEvent(req, '/api/auth/verify-otp', cleanEmail, 'Blocked', 'Too many failed attempts');
        return res.status(429).json({ error: "Too many attempts. OTP invalidated." });
      }
      logSecurityEvent(req, '/api/auth/verify-otp', cleanEmail, 'Blocked', 'Incorrect security code');
      return res.status(400).json({ error: "Incorrect security code." });
    }
    
    otpStore.delete(key);
  }

  await clearRateLimit(\`verify_otp\`, cleanEmail);
  logSecurityEvent(req, '/api/auth/verify-otp', cleanEmail, 'Allowed', 'Success');
  return res.json({ success: true });
});`;

code = code.replace(verifyOtpRegex, newVerifyOtp);
fs.writeFileSync('server.ts', code);
