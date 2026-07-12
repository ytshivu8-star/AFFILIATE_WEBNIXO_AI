const fs = require('fs');

const code = `import React, { useState, useEffect, useRef } from 'react';
import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { 
  Sparkles, MousePointerClick, Users, DollarSign, ArrowUpRight, 
  Award, FileText, Settings, CreditCard, LogOut, Shield, Menu, X, Check, Lock, UserCheck,
  ArrowLeft, ArrowRight, Copy, ShieldCheck, Mail, Key, RefreshCw
} from 'lucide-react';
import { UserProfile, PayoutDetails, AffiliateStats, LeaderboardEntry, ReferralEvent, PayoutHistoryItem } from './types';
import Dashboard from './components/Dashboard';
import AffiliateRegistration from './components/AffiliateRegistration';
import Leaderboard from './components/Leaderboard';
import MarketingResources from './components/MarketingResources';
import PayoutDetailsComponent from './components/PayoutDetails';
import ProfileSettings from './components/ProfileSettings';
import TermsAndConditions from './components/TermsAndConditions';
import AdminPortal from './components/AdminPortal';
import { 
  isSupabaseConfigured, supabase, syncProfileToSupabase, syncEventsToSupabase, 
  syncPayoutsToSupabase, loadProfileFromSupabase, loadEventsFromSupabase, 
  loadPayoutsFromSupabase, verifyOTPFromSupabase 
} from './lib/supabase';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [verificationMode, setVerificationMode] = useState<'none' | 'signup_otp' | 'forgot_email' | 'forgot_otp' | 'reset_password'>('none');
  const [otpCode, setOtpCode] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState('');
  const [otpStatusMsg, setOtpStatusMsg] = useState('');
  const [forgotEmailInput, setForgotEmailInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'resources' | 'payout' | 'leaderboard' | 'terms' | 'profile'>('dashboard');
  
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const turnstileRef = useRef<TurnstileInstance>(null);

  const [user, setUser] = useState<UserProfile>({
    id: \`user_\${Math.floor(1000 + Math.random() * 9000)}\`,
    email: '',
    fullName: '',
    phone: '',
    companyName: '',
    website: '',
    promoStrategy: '',
    country: 'India',
    isRegisteredAffiliate: false,
    referralCode: '',
    joinedAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  });

  const [payout, setPayout] = useState<PayoutDetails>({
    payoutMethod: 'upi', upiId: '', bankName: '', accountNumber: '', accountHolderName: '', ifscCode: ''
  });

  const [stats, setStats] = useState<AffiliateStats>({
    clicks: 0, signups: 0, sales: 0, commissionEarned: 0.00, unpaidCommission: 0.00, payoutStatus: 'None'
  });

  const [payoutHistory, setPayoutHistory] = useState<PayoutHistoryItem[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [events, setEvents] = useState<ReferralEvent[]>([]);

  useEffect(() => {
    const checkLogin = localStorage.getItem('wwebnixo_isLoggedIn');
    if (checkLogin === 'true') {
      setIsLoggedIn(true);
      const savedUser = localStorage.getItem('wwebnixo_affiliate_user');
      if (savedUser) setUser(JSON.parse(savedUser));
    }
  }, []);

  const resetTurnstile = () => {
    setTurnstileToken('');
    if (turnstileRef.current) turnstileRef.current.reset();
  };

  const handleSendOTP = async (email: string, purpose: 'register' | 'forgot_password', currentTurnstileToken?: string) => {
    setOtpLoading(true);
    setOtpError('');
    setOtpStatusMsg('');
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpCode(code);
    
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          toEmail: email, 
          otpCode: code, 
          purpose,
          turnstileToken: currentTurnstileToken || turnstileToken 
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOtpStatusMsg("Verification email sent.");
      } else {
        setOtpError(data.error || "Failed to send email");
      }
    } catch (err: any) {
      setOtpError("Network error.");
    }
    setOtpLoading(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) {
      alert("Please complete the security check.");
      return;
    }
    
    const cleanEmail = emailInput.trim();
    if (cleanEmail === 'shiva@webnixo.in' && passwordInput === '123456') {
      setIsAdminMode(true);
      setIsLoggedIn(true);
      localStorage.setItem('wwebnixo_isAdmin', 'true');
      localStorage.setItem('wwebnixo_isLoggedIn', 'true');
      resetTurnstile();
      return;
    }

    if (authMode === 'signup') {
      const signupRes = await fetch('/api/auth/signup', { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ email: cleanEmail, turnstileToken }) 
      });
      if (!signupRes.ok) {
        const errData = await signupRes.json();
        alert(errData.error || "Signup blocked.");
        resetTurnstile();
        return;
      }
      setVerificationMode('signup_otp');
      handleSendOTP(cleanEmail, 'register', turnstileToken);
      resetTurnstile();
      return;
    }

    // Login
    if (isSupabaseConfigured()) {
      try {
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password: passwordInput, turnstileToken })
        });
        if (!loginRes.ok) {
          const errData = await loginRes.json();
          alert(errData.error || "Login failed");
          resetTurnstile();
          return;
        }
        
        const remoteData = await loadProfileFromSupabase(cleanEmail);
        if (remoteData) {
          setUser(remoteData.profile);
          setStats(remoteData.stats);
          setPayout(remoteData.payout);
          setIsLoggedIn(true);
          localStorage.setItem('wwebnixo_isLoggedIn', 'true');
        } else {
          alert("Account not found.");
        }
      } catch (err) {
        console.error(err);
      }
    } else {
       setIsLoggedIn(true);
       setUser({ ...user, email: cleanEmail });
    }
    resetTurnstile();
  };

  const completePasswordReset = async () => {
    if (!turnstileToken) {
      setOtpError("Please complete the security check.");
      return;
    }
    if (newPasswordInput !== confirmNewPasswordInput) {
      setOtpError("Passwords do not match.");
      return;
    }
    const emailToReset = forgotEmailInput.trim();
    if (isSupabaseConfigured()) {
      try {
        const resetRes = await fetch('/api/auth/reset-password', { 
          method: 'POST', headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ email: emailToReset, password: newPasswordInput, turnstileToken }) 
        });
        if (!resetRes.ok) {
          const errData = await resetRes.json();
          setOtpError(errData.error || "Reset blocked");
          resetTurnstile();
          return;
        }
      } catch (err: any) {
         setOtpError(err.message);
         resetTurnstile();
         return;
      }
    }
    setVerificationMode('none');
    setAuthMode('login');
    resetTurnstile();
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) {
      setOtpError("Please complete the security check.");
      return;
    }
    const emailToVerify = verificationMode === 'signup_otp' ? emailInput : forgotEmailInput;
    const purposeStr = verificationMode === 'signup_otp' ? 'register' : 'forgot_password';
    
    if (isSupabaseConfigured()) {
      const res = await verifyOTPFromSupabase(emailToVerify, otpInput.trim(), purposeStr, turnstileToken);
      if (!res.success) {
        setOtpError(res.error || "Verification failed");
        resetTurnstile();
        return;
      }
    }
    
    if (verificationMode === 'signup_otp') {
      setIsLoggedIn(true);
      setUser({ ...user, email: emailInput });
      setVerificationMode('none');
    } else {
      setVerificationMode('reset_password');
    }
    resetTurnstile();
  };

  const logout = () => {
    setIsLoggedIn(false);
    setIsAdminMode(false);
    localStorage.removeItem('wwebnixo_isLoggedIn');
    setAuthMode('login');
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">
          <div className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900">WEBNIXO Affiliate</h1>
              <p className="text-slate-500 mt-2">Partner Network</p>
            </div>
            
            {verificationMode === 'none' && (
              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" required value={emailInput} onChange={e => setEmailInput(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input type="password" required value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                
                <div className="flex justify-center my-4">
                  <Turnstile siteKey="0x4AAAAAAD0Yhl8ycnaCVDbt" onSuccess={setTurnstileToken} ref={turnstileRef} />
                </div>
                
                <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium">
                  {authMode === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
                
                <div className="text-center mt-4 text-sm">
                  {authMode === 'login' ? (
                    <p>Don't have an account? <button type="button" onClick={() => setAuthMode('signup')} className="text-indigo-600 font-medium">Sign up</button></p>
                  ) : (
                    <p>Already have an account? <button type="button" onClick={() => setAuthMode('login')} className="text-indigo-600 font-medium">Sign in</button></p>
                  )}
                  {authMode === 'login' && (
                    <p className="mt-2"><button type="button" onClick={() => setVerificationMode('forgot_email')} className="text-slate-500">Forgot Password?</button></p>
                  )}
                </div>
              </form>
            )}

            {(verificationMode === 'signup_otp' || verificationMode === 'forgot_otp') && (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <h3 className="text-lg font-medium text-center">Enter Verification Code</h3>
                {otpError && <div className="text-red-500 text-sm text-center">{otpError}</div>}
                <input type="text" value={otpInput} onChange={e => setOtpInput(e.target.value)} placeholder="6-digit code" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-center tracking-widest text-lg" maxLength={6} required />
                <div className="flex justify-center my-4">
                  <Turnstile siteKey="0x4AAAAAAD0Yhl8ycnaCVDbt" onSuccess={setTurnstileToken} ref={turnstileRef} />
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium">Verify Code</button>
                <button type="button" onClick={() => setVerificationMode('none')} className="w-full text-slate-500 mt-2">Cancel</button>
              </form>
            )}

            {verificationMode === 'forgot_email' && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!turnstileToken) { alert('Security check required'); return; }
                const forgotRes = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: forgotEmailInput.trim(), turnstileToken }) });
                if (!forgotRes.ok) { resetTurnstile(); return; }
                setVerificationMode('forgot_otp');
                handleSendOTP(forgotEmailInput, 'forgot_password', turnstileToken);
                resetTurnstile();
              }} className="space-y-4">
                <h3 className="text-lg font-medium text-center">Reset Password</h3>
                <input type="email" value={forgotEmailInput} onChange={e => setForgotEmailInput(e.target.value)} placeholder="Email Address" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
                <div className="flex justify-center my-4">
                  <Turnstile siteKey="0x4AAAAAAD0Yhl8ycnaCVDbt" onSuccess={setTurnstileToken} ref={turnstileRef} />
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium">Send Code</button>
                <button type="button" onClick={() => setVerificationMode('none')} className="w-full text-slate-500 mt-2">Cancel</button>
              </form>
            )}

            {verificationMode === 'reset_password' && (
              <form onSubmit={(e) => { e.preventDefault(); completePasswordReset(); }} className="space-y-4">
                <h3 className="text-lg font-medium text-center">New Password</h3>
                {otpError && <div className="text-red-500 text-sm text-center">{otpError}</div>}
                <input type="password" value={newPasswordInput} onChange={e => setNewPasswordInput(e.target.value)} placeholder="New Password" className="w-full px-4 py-2 border rounded-lg" required />
                <input type="password" value={confirmNewPasswordInput} onChange={e => setConfirmNewPasswordInput(e.target.value)} placeholder="Confirm Password" className="w-full px-4 py-2 border rounded-lg" required />
                <div className="flex justify-center my-4">
                  <Turnstile siteKey="0x4AAAAAAD0Yhl8ycnaCVDbt" onSuccess={setTurnstileToken} ref={turnstileRef} />
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium">Save Password</button>
              </form>
            )}
            
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar placeholder */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex min-h-screen relative p-4">
        <h2 className="text-xl font-bold mb-8 tracking-tight">WEBNIXO</h2>
        <nav className="space-y-2 flex-1">
          <button onClick={() => setActiveTab('dashboard')} className={\`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 \${activeTab === 'dashboard' ? 'bg-indigo-600' : 'hover:bg-slate-800'}\`}><MousePointerClick size={18}/> Dashboard</button>
          {!isAdminMode && (
            <>
              <button onClick={() => setActiveTab('resources')} className={\`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 \${activeTab === 'resources' ? 'bg-indigo-600' : 'hover:bg-slate-800'}\`}><Sparkles size={18}/> Resources</button>
              <button onClick={() => setActiveTab('payout')} className={\`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 \${activeTab === 'payout' ? 'bg-indigo-600' : 'hover:bg-slate-800'}\`}><DollarSign size={18}/> Payout</button>
              <button onClick={() => setActiveTab('profile')} className={\`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 \${activeTab === 'profile' ? 'bg-indigo-600' : 'hover:bg-slate-800'}\`}><Settings size={18}/> Profile</button>
            </>
          )}
          {isAdminMode && (
             <button onClick={() => setActiveTab('admin')} className={\`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 \${activeTab === 'admin' ? 'bg-indigo-600' : 'hover:bg-slate-800'}\`}><Shield size={18}/> Admin Portal</button>
          )}
        </nav>
        <button onClick={logout} className="mt-auto flex items-center gap-3 text-slate-400 hover:text-white px-4 py-2"><LogOut size={18}/> Logout</button>
      </aside>

      <main className="flex-1 max-w-full overflow-hidden flex flex-col min-h-screen">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center px-4 md:px-8 justify-between">
           <div className="font-semibold text-slate-800">Affiliate Portal</div>
           <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-600">{user.email}</span>
           </div>
        </header>
        <div className="p-4 md:p-8 flex-1 overflow-auto">
          {activeTab === 'dashboard' && (isAdminMode ? <div>Admin Dashboard (Select Admin Portal Tab)</div> : <Dashboard user={user} stats={stats} chartData={chartData} events={events} />)}
          {activeTab === 'resources' && <MarketingResources user={user} />}
          {activeTab === 'payout' && <PayoutDetailsComponent user={user} payout={payout} setPayout={setPayout} payoutHistory={payoutHistory} saveState={() => {}} />}
          {activeTab === 'profile' && <ProfileSettings user={user} setUser={setUser} saveState={() => {}} />}
          {activeTab === 'admin' && isAdminMode && <AdminPortal />}
        </div>
      </main>
    </div>
  );
}
`
fs.writeFileSync('src/App.tsx', code);
