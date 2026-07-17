const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// Replace /api/auth/login
const authLoginRegex = /app\.post\("\/api\/auth\/login", async \(req, res\) => \{[\s\S]*?res\.json\(\{ session: authUser\.data\.session \}\);\n\}\);/;
const newAuthLogin = `app.post("/api/auth/login", async (req, res) => {
  try {
    const ip = getIP(req);
    const turnstileData = await verifyTurnstile(req.body.turnstileToken, ip);
    if (!turnstileData.success) {
      logTurnstileEvent(req, '/api/auth/login', false, turnstileData['error-codes']?.join(', '));
      return res.status(403).json({ error: "Turnstile verification failed", details: turnstileData['error-codes'] });
    }
    logTurnstileEvent(req, '/api/auth/login', true);

    const { email, password } = req.body;
    if (!email || typeof email !== 'string' || email.length > 255 || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }
    if (!password || typeof password !== 'string' || password.length > 100) {
      return res.status(400).json({ error: "Invalid password" });
    }
    const cleanEmail = email.toLowerCase().trim();

    if (!supabaseAdmin) return res.json({ success: true });

    const { data, error } = await supabaseAdmin.from('webnixo_profiles_affilate').select('*').eq('email', cleanEmail).maybeSingle();
    
    if (error || !data || data.password !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    let authUser = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email: cleanEmail });
    // For local dev where we store passwords directly and use sign in
    authUser = await supabase.auth.signInWithPassword({ email: cleanEmail, password });

    if (authUser.error) {
       const { error: createError } = await supabaseAdmin.auth.admin.createUser({ email: cleanEmail, password, email_confirm: true });
       if (!createError) {
        authUser = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
       } else {
         return res.status(401).json({ error: "Authentication failed" });
       }
    }
    
    res.json({ session: authUser.data.session });
  } catch (err: any) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});`;
code = code.replace(authLoginRegex, newAuthLogin);

fs.writeFileSync('server.ts', code);
