import React, { useState, useEffect, useRef } from 'react';
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
  const [resetToken, setResetToken] = useState("");
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
    id: `user_${Math.floor(1000 + Math.random() * 9000)}`,
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

  const leaderboard = [
    { name: "Sarah M.", earnings: 4500, referrals: 150 },
    { name: "John D.", earnings: 3200, referrals: 120 },
    { name: "Alex K.", earnings: 2800, referrals: 95 }
  ];

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

    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          toEmail: email, 
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
    } catch (err) {
      setOtpError("Network error.");
    }
    setOtpLoading(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    
    
    // Check for admin credentials
    const storedAdminPass = localStorage.getItem('webnixo_admin_password') || (import.meta as any).env.VITE_DEFAULT_ADMIN_PASSWORD;
    const cleanEmail = emailInput.trim();

    if (cleanEmail === 'shiva@webnixo.in' && passwordInput === storedAdminPass) {
      setIsAdminMode(true);
      setIsLoggedIn(true);
      localStorage.setItem('wwebnixo_isAdmin', 'true');
      localStorage.setItem('wwebnixo_isLoggedIn', 'true');
      resetTurnstile();
      return;
    }

    if (!cleanEmail) {
      setOtpError("Email is required.");
      return;
    }
    if (passwordInput.length < 6) {
      setOtpError("Password must be at least 6 characters.");
      return;
    }
    if (cleanEmail && passwordInput.length >= 6) {
      if (authMode === 'signup') {
        const signupRes = await fetch('/api/auth/signup', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ email: cleanEmail, turnstileToken }) 
        });
        if (!signupRes.ok) {
          const errData = await signupRes.json();
          setOtpError(errData.error || "Signup blocked.");
          resetTurnstile();
          return;
        }
        
        // Trigger registration OTP verification
        setVerificationMode('signup_otp');
        handleSendOTP(cleanEmail, 'register', turnstileToken);
        resetTurnstile();
        return;
      }

      const password = passwordInput;
      
      const authenticateUser = async () => {
        let finalUser: UserProfile = {
          id: user.id || `user_${Math.floor(1000 + Math.random() * 9000)}`,
          email: cleanEmail,
          password: password,
          fullName: user.fullName || cleanEmail.split('@')[0],
          phone: user.phone || '',
          companyName: user.companyName || '',
          website: user.website || '',
          promoStrategy: user.promoStrategy || '',
          country: user.country || 'India',
          isRegisteredAffiliate: false,
          referralCode: user.referralCode || '',
          joinedAt: user.joinedAt || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        };
        let finalStats = stats;
        let finalPayout = payout;
        let finalEvents = events;
        let finalHistory = payoutHistory;

        if (isSupabaseConfigured()) {
          try {
            const loginRes = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: cleanEmail, password: password, turnstileToken })
            });
            const dataRes = await loginRes.json();
            if (!loginRes.ok) {
              setOtpError(dataRes.error || "Login failed");
              resetTurnstile();
              return;
            }
            if (dataRes.session && isSupabaseConfigured()) {
              await supabase.auth.setSession({ access_token: dataRes.session.access_token, refresh_token: dataRes.session.refresh_token });
            }
            
            const remoteData = await loadProfileFromSupabase(cleanEmail);
            if (remoteData) {
              finalUser = remoteData.profile;
              finalStats = remoteData.stats;
              finalPayout = remoteData.payout;
              const remoteEvents = await loadEventsFromSupabase(cleanEmail);
              if (remoteEvents) finalEvents = remoteEvents;
              const remotePayouts = await loadPayoutsFromSupabase(cleanEmail);
              if (remotePayouts) finalHistory = remotePayouts;
              
              localStorage.setItem('webnixo_user', JSON.stringify(finalUser));
            } else {
              setOtpError("No affiliate account found with this email on Supabase. Please sign up.");
              resetTurnstile();
              return;
            }
          } catch (err: any) {
            console.error("Supabase auth error:", err);
            resetTurnstile();
            return;
          }
        } else {
          // Local storage check
          const globalUsersStr = localStorage.getItem('webnixo_global_users');
          if (globalUsersStr) {
            const globalUsersList: any[] = JSON.parse(globalUsersStr);
            const foundUser = globalUsersList.find(u => u.email === cleanEmail);
            if (foundUser) {
              if (foundUser.password !== password) {
                setOtpError("The password entered is incorrect.");
                resetTurnstile();
                return;
              }
              finalUser = { ...finalUser, ...foundUser };
            } else {
              setOtpError("No affiliate account found locally. Please sign up.");
              resetTurnstile();
              return;
            }
          } else {
            if (cleanEmail !== user.email || password !== user.password) {
              setOtpError("No local fallback account found. Please sign up.");
              resetTurnstile();
              return;
            }
          }
        }

        setUser(finalUser);
        setStats(finalStats);
        setPayout(finalPayout);
        setEvents(finalEvents);
        setPayoutHistory(finalHistory);
        setIsLoggedIn(true);
        localStorage.setItem('wwebnixo_isLoggedIn', 'true');
        resetTurnstile();
      };
      
      authenticateUser();
    }
  };

  const completePasswordReset = async () => {
    
    if (newPasswordInput.length < 6) {
      setOtpError("Password must be at least 6 characters.");
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
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ email: emailToReset, password: newPasswordInput, turnstileToken, resetToken }) 
        });
        if (!resetRes.ok) {
          const errData = await resetRes.json();
          setOtpError(errData.error || "Reset blocked");
          resetTurnstile();
          return;
        }
        const error = null; 
        if (error) {
          console.error("Supabase password reset error:", error);
        }
      } catch (err: any) {
         setOtpError(err.message);
         resetTurnstile();
         return;
      }
    } else {
        const globalUsersStr = localStorage.getItem('webnixo_global_users');
        if (globalUsersStr) {
          const globalUsersList: any[] = JSON.parse(globalUsersStr);
          const updatedGlobalUsers = globalUsersList.map(u => {
            if (u.email === emailToReset) {
              return { ...u, password: newPasswordInput };
            }
            return u;
          });
          localStorage.setItem('webnixo_global_users', JSON.stringify(updatedGlobalUsers));
        }
        if (user.email === emailToReset) {
          setUser(prev => ({ ...prev, password: newPasswordInput }));
        }
    }

    setVerificationMode('none');
    setAuthMode('login');
    setEmailInput(emailToReset);
    setPasswordInput(newPasswordInput);
    setOtpInput('');
        setNewPasswordInput('');
    setConfirmNewPasswordInput('');
    setOtpError('');
    setOtpStatusMsg('');
    resetTurnstile();
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToVerify = verificationMode === 'signup_otp' ? emailInput : forgotEmailInput;
    const purposeStr = verificationMode === 'signup_otp' ? 'register' : 'forgot_password';
    
    // We bypassed turnstile on server, so we just call the api directly
    let data: any = {};
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToVerify, otpCode: otpInput.trim(), purpose: purposeStr, password: passwordInput })
      });
      data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || "Verification failed");
        return;
      }
      if (data.session && isSupabaseConfigured()) {
        await supabase.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
      }
    } catch (err) {
      // ignore
    }
    
    if (verificationMode === 'signup_otp') {
      if (!isSupabaseConfigured()) {
         const globalUsersStr = localStorage.getItem('webnixo_global_users') || "[]";
         const globalUsers = JSON.parse(globalUsersStr);
         if (!globalUsers.find((u: any) => u.email === emailInput)) {
            globalUsers.push({ email: emailInput, password: passwordInput });
            localStorage.setItem('webnixo_global_users', JSON.stringify(globalUsers));
         }
      }
      setIsLoggedIn(true);
      setUser({ ...user, email: emailInput });
      setVerificationMode('none');
      localStorage.setItem('wwebnixo_isLoggedIn', 'true');
    } else {
      if (data.resetToken) setResetToken(data.resetToken);
      setVerificationMode('reset_password');
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    setIsAdminMode(false);
    localStorage.removeItem('wwebnixo_isLoggedIn');
    setAuthMode('login');
  };

  if (!isLoggedIn) {
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
                {otpError && <div className="p-4 bg-red-50 text-red-700 text-sm font-medium rounded-xl border border-red-100 flex items-center gap-2"><span className="text-xl">⚠️</span> {otpError}</div>}
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
                
                {authMode === 'signup' && (
                  <div className="pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" required className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                      <span className="text-sm font-medium text-slate-600">I agree to the <a href="#" className="text-indigo-600 hover:underline">Terms and Conditions</a></span>
                    </label>
                  </div>
                )}
                
                <button type="submit" className="w-full bg-indigo-600 text-white py-3.5 rounded-xl hover:bg-indigo-700 transition-colors font-semibold shadow-lg shadow-indigo-600/20 text-base mt-4">
                  {authMode === 'login' ? 'Sign in to dashboard' : 'Create account'}
                </button>
                <div className="mt-4 flex justify-center">
                  <Turnstile siteKey={(import.meta as any).env.VITE_TURNSTILE_SITE_KEY || ''} onSuccess={setTurnstileToken} ref={turnstileRef} />
                </div>
                
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
                <div className="mt-4 flex justify-center">
                  <Turnstile siteKey={(import.meta as any).env.VITE_TURNSTILE_SITE_KEY || ''} onSuccess={setTurnstileToken} ref={turnstileRef} />
                </div>
                
                <div className="text-center pt-4">
                  <button type="button" onClick={() => setVerificationMode('none')} className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">Back to {authMode === 'login' ? 'sign in' : 'sign up'}</button>
                </div>
              </form>
            )}

            {verificationMode === 'forgot_email' && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setOtpError('');
                const forgotRes = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: forgotEmailInput.trim() }) });
                if (!forgotRes.ok) { const errData = await forgotRes.json(); setOtpError(errData.error || "Request blocked"); return; }

                setVerificationMode('forgot_otp');
                handleSendOTP(forgotEmailInput, 'forgot_password');
              }} className="space-y-5">
                {otpError && <div className="p-4 bg-red-50 text-red-700 text-sm font-medium rounded-xl border border-red-100 flex items-center gap-2"><span className="text-xl">⚠️</span> {otpError}</div>}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email address</label>
                  <input type="email" value={forgotEmailInput} onChange={e => setForgotEmailInput(e.target.value)} placeholder="name@company.com" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400" required />
                </div>
                
                <button type="submit" className="w-full bg-indigo-600 text-white py-3.5 rounded-xl hover:bg-indigo-700 transition-colors font-semibold shadow-lg shadow-indigo-600/20 text-base mt-2">
                  Send reset link
                </button>
                <div className="mt-4 flex justify-center">
                  <Turnstile siteKey={(import.meta as any).env.VITE_TURNSTILE_SITE_KEY || ''} onSuccess={setTurnstileToken} ref={turnstileRef} />
                </div>
                
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
                <div className="mt-4 flex justify-center">
                  <Turnstile siteKey={(import.meta as any).env.VITE_TURNSTILE_SITE_KEY || ''} onSuccess={setTurnstileToken} ref={turnstileRef} />
                </div>
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
          <button onClick={() => setActiveTab('dashboard')} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 ${activeTab === 'dashboard' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><MousePointerClick size={18}/> Dashboard</button>
          {!isAdminMode && (
            <>
              <button onClick={() => setActiveTab('leaderboard')} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 ${activeTab === 'leaderboard' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><Award size={18}/> Leaderboard</button>
              <button onClick={() => setActiveTab('resources')} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 ${activeTab === 'resources' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><Sparkles size={18}/> Resources</button>
              <button onClick={() => setActiveTab('payout')} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 ${activeTab === 'payout' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><DollarSign size={18}/> Payout</button>
              <button onClick={() => setActiveTab('profile')} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 ${activeTab === 'profile' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><Settings size={18}/> Profile</button>
              <button onClick={() => setActiveTab('terms')} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 ${activeTab === 'terms' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><FileText size={18}/> Terms & Conditions</button>
            </>
          )}
          {isAdminMode && (
             <button onClick={() => setActiveTab('admin')} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 ${activeTab === 'admin' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><Shield size={18}/> Admin Portal</button>
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
        <div className="p-4 md:p-8 pb-20 md:pb-8 flex-1 overflow-auto">
          {activeTab === 'dashboard' && (isAdminMode ? <div>Admin Dashboard (Select Admin Portal Tab)</div> : <Dashboard user={user} stats={stats} chartData={chartData} events={events} onUpdateUser={(data) => setUser({ ...user, ...data })} onNavigate={setActiveTab as any} />)}
          {activeTab === 'leaderboard' && <Leaderboard entries={leaderboard.map((e,i) => ({rank: i+1, name: e.name, sales: e.referrals, commission: e.earnings}))} currentUserSales={stats.sales} currentUserCommission={stats.commissionEarned} currentUserName={user.fullName} />}
          {activeTab === 'resources' && <MarketingResources referralCode={user.referralCode} />}
          {activeTab === 'payout' && <PayoutDetailsComponent initialDetails={payout} onSave={setPayout} unpaidCommission={stats.unpaidCommission} payoutHistory={payoutHistory} onRequestPayout={() => alert("Payout request submitted. WEBNIXO team will process it shortly.")} />}
          {activeTab === 'profile' && <ProfileSettings user={user} onUpdateUser={(data) => setUser({ ...user, ...data })} />}
          {activeTab === 'terms' && <TermsAndConditions />}
          {activeTab === 'admin' && isAdminMode && <AdminPortal onLogout={logout} />}
        </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 flex items-center justify-around p-2 text-xs">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center p-2 ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-500'}`}>
          <MousePointerClick size={20} className="mb-1" />
          <span>Dash</span>
        </button>
        <button onClick={() => setActiveTab('leaderboard')} className={`flex flex-col items-center p-2 ${activeTab === 'leaderboard' ? 'text-indigo-600' : 'text-slate-500'}`}>
          <Award size={20} className="mb-1" />
          <span>Ranks</span>
        </button>
        <button onClick={() => setActiveTab('resources')} className={`flex flex-col items-center p-2 ${activeTab === 'resources' ? 'text-indigo-600' : 'text-slate-500'}`}>
          <Sparkles size={20} className="mb-1" />
          <span>Tools</span>
        </button>
        <button onClick={() => setActiveTab('payout')} className={`flex flex-col items-center p-2 ${activeTab === 'payout' ? 'text-indigo-600' : 'text-slate-500'}`}>
          <DollarSign size={20} className="mb-1" />
          <span>Payouts</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center p-2 ${activeTab === 'profile' ? 'text-indigo-600' : 'text-slate-500'}`}>
          <Settings size={20} className="mb-1" />
          <span>Profile</span>
        </button>
      </nav>

      </main>
    </div>
  );
}
