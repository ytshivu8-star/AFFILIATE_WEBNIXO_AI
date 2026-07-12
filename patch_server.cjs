const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const imports = `import { createClient } from "@supabase/supabase-js";\n`;
code = code.replace(`import { createServer as createViteServer } from "vite";`, `import { createServer as createViteServer } from "vite";\n${imports}`);

const rateLimitLogic = `
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const getIP = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  return (Array.isArray(forwarded) ? forwarded[0] : forwarded) || req.socket?.remoteAddress || '127.0.0.1';
};

async function checkRateLimit(action, identifier, maxRequests, windowMs) {
  if (!supabase) return { allowed: true };
  const key = \`rl_\${action}_\${identifier}\`;
  const now = Date.now();

  try {
    const { data } = await supabase
      .from('webnixo_settings_affilate')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    let count = 0;
    let expireAt = now + windowMs;

    if (data && data.value) {
      try {
        const parsed = JSON.parse(data.value);
        if (parsed.expireAt > now) {
          count = parsed.count;
          expireAt = parsed.expireAt;
        }
      } catch (e) {}
    }

    if (count >= maxRequests) {
      console.warn(\`[Security] Rate limit exceeded for \${key}. Count: \${count}\`);
      return { allowed: false };
    }

    await supabase.from('webnixo_settings_affilate').upsert({
      key,
      value: JSON.stringify({ count: count + 1, expireAt }),
      updated_at: new Date().toISOString()
    });

    return { allowed: true };
  } catch (err) {
    console.error("Rate limit check error:", err);
    return { allowed: true }; // fail open if DB is down
  }
}

async function clearRateLimit(action, identifier) {
  if (!supabase) return;
  const key = \`rl_\${action}_\${identifier}\`;
  try {
    await supabase.from('webnixo_settings_affilate').delete().eq('key', key);
  } catch (err) {}
}

app.post("/api/auth/login", async (req, res) => {
  const ip = getIP(req);
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Missing fields" });

  const rl = await checkRateLimit("login", ip, 5, 15 * 60 * 1000);
  if (!rl.allowed) return res.status(429).json({ error: "Too many login attempts. Please try again in 15 minutes." });

  if (!supabase) return res.json({ success: true });

  const { data, error } = await supabase.from('webnixo_profiles_affilate').select('*').eq('email', email).maybeSingle();
  
  if (error || !data || data.password !== password) {
    console.warn(\`[Security] Failed login attempt for \${email} from IP \${ip}\`);
    return res.status(401).json({ error: "Invalid credentials." });
  }

  console.log(\`[Security] Successful login for \${email} from IP \${ip}\`);
  await clearRateLimit("login", ip);
  return res.json({ success: true });
});

app.post("/api/auth/signup", async (req, res) => {
  const ip = getIP(req);
  const rl = await checkRateLimit("signup", ip, 3, 60 * 60 * 1000);
  if (!rl.allowed) return res.status(429).json({ error: "Too many signup attempts. Please try again later." });
  
  console.log(\`[Security] Allowed signup from IP \${ip}\`);
  return res.json({ success: true });
});

app.post("/api/auth/verify-otp", async (req, res) => {
  const ip = getIP(req);
  const { email, otpCode, purpose } = req.body;

  const rl = await checkRateLimit(\`verify_otp\`, email, 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    if (supabase) await supabase.from('webnixo_otps_affilate').delete().eq('email', email).eq('purpose', purpose);
    console.warn(\`[Security] OTP verification locked out for \${email}\`);
    return res.status(429).json({ error: "Too many incorrect attempts. OTP invalidated. Request a new one." });
  }

  if (!supabase) return res.json({ success: true });

  const { data, error } = await supabase.from('webnixo_otps_affilate')
    .select('*').eq('email', email).eq('otp_code', otpCode).eq('purpose', purpose).maybeSingle();

  if (error || !data) {
    console.warn(\`[Security] Invalid OTP attempt for \${email}\`);
    return res.status(400).json({ error: "Incorrect security code." });
  }

  if (new Date(data.created_at).getTime() + 5 * 60 * 1000 < Date.now()) {
    await supabase.from('webnixo_otps_affilate').delete().eq('id', data.id);
    return res.status(400).json({ error: "OTP expired. Please request a new one." });
  }

  await supabase.from('webnixo_otps_affilate').delete().eq('id', data.id);
  await clearRateLimit(\`verify_otp\`, email);
  
  console.log(\`[Security] OTP successfully verified for \${email} (\${purpose})\`);
  return res.json({ success: true });
});

app.post("/api/auth/reset-password", async (req, res) => {
  const ip = getIP(req);
  const rl = await checkRateLimit("reset_pw", ip, 5, 60 * 60 * 1000);
  if (!rl.allowed) return res.status(429).json({ error: "Too many password reset attempts. Please try again later." });
  return res.json({ success: true });
});

app.post("/api/auth/google-callback", async (req, res) => {
  const ip = getIP(req);
  const rl = await checkRateLimit("google_callback", ip, 10, 15 * 60 * 1000);
  if (!rl.allowed) return res.status(429).json({ error: "Too many attempts." });
  return res.json({ success: true });
});

app.post("/api/auth/forgot-password", async (req, res) => {
  const ip = getIP(req);
  const { email } = req.body;
  const rl = await checkRateLimit(\`forgot_pw\`, email, 3, 60 * 60 * 1000);
  if (!rl.allowed) {
    return res.json({ success: true, message: "If an account exists, we've sent reset instructions." });
  }
  return res.json({ success: true });
});

`;

code = code.replace(`// API: Send OTP email proxy route`, rateLimitLogic + `\n// API: Send OTP email proxy route`);

const sendOtpInjection = `
    const ip = getIP(req);
    
    if (purpose === 'forgot_password') {
      const rlForgot = await checkRateLimit(\`forgot_email\`, toEmail, 3, 60 * 60 * 1000);
      if (!rlForgot.allowed) {
        console.warn(\`[Security] Blocked forgot password request for \${toEmail} (limit reached)\`);
        return res.json({ success: true, messageId: "simulated" }); // "Always return the same response"
      }
    } else if (purpose === 'register') {
      const rlResend = await checkRateLimit(\`resend_email\`, toEmail, 3, 60 * 60 * 1000);
      if (!rlResend.allowed) {
         console.warn(\`[Security] Blocked resend verification email for \${toEmail} (limit reached)\`);
         return res.status(429).json({ success: false, error: "Too many verification email requests. Please try again in 1 hour." });
      }
    }

    const emailLimit = await checkRateLimit("otp_email", toEmail, 3, 10 * 60 * 1000);
    if (!emailLimit.allowed) return res.status(429).json({ success: false, error: "Too many OTP requests for this email. Please try again later." });

    const ipLimit = await checkRateLimit("otp_ip", ip, 10, 60 * 60 * 1000);
    if (!ipLimit.allowed) return res.status(429).json({ success: false, error: "Too many OTP requests. Please try again later." });

`;

code = code.replace(`const { toEmail, otpCode, purpose } = req.body;`, `const { toEmail, otpCode, purpose } = req.body;\n${sendOtpInjection}`);

fs.writeFileSync('server.ts', code);
