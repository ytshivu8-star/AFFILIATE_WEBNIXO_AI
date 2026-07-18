import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";


// Load environment variables
dotenv.config();

const app = express();
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
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;


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
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Missing fields" });

  const rl = await checkRateLimit("login", ip, 5, 15 * 60 * 1000);
  if (!rl.allowed) { logSecurityEvent(req, '/api/auth/login', email, 'Blocked', 'Rate limit exceeded (5/15m)'); return res.status(429).json({ error: "Too many login attempts. Please try again in 15 minutes." }); }

  if (!supabase) return res.json({ success: true });

  const { data, error } = await supabase.from('webnixo_profiles_affilate').select('*').eq('email', email).maybeSingle();
  
  if (error || !data || data.password !== password) {
    logSecurityEvent(req, '/api/auth/login', email, 'Blocked', 'Invalid credentials');
    return res.status(401).json({ error: "Invalid credentials." });
  }

  logSecurityEvent(req, '/api/auth/login', email, 'Allowed', 'Success');
  await clearRateLimit("login", ip);
  return res.json({ success: true });
});

app.post("/api/auth/signup", async (req, res) => {
  const ip = getIP(req);
  const rl = await checkRateLimit("signup", ip, 3, 60 * 60 * 1000);
  if (!rl.allowed) { logSecurityEvent(req, '/api/auth/signup', req.body.email, 'Blocked', 'Rate limit exceeded (3/1h)'); return res.status(429).json({ error: "Too many signup attempts. Please try again later." }); }
  
  logSecurityEvent(req, '/api/auth/signup', req.body.email, 'Allowed', 'Success');
  return res.json({ success: true });
});

app.post("/api/auth/verify-otp", async (req, res) => {
  const ip = getIP(req);
  const { email, otpCode, purpose } = req.body;

  const rl = await checkRateLimit(`verify_otp`, email, 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    if (supabase) await supabase.from('webnixo_otps_affilate').delete().eq('email', email).eq('purpose', purpose);
    logSecurityEvent(req, '/api/auth/verify-otp', email, 'Blocked', 'Rate limit exceeded (5/15m) - OTP invalidated');
    return res.status(429).json({ error: "Too many incorrect attempts. OTP invalidated. Request a new one." });
  }

  if (!supabase) return res.json({ success: true });

  const { data, error } = await supabase.from('webnixo_otps_affilate')
    .select('*').eq('email', email).eq('otp_code', otpCode).eq('purpose', purpose).maybeSingle();

  if (error || !data) {
    logSecurityEvent(req, '/api/auth/verify-otp', email, 'Blocked', 'Incorrect security code');
    return res.status(400).json({ error: "Incorrect security code." });
  }

  if (new Date(data.created_at).getTime() + 5 * 60 * 1000 < Date.now()) {
    await supabase.from('webnixo_otps_affilate').delete().eq('id', data.id);
    logSecurityEvent(req, '/api/auth/verify-otp', email, 'Blocked', 'OTP expired'); return res.status(400).json({ error: "OTP expired. Please request a new one." });
  }

  await supabase.from('webnixo_otps_affilate').delete().eq('id', data.id);
  await clearRateLimit(`verify_otp`, email);
  
  logSecurityEvent(req, '/api/auth/verify-otp', email, 'Allowed', 'Success');
  return res.json({ success: true });
});

app.post("/api/auth/reset-password", async (req, res) => {
  const ip = getIP(req);
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
  const rl = await checkRateLimit("google_callback", ip, 10, 15 * 60 * 1000);
  if (!rl.allowed) return res.status(429).json({ error: "Too many attempts." });
  return res.json({ success: true });
});

app.post("/api/auth/forgot-password", async (req, res) => {
  const ip = getIP(req);
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
    const { toEmail, otpCode, purpose } = req.body;

    const ip = getIP(req);
    
    if (purpose === 'forgot_password') {
      const rlForgot = await checkRateLimit(`forgot_email`, toEmail, 3, 60 * 60 * 1000);
      if (!rlForgot.allowed) {
        logSecurityEvent(req, '/api/send-otp (forgot)', toEmail, 'Blocked', 'Rate limit exceeded (3/1h)');
        return res.json({ success: true, messageId: "simulated" }); // "Always return the same response"
      }
    } else if (purpose === 'register') {
      const rlResend = await checkRateLimit(`resend_email`, toEmail, 3, 60 * 60 * 1000);
      if (!rlResend.allowed) {
         logSecurityEvent(req, '/api/send-otp (resend)', toEmail, 'Blocked', 'Rate limit exceeded (3/1h)');
         return res.status(429).json({ success: false, error: "Too many verification email requests. Please try again in 1 hour." });
      }
    }

    const emailLimit = await checkRateLimit("otp_email", toEmail, 3, 10 * 60 * 1000);
    if (!emailLimit.allowed) { logSecurityEvent(req, '/api/send-otp', toEmail, 'Blocked', 'Rate limit exceeded per email (3/10m)'); return res.status(429).json({ success: false, error: "Too many OTP requests for this email. Please try again later." }); }


    const ipLimit = await checkRateLimit("otp_ip", ip, 10, 60 * 60 * 1000);
    if (!ipLimit.allowed) { logSecurityEvent(req, '/api/send-otp', toEmail, 'Blocked', 'Rate limit exceeded per IP (10/1h)'); return res.status(429).json({ success: false, error: "Too many OTP requests. Please try again later." }); }

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




    if (!toEmail || !otpCode || !purpose) {
      return res.status(400).json({ success: false, error: "Missing required fields (toEmail, otpCode, purpose)" });
    }

    let rawApiKey = (process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY || "re_KANKrYPv_NCYbaoLUnEauu2TbhyCnnMKj").trim();
    rawApiKey = rawApiKey.replace(/^["']|["']$/g, "").trim();

    let rawFromEmail = (process.env.VITE_RESEND_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "").trim();
    rawFromEmail = rawFromEmail.replace(/^["']|["']$/g, "").trim();

    // Determine the sender email
    let fromEmail = "WEBNIXO AI <onboarding@resend.dev>";
    if (rawFromEmail) {
      fromEmail = rawFromEmail;
    } else if (rawApiKey !== "re_KANKrYPv_NCYbaoLUnEauu2TbhyCnnMKj") {
      // If they provided their own key and haven't explicitly set a custom from email,
      // default to their verified domain auth.webnixo.in!
      fromEmail = "WEBNIXO AI <no-reply@auth.webnixo.in>";
    }

    const subject = purpose === 'register' 
      ? `[WEBNIXO AI] Confirm Your Affiliate Registration` 
      : `[WEBNIXO AI] Reset Your Affiliate Account Password`;

    const htmlBody = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 25px;">
          <h2 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">WEBNIXO AI</h2>
          <p style="color: #64748b; font-size: 12px; margin-top: 5px; text-transform: uppercase; tracking: 1px;">Affiliate Partner Network</p>
        </div>
        
        <div style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
          <p style="font-size: 15px; line-height: 1.6; color: #334155;">Hello,</p>
          <p style="font-size: 15px; line-height: 1.6; color: #334155;">
            ${purpose === 'register' 
              ? 'Thank you for registering to join the WEBNIXO AI Affiliate Partner network. To complete your account verification, please use the 6-digit verification code below:' 
              : 'We received a request to reset the password for your WEBNIXO AI Affiliate Partner account. Use the 6-digit security code below to set a new password:'}
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; background-color: #f5f3ff; border: 2px dashed #818cf8; border-radius: 12px; padding: 15px 35px; font-size: 32px; font-weight: 800; letter-spacing: 5px; color: #4f46e5;">
              ${otpCode}
            </div>
            <p style="font-size: 11px; color: #94a3b8; margin-top: 10px;">This security code is valid for the next 10 minutes.</p>
          </div>
          
          <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin-top: 25px;">
            If you did not make this request, you can safely ignore this email.
          </p>
        </div>
        
        <div style="border-top: 1px solid #f1f5f9; margin-top: 30px; padding-top: 15px; text-align: center;">
          <p style="font-size: 11px; color: #94a3b8; margin: 0;">&copy; 2026 WEBNIXO AI Partner Network. All rights reserved.</p>
          <p style="font-size: 9px; color: #cbd5e1; margin-top: 5px;">Sent securely via Resend API.</p>
        </div>
      </div>
    `;

    const sendWithFrom = async (fromAddress: string) => {
      console.log(`Sending OTP Email via Resend. From: "${fromAddress}" | To: "${toEmail}" | Purpose: "${purpose}"`);
      return await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${rawApiKey}`,
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [toEmail],
          subject: subject,
          html: htmlBody,
        }),
      });
    };

    let resendResponse = await sendWithFrom(fromEmail);

    // Auto-fallback 1: If 422 validation error and display name was used, strip display name and try raw email
    if (resendResponse.status === 422 && fromEmail.includes("<")) {
      const emailMatch = fromEmail.match(/<([^>]+)>/);
      if (emailMatch && emailMatch[1]) {
        const rawEmailOnly = emailMatch[1].trim();
        console.warn(`Resend 422 validation error with display name. Retrying with raw email only: "${rawEmailOnly}"`);
        resendResponse = await sendWithFrom(rawEmailOnly);
      }
    }

    // Auto-fallback 2: If still 422 and we are using a custom domain, try falling back to onboarding@resend.dev sandbox address
    // just in case they haven't finished verifying the domain in their Resend dashboard
    if (resendResponse.status === 422 && !fromEmail.includes("onboarding@resend.dev")) {
      console.warn(`Resend 422 validation error with custom domain. Retrying with onboarding@resend.dev sandbox address`);
      resendResponse = await sendWithFrom("WEBNIXO AI <onboarding@resend.dev>");
    }

    if (resendResponse.ok) {
      const resData = await resendResponse.json();
      return res.json({ success: true, messageId: resData.id });
    } else {
      const errText = await resendResponse.text();
      console.error("Resend API returned error after all fallback attempts:", errText);
      
      let parsedError = errText;
      try {
        const jsonErr = JSON.parse(errText);
        if (jsonErr) {
          if (jsonErr.message) {
            parsedError = jsonErr.message;
          } else if (jsonErr.error && typeof jsonErr.error === 'object' && jsonErr.error.message) {
            parsedError = jsonErr.error.message;
          } else if (jsonErr.error && typeof jsonErr.error === 'string') {
            parsedError = jsonErr.error;
          } else if (jsonErr.description) {
            parsedError = jsonErr.description;
          } else if (jsonErr.name) {
            parsedError = `${jsonErr.name}${jsonErr.message ? ': ' + jsonErr.message : ''}`;
          }
        }
      } catch (e) {
        // Fallback to raw response text if not valid JSON
      }
      
      return res.status(422).json({ success: false, error: parsedError });
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
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Full-stack server running on http://localhost:${PORT}`);
  });
}

init();
