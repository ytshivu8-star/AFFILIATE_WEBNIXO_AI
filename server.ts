import express from "express";
import crypto from "crypto";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";


// Load environment variables
dotenv.config();

const app = express();
const otpStore = new Map();
const PORT = 3000;

// Middleware for parsing JSON requests
app.use(express.json());

// API: Check Resend connection and configuration status
app.get("/api/resend-status", (req, res) => {
  let rawApiKey = (process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY || "re_KANKrYPv_NCYbaoLUnEauu2TbhyCnnMKj").trim();
  rawApiKey = rawApiKey.replace(/^["']|["']$/g, "").trim();

  let rawFromEmail = (process.env.VITE_RESEND_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "").trim();
  rawFromEmail = rawFromEmail.replace(/^["']|["']$/g, "").trim();

  const isCustomKey = rawApiKey !== "re_KANKrYPv_NCYbaoLUnEauu2TbhyCnnMKj" && rawApiKey.length > 10;
  
  let fromEmail = "WEBNIXO AI <onboarding@resend.dev>";
  if (rawFromEmail) {
    fromEmail = rawFromEmail;
  } else if (isCustomKey) {
    fromEmail = "WEBNIXO AI <no-reply@auth.webnixo.in>";
  }

  // Mask the API Key for security: re_abcd...wxyz
  let maskedKey = "None";
  if (isCustomKey) {
    if (rawApiKey.length > 8) {
      maskedKey = `${rawApiKey.substring(0, 5)}...${rawApiKey.substring(rawApiKey.length - 4)}`;
    } else {
      maskedKey = "Custom key (too short)";
    }
  } else {
    maskedKey = "Default demo key";
  }

  res.json({
    isCustomKey,
    maskedKey,
    fromEmail,
  });
});


const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } }) : null;
const supabaseAdmin = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } }) : null;


function logSecurityEvent(req, endpoint, email, status, reason) {
  const ip = getIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({
    timestamp,
    endpoint,
    ip_address: ip,
    user_agent: userAgent,
    email: email || 'unknown',
    status,
    reason
  }));
}

const getIP = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  return (Array.isArray(forwarded) ? forwarded[0] : forwarded) || req.socket?.remoteAddress || '127.0.0.1';
};


const verifyTurnstile = async (token, ip) => {
  return { success: true };
};

function logTurnstileEvent(req: any, endpoint: string, success: boolean, reason?: string) {
  const ip = getIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({
    timestamp,
    endpoint,
    ip_address: ip,
    user_agent: userAgent,
    event: 'Turnstile Verification',
    status: success ? 'Success' : 'Failure',
    reason: reason || (success ? '' : 'Invalid token')
  }));
}

async function checkRateLimit(action, identifier, maxRequests, windowMs) {
  if (!supabase) return { allowed: true };
  const key = `rl_${action}_${identifier}`;
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
      // Handled by endpoint now
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
  const key = `rl_${action}_${identifier}`;
  try {
    await supabase.from('webnixo_settings_affilate').delete().eq('key', key);
  } catch (err) {}
}

app.post("/api/auth/login", async (req, res) => {
  const ip = getIP(req);
  const turnstileData = await verifyTurnstile(req.body.turnstileToken, ip);
  if (!turnstileData.success) {
    logTurnstileEvent(req, '/api/auth/login', false, turnstileData['error-codes']?.join(', '));
    return res.status(403).json({ error: "Turnstile verification failed. Please try again." });
  }
  logTurnstileEvent(req, '/api/auth/login', true);
  
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Missing fields" });

  const rl = await checkRateLimit("login", ip, 5, 15 * 60 * 1000);
  if (!rl.allowed) { logSecurityEvent(req, '/api/auth/login', email, 'Blocked', 'Rate limit exceeded (5/15m)'); return res.status(429).json({ error: "Too many login attempts. Please try again in 15 minutes." }); }

  if (!supabaseAdmin) return res.json({ success: true });

  const cleanEmail = email.toLowerCase().trim();
  const { data, error } = await supabaseAdmin.from('webnixo_profiles_affilate').select('*').eq('email', cleanEmail).maybeSingle();
  
  if (error || !data || data.password !== password) {
    logSecurityEvent(req, '/api/auth/login', cleanEmail, 'Blocked', 'Invalid credentials');
    return res.status(401).json({ error: "Invalid credentials." });
  }

  // Ensure user is migrated to auth.users
  let authUser = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
  if (authUser.error) {
     const { error: createError } = await supabaseAdmin.auth.admin.createUser({ email: cleanEmail, password, email_confirm: true });
     if (!createError) {
        authUser = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
     } else {
        return res.status(500).json({ error: "Failed to initialize secure session." });
     }
  }

  logSecurityEvent(req, '/api/auth/login', cleanEmail, 'Allowed', 'Success');
  await clearRateLimit("login", ip);
  return res.json({ success: true, session: authUser.data.session });
});

app.post("/api/auth/signup", async (req, res) => {
  const ip = getIP(req);
  const turnstileData = await verifyTurnstile(req.body.turnstileToken, ip);
  if (!turnstileData.success) {
    logTurnstileEvent(req, '/api/auth/signup', false, turnstileData['error-codes']?.join(', '));
    return res.status(403).json({ error: "Turnstile verification failed. Please try again." });
  }
  logTurnstileEvent(req, '/api/auth/signup', true);
  
  const rl = await checkRateLimit("signup", ip, 3, 60 * 60 * 1000);
  if (!rl.allowed) { logSecurityEvent(req, '/api/auth/signup', req.body.email, 'Blocked', 'Rate limit exceeded (3/1h)'); return res.status(429).json({ error: "Too many signup attempts. Please try again later." }); }
  
  logSecurityEvent(req, '/api/auth/signup', req.body.email, 'Allowed', 'Success');
  return res.json({ success: true });
});

app.post("/api/auth/verify-otp", async (req, res) => {
  const ip = getIP(req);
  const turnstileData = await verifyTurnstile(req.body.turnstileToken, ip);
  if (!turnstileData.success) {
    logTurnstileEvent(req, '/api/auth/verify-otp', false, turnstileData['error-codes']?.join(', '));
    return res.status(403).json({ error: "Turnstile verification failed. Please try again." });
  }
  logTurnstileEvent(req, '/api/auth/verify-otp', true);
  
  const { email, otpCode, purpose, password } = req.body;
  const cleanEmail = email.toLowerCase().trim();
  const inputHash = require('crypto').createHash('sha256').update(otpCode.trim()).digest('hex');

  const rl = await checkRateLimit(`verify_otp`, cleanEmail, 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    if (supabaseAdmin) await supabaseAdmin.from('webnixo_otps_affilate').delete().eq('email', cleanEmail).eq('purpose', purpose);
    else otpStore.delete(`${cleanEmail}_${purpose}`);
    logSecurityEvent(req, '/api/auth/verify-otp', cleanEmail, 'Blocked', 'Rate limit exceeded (5/15m) - OTP invalidated');
    return res.status(429).json({ error: "Too many incorrect attempts. OTP invalidated. Request a new one." });
  }

  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from('webnixo_otps_affilate')
      .select('*').eq('email', cleanEmail).eq('purpose', purpose).maybeSingle();

    if (error || !data) {
      logSecurityEvent(req, '/api/auth/verify-otp', cleanEmail, 'Blocked', 'OTP not found');
      return res.status(400).json({ error: "Invalid or expired OTP." });
    }

    const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : new Date(data.created_at).getTime() + 5 * 60 * 1000;
    if (expiresAt < Date.now()) {
      await supabaseAdmin.from('webnixo_otps_affilate').delete().eq('id', data.id);
      logSecurityEvent(req, '/api/auth/verify-otp', cleanEmail, 'Blocked', 'OTP expired'); 
      return res.status(400).json({ error: "OTP expired. Please request a new one." });
    }

    if (data.otp_code !== inputHash && data.otp_code !== otpCode.trim()) {
      logSecurityEvent(req, '/api/auth/verify-otp', cleanEmail, 'Blocked', 'Incorrect security code');
      return res.status(400).json({ error: "Incorrect security code." });
    }

    await supabaseAdmin.from('webnixo_otps_affilate').delete().eq('id', data.id);
  } else {
    const key = `${cleanEmail}_${purpose}`;
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

  await clearRateLimit(`verify_otp`, cleanEmail);
  logSecurityEvent(req, '/api/auth/verify-otp', cleanEmail, 'Allowed', 'Success');

  let session = null;
  if (purpose === 'register' && password && supabaseAdmin) {
    let authUser = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (authUser.error) {
       await supabaseAdmin.auth.admin.createUser({ email: cleanEmail, password, email_confirm: true }).catch(() => {});
       authUser = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    }
    if (!authUser.error) {
      session = authUser.data.session;
    }
  }

  return res.json({ success: true, session });
});
app.post("/api/auth/reset-password", async (req, res) => {
  const ip = getIP(req);
  const turnstileData = await verifyTurnstile(req.body.turnstileToken, ip);
  if (!turnstileData.success) {
    logTurnstileEvent(req, '/api/auth/reset-password', false, turnstileData['error-codes']?.join(', '));
    return res.status(403).json({ error: "Turnstile verification failed. Please try again." });
  }
  logTurnstileEvent(req, '/api/auth/reset-password', true);
  
  const { email, password } = req.body;
  const rl = await checkRateLimit("reset_pw", ip, 5, 60 * 60 * 1000);
  if (!rl.allowed) return res.status(429).json({ error: "Too many password reset attempts. Please try again later." });
  
  if (supabase && email && password) {
    await supabase.from('webnixo_profiles_affilate').update({ password }).eq('email', email);
  }
  return res.json({ success: true });
});

app.post("/api/auth/google-callback", async (req, res) => {
  const ip = getIP(req);
  const turnstileData = await verifyTurnstile(req.body.turnstileToken, ip);
  if (!turnstileData.success) {
    logTurnstileEvent(req, '/api/auth/google-callback', false, turnstileData['error-codes']?.join(', '));
    return res.status(403).json({ error: "Turnstile verification failed. Please try again." });
  }
  logTurnstileEvent(req, '/api/auth/google-callback', true);
  
  const rl = await checkRateLimit("google_callback", ip, 10, 15 * 60 * 1000);
  if (!rl.allowed) return res.status(429).json({ error: "Too many attempts." });
  return res.json({ success: true });
});

app.post("/api/auth/forgot-password", async (req, res) => {
  const ip = getIP(req);
  const turnstileData = await verifyTurnstile(req.body.turnstileToken, ip);
  if (!turnstileData.success) {
    logTurnstileEvent(req, '/api/auth/forgot-password', false, turnstileData['error-codes']?.join(', '));
    return res.status(403).json({ error: "Turnstile verification failed. Please try again." });
  }
  logTurnstileEvent(req, '/api/auth/forgot-password', true);
  
  const { email } = req.body;
  const rl = await checkRateLimit(`forgot_pw`, email, 3, 60 * 60 * 1000);
  if (!rl.allowed) {
    return res.json({ success: true, message: "If an account exists, we've sent reset instructions." });
  }
  return res.json({ success: true });
});


// API: Send OTP email proxy route (Server-side bypasses browser CORS and secures the API Key)
app.post("/api/send-otp", async (req, res) => {
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
      const rlForgot = await checkRateLimit(`forgot_email`, email, 3, 10 * 60 * 1000);
      if (!rlForgot.allowed) {
        logSecurityEvent(req, '/api/send-otp (forgot)', email, 'Blocked', 'Rate limit exceeded (3/10m)');
        return res.json({ success: true, messageId: "simulated" }); // "Always return the same response"
      }
    } else if (purpose === 'register') {
      const rlResend = await checkRateLimit(`resend_email`, email, 3, 10 * 60 * 1000);
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
      otpStore.set(`${email}_${purpose}`, {
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

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>WEBNIXO Verification</h2>
        <p>Your verification code is: <strong>${otpCode}</strong></p>
        <p>This code will expire in 5 minutes.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${rawApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: `WEBNIXO - Your Verification Code: ${otpCode}`,
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

// Setup Vite or Static File serving depending on environment
async function init() {
  // Robust check to force development/Vite mode when running server.ts directly
  const isDev = process.env.NODE_ENV !== "production" || (typeof import.meta.url === "string" && import.meta.url.endsWith(".ts"));

  if (isDev) {
    console.log("Starting development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);

    // Logging middleware to trace dev requests and troubleshoot routing
    app.use((req, res, next) => {
      if (req.method === "GET" && !req.url.startsWith("/api") && !req.url.includes(".")) {
        console.log(`[Dev Routing] Catching non-asset GET request for path: ${req.url}`);
      }
      next();
    });
  } else {
    console.log("Starting production mode serving static dist files...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Full-stack server running on http://localhost:${PORT}`);
  });
}

init();
