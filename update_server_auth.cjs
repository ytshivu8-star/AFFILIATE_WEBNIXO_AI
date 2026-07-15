const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  /const supabaseUrl = process\.env\.VITE_SUPABASE_URL \|\| process\.env\.SUPABASE_URL \|\| '';\nconst supabaseKey = process\.env\.VITE_SUPABASE_ANON_KEY \|\| process\.env\.SUPABASE_ANON_KEY \|\| '';\nconst supabase = supabaseUrl && supabaseKey \? createClient\(supabaseUrl, supabaseKey\) : null;/g,
  `const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } }) : null;
const supabaseAdmin = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } }) : null;`
);

const loginRegex = /app\.post\("\/api\/auth\/login", async \(req, res\) => \{[\s\S]*?(?=app\.post\("\/api\/auth\/signup")/g;

const newLogin = `app.post("/api/auth/login", async (req, res) => {
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

`;

code = code.replace(loginRegex, newLogin);

fs.writeFileSync('server.ts', code);
