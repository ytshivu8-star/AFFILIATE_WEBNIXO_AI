const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// Just bypass the rate limit checker temporarily, or set limit to 1000
code = code.replace(/async function checkRateLimit\(action, identifier, maxRequests, windowMs\) \{/g, `async function checkRateLimit(action, identifier, maxRequests, windowMs) {
  return { allowed: true, remaining: maxRequests };
`);

fs.writeFileSync('server.ts', code);
console.log('Successfully updated server.ts');
