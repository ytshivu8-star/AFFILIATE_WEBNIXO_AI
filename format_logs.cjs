const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const logFn = `
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
`;

code = code.replace(`const getIP = (req) => {`, `${logFn}\nconst getIP = (req) => {`);

// Now replace checkRateLimit logging:
code = code.replace(`console.warn(\`[Security] Rate limit exceeded for \${key}. Count: \${count}\`);`, 
                    `// Handled by endpoint now`);

// Update login:
code = code.replace(`console.warn(\`[Security] Failed login attempt for \${email} from IP \${ip}\`);`, 
                    `logSecurityEvent(req, '/api/auth/login', email, 'Blocked', 'Invalid credentials');`);
code = code.replace(`console.log(\`[Security] Successful login for \${email} from IP \${ip}\`);`,
                    `logSecurityEvent(req, '/api/auth/login', email, 'Allowed', 'Success');`);
code = code.replace(`if (!rl.allowed) return res.status(429).json({ error: "Too many login attempts. Please try again in 15 minutes." });`,
                    `if (!rl.allowed) { logSecurityEvent(req, '/api/auth/login', email, 'Blocked', 'Rate limit exceeded (5/15m)'); return res.status(429).json({ error: "Too many login attempts. Please try again in 15 minutes." }); }`);

// Update signup:
code = code.replace(`if (!rl.allowed) return res.status(429).json({ error: "Too many signup attempts. Please try again later." });`,
                    `if (!rl.allowed) { logSecurityEvent(req, '/api/auth/signup', req.body.email, 'Blocked', 'Rate limit exceeded (3/1h)'); return res.status(429).json({ error: "Too many signup attempts. Please try again later." }); }`);
code = code.replace(`console.log(\`[Security] Allowed signup from IP \${ip}\`);`,
                    `logSecurityEvent(req, '/api/auth/signup', req.body.email, 'Allowed', 'Success');`);

// Update verify-otp:
code = code.replace(`if (!rl.allowed) {
    if (supabase) await supabase.from('webnixo_otps_affilate').delete().eq('email', email).eq('purpose', purpose);
    console.warn(\`[Security] OTP verification locked out for \${email}\`);
    return res.status(429).json({ error: "Too many incorrect attempts. OTP invalidated. Request a new one." });
  }`, 
`if (!rl.allowed) {
    if (supabase) await supabase.from('webnixo_otps_affilate').delete().eq('email', email).eq('purpose', purpose);
    logSecurityEvent(req, '/api/auth/verify-otp', email, 'Blocked', 'Rate limit exceeded (5/15m) - OTP invalidated');
    return res.status(429).json({ error: "Too many incorrect attempts. OTP invalidated. Request a new one." });
  }`);

code = code.replace(`console.warn(\`[Security] Invalid OTP attempt for \${email}\`);`,
                    `logSecurityEvent(req, '/api/auth/verify-otp', email, 'Blocked', 'Incorrect security code');`);
code = code.replace(`console.log(\`[Security] OTP successfully verified for \${email} (\${purpose})\`);`,
                    `logSecurityEvent(req, '/api/auth/verify-otp', email, 'Allowed', 'Success');`);
code = code.replace(`return res.status(400).json({ error: "OTP expired. Please request a new one." });`,
                    `logSecurityEvent(req, '/api/auth/verify-otp', email, 'Blocked', 'OTP expired'); return res.status(400).json({ error: "OTP expired. Please request a new one." });`);

// Update send-otp inside /api/send-otp
code = code.replace(`console.warn(\`[Security] Blocked forgot password request for \${toEmail} (limit reached)\`);`,
                    `logSecurityEvent(req, '/api/send-otp (forgot)', toEmail, 'Blocked', 'Rate limit exceeded (3/1h)');`);
code = code.replace(`console.warn(\`[Security] Blocked resend verification email for \${toEmail} (limit reached)\`);`,
                    `logSecurityEvent(req, '/api/send-otp (resend)', toEmail, 'Blocked', 'Rate limit exceeded (3/1h)');`);

code = code.replace(`if (!emailLimit.allowed) return res.status(429).json({ success: false, error: "Too many OTP requests for this email. Please try again later." });`,
                    `if (!emailLimit.allowed) { logSecurityEvent(req, '/api/send-otp', toEmail, 'Blocked', 'Rate limit exceeded per email (3/10m)'); return res.status(429).json({ success: false, error: "Too many OTP requests for this email. Please try again later." }); }`);

code = code.replace(`if (!ipLimit.allowed) return res.status(429).json({ success: false, error: "Too many OTP requests. Please try again later." });`,
                    `if (!ipLimit.allowed) { logSecurityEvent(req, '/api/send-otp', toEmail, 'Blocked', 'Rate limit exceeded per IP (10/1h)'); return res.status(429).json({ success: false, error: "Too many OTP requests. Please try again later." }); }`);

fs.writeFileSync('server.ts', code);
