const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace alert(...) with setOtpError(...) and handle Auth error states
code = code.replace(/alert\((.*?)\)/g, (match, p1) => {
  return `setOtpError(${p1})`;
});

// Clear otpError at the start of handleAuth
code = code.replace(
  `const handleAuth = async (e: React.FormEvent) => {\n    e.preventDefault();`,
  `const handleAuth = async (e: React.FormEvent) => {\n    e.preventDefault();\n    setOtpError('');`
);

// Display otpError in the first form
code = code.replace(
  `{verificationMode === 'none' && (\n              <form onSubmit={handleAuth} className="space-y-5">`,
  `{verificationMode === 'none' && (\n              <form onSubmit={handleAuth} className="space-y-5">\n                {otpError && <div className="p-4 bg-red-50 text-red-700 text-sm font-medium rounded-xl border border-red-100 flex items-center gap-2"><span className="text-xl">⚠️</span> {otpError}</div>}`
);

// If password is too short, show error
code = code.replace(
  `if (cleanEmail && passwordInput.length >= 6) {`,
  `if (!cleanEmail) {\n      setOtpError("Email is required.");\n      return;\n    }\n    if (passwordInput.length < 6) {\n      setOtpError("Password must be at least 6 characters.");\n      return;\n    }\n    if (cleanEmail && passwordInput.length >= 6) {`
);

// Make sure to add `otpError` display to the forgot password form as well
code = code.replace(
  `{verificationMode === 'forgot_email' && (\n              <form onSubmit={async (e) => {`,
  `{verificationMode === 'forgot_email' && (\n              <form onSubmit={async (e) => {`
);
// Wait, already handled in forgot_email form? Let's check
code = code.replace(
  `e.preventDefault();\n                const forgotRes`,
  `e.preventDefault();\n                setOtpError('');\n                const forgotRes`
);

// Insert error display in forgot_email form
code = code.replace(
  `{verificationMode === 'forgot_email' && (\n              <form onSubmit={async (e) => {\n                e.preventDefault();\n                setOtpError('');\n                const forgotRes = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: forgotEmailInput.trim() }) });\n                if (!forgotRes.ok) { return; }`,
  `{verificationMode === 'forgot_email' && (\n              <form onSubmit={async (e) => {\n                e.preventDefault();\n                setOtpError('');\n                const forgotRes = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: forgotEmailInput.trim() }) });\n                if (!forgotRes.ok) { const errData = await forgotRes.json(); setOtpError(errData.error || "Request blocked"); return; }\n`
);
code = code.replace(
  `className="space-y-5">\n                <div>\n                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email address</label>`,
  `className="space-y-5">\n                {otpError && <div className="p-4 bg-red-50 text-red-700 text-sm font-medium rounded-xl border border-red-100 flex items-center gap-2"><span className="text-xl">⚠️</span> {otpError}</div>}\n                <div>\n                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email address</label>`
);

fs.writeFileSync('src/App.tsx', code);
