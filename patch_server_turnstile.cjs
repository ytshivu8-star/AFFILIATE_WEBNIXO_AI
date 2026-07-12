const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const turnstileLogic = `
const verifyTurnstile = async (token, ip) => {
  if (!token) return { success: false, 'error-codes': ['missing-input-response'] };
  const secret = process.env.TURNSTILE_SECRET_KEY || "0x4AAAAAAD0Yht6iLBzaC63Jj_nmCLm5Iog";
  const formData = new FormData();
  formData.append('secret', secret);
  formData.append('response', token);
  formData.append('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return { success: false, 'error-codes': ['fetch-error'] };
  }
};

function logTurnstileEvent(req, endpoint, success, reason) {
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
`;

code = code.replace(/async function checkRateLimit/g, turnstileLogic + '\nasync function checkRateLimit');

const injectTurnstile = (endpoint, reqBodyDestructuring) => {
  const replacement = `
  const ip = getIP(req);
  const turnstileData = await verifyTurnstile(req.body.turnstileToken, ip);
  if (!turnstileData.success) {
    logTurnstileEvent(req, '${endpoint}', false, turnstileData['error-codes']?.join(', '));
    return res.status(403).json({ error: "Turnstile verification failed. Please try again." });
  }
  logTurnstileEvent(req, '${endpoint}', true);
  `;
  return replacement;
};

// Replace in each endpoint
code = code.replace(/app\.post\("\/api\/auth\/login", async \(req, res\) => \{[\s\S]*?const ip = getIP\(req\);/g, 
  `app.post("/api/auth/login", async (req, res) => {` + injectTurnstile('/api/auth/login'));

code = code.replace(/app\.post\("\/api\/auth\/signup", async \(req, res\) => \{[\s\S]*?const ip = getIP\(req\);/g, 
  `app.post("/api/auth/signup", async (req, res) => {` + injectTurnstile('/api/auth/signup'));

code = code.replace(/app\.post\("\/api\/auth\/verify-otp", async \(req, res\) => \{[\s\S]*?const ip = getIP\(req\);/g, 
  `app.post("/api/auth/verify-otp", async (req, res) => {` + injectTurnstile('/api/auth/verify-otp'));

code = code.replace(/app\.post\("\/api\/auth\/reset-password", async \(req, res\) => \{[\s\S]*?const ip = getIP\(req\);/g, 
  `app.post("/api/auth/reset-password", async (req, res) => {` + injectTurnstile('/api/auth/reset-password'));

code = code.replace(/app\.post\("\/api\/auth\/google-callback", async \(req, res\) => \{[\s\S]*?const ip = getIP\(req\);/g, 
  `app.post("/api/auth/google-callback", async (req, res) => {` + injectTurnstile('/api/auth/google-callback'));

code = code.replace(/app\.post\("\/api\/auth\/forgot-password", async \(req, res\) => \{[\s\S]*?const ip = getIP\(req\);/g, 
  `app.post("/api/auth/forgot-password", async (req, res) => {` + injectTurnstile('/api/auth/forgot-password'));

code = code.replace(/app\.post\("\/api\/send-otp", async \(req, res\) => \{[\s\S]*?try \{/g,
  `app.post("/api/send-otp", async (req, res) => {\n  try {\n` + injectTurnstile('/api/send-otp').replace(/return res.status\(403\).json\(\{ error:/, `return res.status(403).json({ success: false, error:`));

fs.writeFileSync('server.ts', code);
