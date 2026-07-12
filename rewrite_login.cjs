const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const startIdx = code.indexOf('  if (!isLoggedIn) {');
const endIdx = code.indexOf('  return (\n    <div className="min-h-screen bg-slate-50 flex">');

if (startIdx !== -1 && endIdx !== -1) {
  const newLoginBlock = `  if (!isLoggedIn) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center p-4">
        {/* Background Layer */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=2029&auto=format&fit=crop')] bg-cover bg-center"></div>
          <div className="absolute inset-0 bg-indigo-900/60 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
        </div>

        {/* Foreground Content */}
        <div className="relative z-10 w-full max-w-md">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-black/20 mb-4">
              <Sparkles className="text-indigo-600 w-10 h-10" />
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight drop-shadow-md">WEBNIXO</h1>
            <p className="text-indigo-100 mt-2 font-medium">Affiliate Partner Network</p>
          </div>

          {/* Form Card */}
          <div className="bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/20">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                {verificationMode === 'none' && authMode === 'login' ? 'Welcome back' : ''}
                {verificationMode === 'none' && authMode === 'signup' ? 'Create an account' : ''}
                {(verificationMode === 'signup_otp' || verificationMode === 'forgot_otp') ? 'Check your email' : ''}
                {verificationMode === 'forgot_email' ? 'Reset password' : ''}
                {verificationMode === 'reset_password' ? 'Set new password' : ''}
              </h2>
              <p className="text-slate-500 text-sm">
                {verificationMode === 'none' && authMode === 'login' ? 'Enter your details to access your dashboard.' : ''}
                {verificationMode === 'none' && authMode === 'signup' ? 'Join our global affiliate program today.' : ''}
                {(verificationMode === 'signup_otp' || verificationMode === 'forgot_otp') ? 'We sent a 6-digit verification code.' : ''}
                {verificationMode === 'forgot_email' ? "Enter your email for a reset link." : ''}
                {verificationMode === 'reset_password' ? 'Please choose a strong password.' : ''}
              </p>
            </div>
            
            {verificationMode === 'none' && (
              <form onSubmit={handleAuth} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email address</label>
                  <input type="email" required value={emailInput} onChange={e => setEmailInput(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400" placeholder="name@company.com" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                  <input type="password" required value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400" placeholder="••••••••" />
                </div>
                
                {authMode === 'login' && (
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                      <span className="text-sm font-medium text-slate-600">Remember me</span>
                    </label>
                    <button type="button" onClick={() => setVerificationMode('forgot_email')} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">Forgot password?</button>
                  </div>
                )}
                
                <button type="submit" className="w-full bg-indigo-600 text-white py-3.5 rounded-xl hover:bg-indigo-700 transition-colors font-semibold shadow-lg shadow-indigo-600/20 text-base mt-4">
                  {authMode === 'login' ? 'Sign in to dashboard' : 'Create account'}
                </button>
                
                <div className="text-center pt-4 pb-2 border-t border-slate-100 mt-6">
                  {authMode === 'login' ? (
                    <p className="text-slate-600 text-sm font-medium">Don't have an account? <button type="button" onClick={() => { setAuthMode('signup'); setPasswordInput(''); }} className="text-indigo-600 font-bold hover:underline">Sign up</button></p>
                  ) : (
                    <p className="text-slate-600 text-sm font-medium">Already have an account? <button type="button" onClick={() => { setAuthMode('login'); setPasswordInput(''); }} className="text-indigo-600 font-bold hover:underline">Sign in</button></p>
                  )}
                </div>
              </form>
            )}

            {(verificationMode === 'signup_otp' || verificationMode === 'forgot_otp') && (
              <form onSubmit={handleVerifyOTP} className="space-y-5">
                {otpError && <div className="p-4 bg-red-50 text-red-700 text-sm font-medium rounded-xl border border-red-100 flex items-center gap-2"><span className="text-xl">⚠️</span> {otpError}</div>}
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 text-center">Verification Code</label>
                  <input type="text" value={otpInput} onChange={e => setOtpInput(e.target.value)} placeholder="000000" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-center tracking-[0.5em] text-3xl font-mono text-slate-900" maxLength={6} required />
                </div>
                
                <button type="submit" className="w-full bg-indigo-600 text-white py-3.5 rounded-xl hover:bg-indigo-700 transition-colors font-semibold shadow-lg shadow-indigo-600/20 text-base mt-2">
                  Verify Email
                </button>
                
                <div className="text-center pt-4">
                  <button type="button" onClick={() => setVerificationMode('none')} className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">Back to {authMode === 'login' ? 'sign in' : 'sign up'}</button>
                </div>
              </form>
            )}

            {verificationMode === 'forgot_email' && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                const forgotRes = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: forgotEmailInput.trim() }) });
                if (!forgotRes.ok) { return; }
                setVerificationMode('forgot_otp');
                handleSendOTP(forgotEmailInput, 'forgot_password');
              }} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email address</label>
                  <input type="email" value={forgotEmailInput} onChange={e => setForgotEmailInput(e.target.value)} placeholder="name@company.com" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400" required />
                </div>
                
                <button type="submit" className="w-full bg-indigo-600 text-white py-3.5 rounded-xl hover:bg-indigo-700 transition-colors font-semibold shadow-lg shadow-indigo-600/20 text-base mt-2">
                  Send reset link
                </button>
                
                <div className="text-center pt-4">
                  <button type="button" onClick={() => setVerificationMode('none')} className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">Back to sign in</button>
                </div>
              </form>
            )}

            {verificationMode === 'reset_password' && (
              <form onSubmit={(e) => { e.preventDefault(); completePasswordReset(); }} className="space-y-5">
                {otpError && <div className="p-4 bg-red-50 text-red-700 text-sm font-medium rounded-xl border border-red-100 flex items-center gap-2"><span className="text-xl">⚠️</span> {otpError}</div>}
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">New Password</label>
                  <input type="password" value={newPasswordInput} onChange={e => setNewPasswordInput(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Confirm Password</label>
                  <input type="password" value={confirmNewPasswordInput} onChange={e => setConfirmNewPasswordInput(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400" required />
                </div>
                
                <button type="submit" className="w-full bg-indigo-600 text-white py-3.5 rounded-xl hover:bg-indigo-700 transition-colors font-semibold shadow-lg shadow-indigo-600/20 text-base mt-2">
                  Update password
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );\n  }\n`;

  code = code.slice(0, startIdx) + newLoginBlock + code.slice(endIdx);
  fs.writeFileSync('src/App.tsx', code);
} else {
  console.log("Could not find blocks");
}
