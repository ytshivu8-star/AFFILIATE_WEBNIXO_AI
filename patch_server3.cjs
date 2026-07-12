const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const resetLogic = `app.post("/api/auth/reset-password", async (req, res) => {
  const ip = getIP(req);
  const { email, password } = req.body;
  const rl = await checkRateLimit("reset_pw", ip, 5, 60 * 60 * 1000);
  if (!rl.allowed) return res.status(429).json({ error: "Too many password reset attempts. Please try again later." });
  
  if (supabase && email && password) {
    await supabase.from('webnixo_profiles_affilate').update({ password }).eq('email', email);
  }
  return res.json({ success: true });
});`;

code = code.replace(/app\.post\("\/api\/auth\/reset-password", async \(req, res\) => \{[\s\S]*?return res\.json\(\{ success: true \}\);\n\}\);/m, resetLogic);

fs.writeFileSync('server.ts', code);
