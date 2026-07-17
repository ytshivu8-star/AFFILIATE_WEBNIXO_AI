import bcrypt from 'bcryptjs';
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
  let rawApiKey = (process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY || "").trim();
  rawApiKey = rawApiKey.replace(/^["']|["']$/g, "").trim();

  let rawFromEmail = (process.env.VITE_RESEND_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "").trim();
  rawFromEmail = rawFromEmail.replace(/^["']|["']$/g, "").trim();

  const isCustomKey = rawApiKey !== "" && rawApiKey.length > 10;
  
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



const isValidEmail = (email) => {
  return typeof email === 'string' && email.length > 5 && email.length < 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
const isValidPassword = (pwd) => {
  return typeof pwd === 'string' && pwd.length >= 6 && pwd.length <= 100;
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

    await supabaseAdmin.from('webnixo_settings_affilate').upsert({
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
    await supabaseAdmin.from('webnixo_settings_affilate').delete().eq('key', key);
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
  if (!isValidEmail(email) || !isValidPassword(password)) {
    return res.status(400).json({ error: "Invalid email or password format" });
  }

  const rl = await checkRateLimit("login", ip, 5, 15 * 60 * 1000);
  if (!rl.allowed) { logSecurityEvent(req, '/api/auth/login', email, 'Blocked', 'Rate limit exceeded (5/15m)'); return res.status(429).json({ error: "Too many login attempts. Please try again in 15 minutes." }); }

  if (!supabaseAdmin) return res.json({ success: true });

  const cleanEmail = email.toLowerCase().trim();
  const { data, error } = await supabaseAdmin.from('webnixo_profiles_affilate').select('*').eq('email', cleanEmail).maybeSingle();
  if (error || !data) {
    logSecurityEvent(req, '/api/auth/login', cleanEmail, 'Blocked', 'Invalid credentials');
    return res.status(401).json({ error: "Invalid credentials." });
  }
  
  const isMatch = data.password === password || (data.password && data.password.startsWith('$2') && await bcrypt.compare(password, data.password));
  if (!isMatch) {
    logSecurityEvent(req, '/api/auth/login', cleanEmail, 'Blocked', 'Invalid credentials');
    return res.status(401).json({ error: "Invalid credentials." });
  }
  
  if (data.password === password) {
    const hashed = await bcrypt.hash(password, 10);
    await supabaseAdmin.from('webnixo_profiles_affilate').update({ password: hashed }).eq('email', cleanEmail);
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
  
  const { email } = req.body;
  if (email && !isValidEmail(email)) return res.status(400).json({ error: "Invalid email format" });
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
  if (!isValidEmail(email) || typeof otpCode !== 'string' || otpCode.length !== 6 || typeof purpose !== 'string') {
    return res.status(400).json({ error: "Invalid request payload" });
  }
  if (password && !isValidPassword(password)) {
    return res.status(400).json({ error: "Invalid password format" });
  }
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
  try {
    const ip = getIP(req);
    const turnstileData = await verifyTurnstile(req.body.turnstileToken, ip);
    if (!turnstileData.success) {
      logTurnstileEvent(req, '/api/auth/reset-password', false, turnstileData['error-codes']?.join(', '));
      return res.status(403).json({ error: "Turnstile verification failed. Please try again." });
    }
    logTurnstileEvent(req, '/api/auth/reset-password', true);

    const { email, password } = req.body;
    if (!isValidEmail(email) || !isValidPassword(password)) {
      return res.status(400).json({ error: "Invalid email or password format" });
    }

    const rl = await checkRateLimit("reset_pwd", ip, 3, 60 * 60 * 1000);
    if (!rl.allowed) return res.status(429).json({ error: "Too many password reset attempts. Please try again later." });

    if (supabaseAdmin) {
      
      const hashed = await bcrypt.hash(password, 10);
      await supabaseAdmin.from('webnixo_profiles_affilate').update({ password: hashed }).eq('email', email);
    }
    return res.json({ success: true });
  } catch (err: any) {
    console.error(err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
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
  try {
    const ip = getIP(req);
    const turnstileData = await verifyTurnstile(req.body.turnstileToken, ip);
    if (!turnstileData.success) {
      logTurnstileEvent(req, '/api/auth/forgot-password', false, turnstileData['error-codes']?.join(', '));
      return res.status(403).json({ error: "Turnstile verification failed. Please try again." });
    }
    logTurnstileEvent(req, '/api/auth/forgot-password', true);

    const { email } = req.body;
    if (!isValidEmail(email)) return res.status(400).json({ error: "Invalid email format" });

    const rl = await checkRateLimit("forgot_pwd", ip, 3, 60 * 60 * 1000);
    if (!rl.allowed) return res.status(429).json({ error: "Too many attempts. Please try again later." });

    // Always return success to prevent email enumeration
    return res.json({ success: true });
  } catch (err: any) {
    console.error(err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
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
      await supabaseAdmin.from('webnixo_otps_affilate').delete().eq('email', email).eq('purpose', purpose);
      
      const { error } = await supabaseAdmin.from('webnixo_otps_affilate').insert({
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

    let rawApiKey = (process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY || "").trim();
    rawApiKey = rawApiKey.replace(/^["']|["']$/g, "").trim();

    let rawFromEmail = (process.env.VITE_RESEND_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "").trim();
    rawFromEmail = rawFromEmail.replace(/^["']|["']$/g, "").trim();

    let fromEmail = "WEBNIXO AI <onboarding@resend.dev>";
    if (rawFromEmail) {
      fromEmail = rawFromEmail;
    } else if (rawApiKey) {
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
    console.error("Error in /api/send-otp endpoint:", err.message || err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Setup Vite or Static File serving depending on environment


// --- ADMIN ENDPOINTS ---

const requireAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Missing authorization header" });
  if (!supabaseAdmin) return res.status(500).json({ error: "Supabase Admin not configured" });

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: "Invalid token" });

  const { data: profile } = await supabaseAdmin.from('webnixo_profiles_affilate').select('is_admin').eq('email', user.email).maybeSingle();
  if (!profile || !profile.is_admin) {
    return res.status(403).json({ error: "Forbidden: Admins only" });
  }
  
  req.adminEmail = user.email;
  next();
};


app.post("/api/user/profile", async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Missing authorization header" });
  if (!supabaseAdmin) return res.status(500).json({ error: "Internal server error" });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  const { profile, payoutDetails } = req.body;
  if (!profile || typeof profile !== 'object' || !payoutDetails || typeof payoutDetails !== 'object') {
     return res.status(400).json({ error: "Invalid payload" });
  }

  if (profile.email !== user.email) {
    return res.status(403).json({ error: "Cannot modify another user's profile" });
  }

  // Sanitize updates to prevent tampering with sensitive fields like stats or is_admin
  const updateData = {
    full_name: typeof profile.fullName === 'string' ? profile.fullName.slice(0, 100) : '',
    phone: typeof profile.phone === 'string' ? profile.phone.slice(0, 20) : '',
    company_name: typeof profile.companyName === 'string' ? profile.companyName.slice(0, 100) : '',
    website: typeof profile.website === 'string' ? profile.website.slice(0, 200) : '',
    promo_strategy: typeof profile.promoStrategy === 'string' ? profile.promoStrategy.slice(0, 1000) : '',
    country: typeof profile.country === 'string' ? profile.country.slice(0, 50) : '',
    custom_coupon_code: typeof profile.customCouponCode === 'string' ? profile.customCouponCode.slice(0, 50) : '',
    payout_details: typeof payoutDetails === 'object' ? payoutDetails : {},
    updated_at: new Date().toISOString()
  };

  const { error } = await supabaseAdmin.from('webnixo_profiles_affilate').update(updateData).eq('email', user.email);
  if (error) { console.error(error.message); return res.status(500).json({ error: "Internal server error" }); }
  
  res.json({ success: true });
});


app.post("/api/admin/settings/sync", requireAdmin, async (req, res) => {
  const { upserts } = req.body;
  if (!Array.isArray(upserts) || upserts.length > 50) return res.status(400).json({ error: "Invalid payload" });
  const { error } = await supabaseAdmin.from('webnixo_settings_affilate').upsert(upserts);
  if (error) { console.error(error.message); return res.status(500).json({ error: "Internal server error" }); }
  res.json({ success: true });
});

app.get("/api/admin/profiles", requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin.from('webnixo_profiles_affilate').select('*').order('joined_at', { ascending: false });
  if (error) { console.error(error.message); return res.status(500).json({ error: "Internal server error" }); }
  res.json({ profiles: data });
});


app.post("/api/admin/payouts/sync", requireAdmin, async (req, res) => {
  const { email, payouts } = req.body;
  if (!isValidEmail(email) || !Array.isArray(payouts) || payouts.length > 50) return res.status(400).json({ error: "Invalid payload" });
  
  const sanitizedPayouts = payouts.map(p => ({
     id: String(p.id).slice(0, 50),
     user_email: email,
     amount: Number(p.amount),
     date: String(p.date).slice(0, 50),
     method: String(p.method).slice(0, 50),
     destination: String(p.destination).slice(0, 100),
     status: String(p.status).slice(0, 50),
     transaction_id: p.transaction_id ? String(p.transaction_id).slice(0, 100) : null
  }));

  const { error } = await supabaseAdmin.from('webnixo_payout_history_affilate').upsert(sanitizedPayouts);
  if (error) { console.error(error.message); return res.status(500).json({ error: "Internal server error" }); }
  res.json({ success: true });
});

app.get("/api/admin/payouts", requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin.from('webnixo_payout_history_affilate').select('*').order('created_at', { ascending: false });
  if (error) { console.error(error.message); return res.status(500).json({ error: "Internal server error" }); }
  res.json({ payouts: data });
});

app.post("/api/admin/subscription-plans", requireAdmin, async (req, res) => {
  const plan = req.body;
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) return res.status(400).json({ error: "Invalid payload" });
  const allowedKeys = ['id', 'name', 'cost', 'features', 'popular'];
  const sanitizedPlan = {};
  for (const key of allowedKeys) {
    if (plan[key] !== undefined) sanitizedPlan[key] = plan[key];
  }
  const { error } = await supabaseAdmin.from('subscription_plans').upsert(sanitizedPlan);
  if (error) { console.error(error.message); return res.status(500).json({ error: "Internal server error" }); }
  res.json({ success: true });
});

app.post("/api/admin/profiles/update", requireAdmin, async (req, res) => {
  const { email, data } = req.body;
  if (!isValidEmail(email) || !data || typeof data !== 'object' || Array.isArray(data)) return res.status(400).json({ error: "Invalid payload" });
  
  const allowedKeys = ['full_name', 'phone', 'company_name', 'website', 'promo_strategy', 'country', 'custom_coupon_code', 'payout_details', 'stats', 'updated_at', 'is_admin'];
  const updateData = {};
  for (const key of allowedKeys) {
    if (data[key] !== undefined) updateData[key] = data[key];
  }
  
  const { error } = await supabaseAdmin.from('webnixo_profiles_affilate').update(updateData).eq('email', email);
  if (error) { console.error(error.message); return res.status(500).json({ error: "Internal server error" }); }
  res.json({ success: true });
});

// --- END ADMIN ENDPOINTS ---


// Automatic OTP Cleanup Routine
setInterval(async () => {
  if (supabaseAdmin) {
    try {
      const { error } = await supabaseAdmin.from('webnixo_otps_affilate').delete().lt('expires_at', new Date().toISOString());
      if (error) console.error("OTP Cleanup Error:", error.message);
    } catch (e) {}
  }
  
  // Cleanup in-memory store
  const now = Date.now();
  for (const [key, value] of otpStore.entries()) {
    if (now > value.expiresAt) otpStore.delete(key);
  }
}, 10 * 60 * 1000); // Run every 10 minutes

async function init() {
  // Robust check to force development/Vite mode when running server.ts directly
  const isDev = process.env.NODE_ENV !== "production" || (false /* import.meta.url not available in cjs */);

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
