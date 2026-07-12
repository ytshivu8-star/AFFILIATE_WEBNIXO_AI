const completePasswordReset = async () => {
    if (!turnstileToken) {
      setOtpError("Please complete the security check.");
      return;
    }
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
          body: JSON.stringify({ email: emailToReset, password: newPasswordInput, turnstileToken }) 
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
    setOtpCode('');
    setNewPasswordInput('');
    setConfirmNewPasswordInput('');
    setBackupOtpDelivery(null);
    setOtpError('');
    setOtpStatusMsg('');
    resetTurnstile();
  };

  const handleSendOTP = async (email: string, purpose: 'register' | 'forgot_password', currentTurnstileToken?: string) => {
    setOtpLoading(true);
    setOtpError('');
    setOtpStatusMsg('');
    const code = generateOTP();
    setOtpCode(code);
    
    // Simulate sending real email via server (with turnstile)
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
        setOtpStatusMsg("Verification email sent securely.");
      } else {
        console.error("Failed to send OTP email:", data.error);
        if (data.error && data.error.includes("Turnstile")) {
          setOtpError("Security check failed. Please refresh the page and try again.");
        } else {
          setBackupOtpDelivery({
            visible: true,
            otp: code,
            type: 'simulated',
            email
          });
          setOtpError("Email delivery system failed. We've provided your code locally as a fallback.");
        }
      }
    } catch (err: any) {
      console.error("Error calling /api/send-otp", err);
      setBackupOtpDelivery({
        visible: true,
        otp: code,
        type: 'simulated',
        email
      });
      setOtpError("Network error. We've provided your code locally as a fallback.");
    }
    
    setResendCooldown(60);
    setOtpLoading(false);
  };

  import React, { useState, useEffect, useRef } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
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
import { sendOTPEmail } from './lib/resend';
import { 
  isSupabaseConfigured, 
  supabase, 
  syncProfileToSupabase, 
  syncEventsToSupabase, 
  syncPayoutsToSupabase, 
  loadProfileFromSupabase, 
  loadEventsFromSupabase, 
  loadPayoutsFromSupabase, 
  loadSettingsFromSupabase, 
  checkSupabaseConnection,
  supabaseErrorState,
  storeOTPInSupabase,
  verifyOTPFromSupabase
} from './lib/supabase';

export default function App() {
  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // OTP Verification and Password Reset states
  const [verificationMode, setVerificationMode] = useState<'none' | 'signup_otp' | 'forgot_email' | 'forgot_otp' | 'reset_password'>('none');
  const [otpCode, setOtpCode] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState('');
  const [otpStatusMsg, setOtpStatusMsg] = useState('');
  const [backupOtpDelivery, setBackupOtpDelivery] = useState<{ visible: boolean; otp: string; type: 'real' | 'simulated'; email: string } | null>(null);
  const [forgotEmailInput, setForgotEmailInput] = useState('');

  // Sidebar mobile control
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Main Active Tab after registration
  const [activeTab, setActiveTab] = useState<'dashboard' | 'resources' | 'payout' | 'leaderboard' | 'terms' | 'profile'>('dashboard');

  // User details
  const [user, setUser] = useState<UserProfile>({
    id: `user_${Math.floor(1000 + Math.random() * 9000)}`,
    email: '',
    fullName: '',
    phone: '',
    companyName: '',
    website: '',
    promoStrategy: '',
    country: 'India',
    isRegisteredAffiliate: false, // Starts as false so they can register
    referralCode: '',
    joinedAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  });

  // Payout preference
  const [payout, setPayout] = useState<PayoutDetails>({
    payoutMethod: 'upi',
    upiId: '',
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    ifscCode: ''
  });

  // Performance stats
  const [stats, setStats] = useState<AffiliateStats>({
    clicks: 0,
    signups: 0,
    sales: 0,
    commissionEarned: 0.00,
    unpaidCommission: 0.00,
    payoutStatus: 'None'
  });

  // Payout history
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistoryItem[]>([]);

  // Daily Chart Trend (last 7 days)
  const [chartData, setChartData] = useState<any[]>([
    { day: 'Mon', clicks: 0, signups: 0, sales: 0, revenue: 0 },
    { day: 'Tue', clicks: 0, signups: 0, sales: 0, revenue: 0 },
    { day: 'Wed', clicks: 0, signups: 0, sales: 0, revenue: 0 },
    { day: 'Thu', clicks: 0, signups: 0, sales: 0, revenue: 0 },
    { day: 'Fri', clicks: 0, signups: 0, sales: 0, revenue: 0 },
    { day: 'Sat', clicks: 0, signups: 0, sales: 0, revenue: 0 },
    { day: 'Sun (Today)', clicks: 0, signups: 0, sales: 0, revenue: 0 }
  ]);

  // Activity stream logs
  const [events, setEvents] = useState<ReferralEvent[]>([]);

  // Leaderboard data
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Dynamically update the genuine leaderboard from real local storage users
  useEffect(() => {
    try {
      const globalUsersStr = localStorage.getItem('webnixo_global_users');
      let list: any[] = [];
      if (globalUsersStr) {
        list = JSON.parse(globalUsersStr);
      }
      
      // Filter out admin
      list = list.filter(u => u.email !== 'shiva@webnixo.in');

      // Map profiles to LeaderboardEntry structure
      let entries: LeaderboardEntry[] = list.map((u: any) => ({
        rank: 0,
        name: u.fullName || u.email.split('@')[0],
        sales: u.sales || 0,
        commission: u.commissionEarned || 0,
        isCurrentUser: u.email.toLowerCase() === user.email.toLowerCase()
      }));

      // If current user is registered but not in global users yet, add them manually
      if (user.isRegisteredAffiliate && user.email && user.email !== 'shiva@webnixo.in') {
        const hasUser = entries.some(e => e.isCurrentUser);
        if (!hasUser) {
          entries.push({
            rank: 0,
            name: user.fullName || 'You',
            sales: stats.sales,
            commission: stats.commissionEarned,
            isCurrentUser: true
          });
        }
      }

      // Sort by sales descending, then by commission descending
      entries.sort((a, b) => b.sales - a.sales || b.commission - a.commission);
      
      // Assign dynamic rank
      const rankedEntries = entries.map((e, idx) => ({ ...e, rank: idx + 1 }));
      setLeaderboard(rankedEntries);
    } catch (e) {
      console.error("Error calculating dynamic leaderboard", e);
    }
  }, [activeTab, user, stats]);

  // Resend diagnostic configuration status
  const [resendStatus, setResendStatus] = useState<{ isCustomKey: boolean; maskedKey: string; fromEmail: string } | null>(null);

  useEffect(() => {
    fetch('/api/resend-status')
      .then(res => res.json())
      .then(data => setResendStatus(data))
      .catch(err => console.warn("Error fetching Resend status:", err));
  }, []);

  const navigate = useNavigate();
  const location = useLocation();

  // Dynamic Browser Routing and State Synchronization
  useEffect(() => {
    const syncRouteFromPath = () => {
      const path = location.pathname;
      const cachedIsLoggedIn = localStorage.getItem('wwebnixo_isLoggedIn') === 'true';
      const cachedIsAdmin = localStorage.getItem('wwebnixo_isAdmin') === 'true';

      if (path === '/login' || path === '/') {
        if (!cachedIsLoggedIn) {
          setIsLoggedIn(false);
          setAuthMode('login');
        }
      } else if (path === '/signup' || path === '/register') {
        if (!cachedIsLoggedIn) {
          setIsLoggedIn(false);
          setAuthMode('signup');
        }
      } else if (cachedIsLoggedIn) {
        setIsLoggedIn(true);
        if (path === '/admin' && cachedIsAdmin) {
          setIsAdminMode(true);
        } else {
          setIsAdminMode(false);
          if (path === '/dashboard') setActiveTab('dashboard');
          else if (path === '/resources') setActiveTab('resources');
          else if (path === '/payouts' || path === '/payout') setActiveTab('payout');
          else if (path === '/leaderboard') setActiveTab('leaderboard');
          else if (path === '/terms') setActiveTab('terms');
          else if (path === '/profile') setActiveTab('profile');
        }
      } else {
        // Not logged in but requesting a protected page - default to /login
        setIsLoggedIn(false);
        setAuthMode('login');
        navigate('/login', { replace: true });
      }
    };

    syncRouteFromPath();
  }, [location.pathname]);

  // Automatically update the browser address bar whenever react states change
  useEffect(() => {
    if (!isLoggedIn) {
      if (authMode === 'login') {
        if (location.pathname !== '/login' && location.pathname !== '/') {
          navigate('/login');
        }
      } else if (authMode === 'signup') {
        if (location.pathname !== '/signup' && location.pathname !== '/register') {
          navigate('/signup');
        }
      }
    } else {
      if (isAdminMode) {
        if (location.pathname !== '/admin') {
          navigate('/admin');
        }
      } else {
        let expectedPath = '/dashboard';
        if (activeTab === 'dashboard') expectedPath = '/dashboard';
        else if (activeTab === 'resources') expectedPath = '/resources';
        else if (activeTab === 'payout') expectedPath = '/payouts';
        else if (activeTab === 'leaderboard') expectedPath = '/leaderboard';
        else if (activeTab === 'terms') expectedPath = '/terms';
        else if (activeTab === 'profile') expectedPath = '/profile';

        if (location.pathname !== expectedPath) {
          navigate(expectedPath);
        }
      }
    }
  }, [isLoggedIn, authMode, activeTab, isAdminMode]);

  // Timer for OTP resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const generateOTP = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSendOTP = async (email: string, purpose: 'register' | 'forgot_password') => {
    setOtpLoading(true);
    setOtpError('');
    setOtpStatusMsg('');
    const code = generateOTP();
    setOtpCode(code);

// Supabase OTP storage is now handled securely on the server-side via /api/send-otp
    
    try {
      const res = await sendOTPEmail(email, code, purpose);
      if (res.success) {
        setOtpStatusMsg(`Verification code sent to ${email} successfully! Please check your spam/junk folder.`);
        setBackupOtpDelivery({
          visible: true,
          otp: code,
          type: 'real',
          email: email
        });
      } else {
        if (res.corsBlocked) {
          console.log("CORS blocked Resend API call. Falling back to simulated secure in-app delivery.");
          setOtpStatusMsg("Simulated secure delivery activated. OTP generated successfully.");
        } else {
          console.warn("Resend API failed, falling back to simulated secure in-app delivery:", res.error);
          setOtpError(`Resend API Error: ${res.error || "Unknown error occurred"}`);
          setOtpStatusMsg("API error fallback activated. Live simulation code generated below.");
        }
        setBackupOtpDelivery({
          visible: true,
          otp: code,
          type: 'simulated',
          email: email
        });
      }
      setResendCooldown(30); // 30 seconds cooldown
    } catch (err: any) {
      console.error("OTP send error:", err);
      setOtpError("Failed to deliver OTP via Resend. Using simulated secure delivery.");
      setBackupOtpDelivery({
        visible: true,
        otp: code,
        type: 'simulated',
        email: email
      });
    } finally {
      setOtpLoading(false);
    }
  };

  // Load state from localStorage on mount
  useEffect(() => {
    // Purge any stale mock/fake data from local storage to ensure 100% genuine user experience
    try {
      // 1. Detect mock users in global list
      const globalUsersStr = localStorage.getItem('webnixo_global_users');
      if (globalUsersStr) {
        const parsedUsers = JSON.parse(globalUsersStr);
        if (Array.isArray(parsedUsers)) {
          const genuineUsers = parsedUsers.filter((u: any) => 
            u && 
            u.id !== 'user_1' && 
            u.id !== 'user_2' && 
            u.id !== 'user_3' && 
            u.id !== 'user_4' && 
            u.id !== 'user_5' && 
            u.email !== 'aravind.s@gmail.com' && 
            u.email !== 'priya.patel@outlook.com' && 
            u.email !== 'rahul.sharma@gmail.com' && 
            u.email !== 'info@techvantage.ai' && 
            u.email !== 'deepak.v@designcraft.io'
          );
          if (genuineUsers.length !== parsedUsers.length) {
            localStorage.setItem('webnixo_global_users', JSON.stringify(genuineUsers));
          }
        }
      }

      // 2. Detect mock payouts in global list
      const globalPayoutsStr = localStorage.getItem('webnixo_global_payouts');
      if (globalPayoutsStr) {
        const parsedPayouts = JSON.parse(globalPayoutsStr);
        if (Array.isArray(parsedPayouts)) {
          const genuinePayouts = parsedPayouts.filter((p: any) => 
            p && 
            !p.id?.startsWith('pay_mock') && 
            p.destination !== 'aravind@okaxis' && 
            p.destination !== 'sharma@paytm' && 
            !p.destination?.includes('HDFC Bank (A/C: *8912)') && 
            !p.destination?.includes('ICICI Bank (A/C: *4455)')
          );
          if (genuinePayouts.length !== parsedPayouts.length) {
            localStorage.setItem('webnixo_global_payouts', JSON.stringify(genuinePayouts));
          }
        }
      }

      // 3. Detect mock affiliate stats
      const cachedStats = localStorage.getItem('wwebnixo_affiliate_stats');
      if (cachedStats) {
        const parsedStats = JSON.parse(cachedStats);
        if (parsedStats && (parsedStats.clicks === 184 || parsedStats.signups === 32 || parsedStats.unpaidCommission === 1135.40)) {
          localStorage.removeItem('wwebnixo_affiliate_stats');
        }
      }

      // 4. Detect mock affiliate payout history
      const cachedHistory = localStorage.getItem('wwebnixo_affiliate_payout_history');
      if (cachedHistory) {
        const parsedHistory = JSON.parse(cachedHistory);
        if (Array.isArray(parsedHistory)) {
          const genuineHistory = parsedHistory.filter((p: any) => 
            p && 
            p.id !== 'pay_1' && 
            p.id !== 'pay_2' && 
            p.destination !== 'shivu@okaxis'
          );
          if (genuineHistory.length !== parsedHistory.length) {
            localStorage.setItem('wwebnixo_affiliate_payout_history', JSON.stringify(genuineHistory));
          }
        }
      }

      // 5. Detect mock events
      const cachedEvents = localStorage.getItem('wwebnixo_affiliate_events');
      if (cachedEvents && (cachedEvents.includes('Enterprise Tier Plan') || cachedEvents.includes('arun_dev') || cachedEvents.includes('Starter Tier Plan'))) {
        localStorage.removeItem('wwebnixo_affiliate_events');
      }
    } catch (err) {
      console.error("Error purging stale mock data", err);
    }

    // Migration: If old Google Drive layout is in localStorage or references the original file ID, migrate to the highly compatible direct usercontent layout
    let storedUrl = localStorage.getItem('webnixo_marketing_logoUrl');
    if (!storedUrl || storedUrl.includes('docs.google.com') || storedUrl.includes('11yuTE40NZx1imt0DARVHUfIPTrgtrJA6')) {
      storedUrl = "https://lh3.googleusercontent.com/d/11yuTE40NZx1imt0DARVHUfIPTrgtrJA6=s512";
      localStorage.setItem('webnixo_marketing_logoUrl', storedUrl);
    }

    // Dynamic favicon configuration
    const currentLogo = localStorage.getItem('webnixo_marketing_logoUrl') || "https://lh3.googleusercontent.com/d/11yuTE40NZx1imt0DARVHUfIPTrgtrJA6=s512";
    const link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (link) {
      link.href = currentLogo;
    }

    const cachedUser = localStorage.getItem('wwebnixo_affiliate_user');
    const cachedStats = localStorage.getItem('wwebnixo_affiliate_stats');
    const cachedPayout = localStorage.getItem('wwebnixo_affiliate_payout');
    const cachedEvents = localStorage.getItem('wwebnixo_affiliate_events');
    const cachedChart = localStorage.getItem('wwebnixo_affiliate_chart');
    const cachedHistory = localStorage.getItem('wwebnixo_affiliate_payout_history');
    
    const cachedIsAdmin = localStorage.getItem('wwebnixo_isAdmin') === 'true';
    const cachedIsLoggedIn = localStorage.getItem('wwebnixo_isLoggedIn') === 'true';

    if (cachedUser) setUser(JSON.parse(cachedUser));
    if (cachedStats) setStats(JSON.parse(cachedStats));
    if (cachedPayout) setPayout(JSON.parse(cachedPayout));
    if (cachedEvents) setEvents(JSON.parse(cachedEvents));
    if (cachedChart) setChartData(JSON.parse(cachedChart));
    if (cachedHistory) setPayoutHistory(JSON.parse(cachedHistory));

    // Dynamic bidirectional sync with global admin database (localStorage version)
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        const currentUserEmail = parsed.email;
        if (currentUserEmail && currentUserEmail !== 'shiva@webnixo.in') {
          const globalUsersStr = localStorage.getItem('webnixo_global_users');
          const globalPayoutsStr = localStorage.getItem('webnixo_global_payouts');
          
          if (globalUsersStr && globalPayoutsStr) {
            const globalUsersList: any[] = JSON.parse(globalUsersStr);
            const globalPayoutsList: any[] = JSON.parse(globalPayoutsStr);
            
            const matchedUser = globalUsersList.find(u => u.email === currentUserEmail);
            if (matchedUser) {
              setStats(prev => {
                const next = {
                  ...prev,
                  sales: matchedUser.sales,
                  commissionEarned: matchedUser.commissionEarned,
                  unpaidCommission: matchedUser.unpaidCommission,
                  payoutStatus: matchedUser.unpaidCommission === 0 ? 'Paid' as const : 'Pending' as const
                };
                localStorage.setItem('wwebnixo_affiliate_stats', JSON.stringify(next));
                return next;
              });

              setUser(prev => {
                const next = {
                  ...prev,
                  fullName: matchedUser.fullName || prev.fullName,
                  companyName: matchedUser.companyName || prev.companyName,
                  website: matchedUser.website || prev.website,
                  phone: matchedUser.phone || prev.phone,
                  promoStrategy: matchedUser.promoStrategy || prev.promoStrategy,
                  country: matchedUser.country || prev.country,
                  customCouponCode: matchedUser.customCouponCode || prev.customCouponCode,
                  referralCode: matchedUser.referralCode || prev.referralCode,
                  isRegisteredAffiliate: matchedUser.isRegisteredAffiliate !== undefined ? matchedUser.isRegisteredAffiliate : prev.isRegisteredAffiliate
                };
                localStorage.setItem('wwebnixo_affiliate_user', JSON.stringify(next));
                return next;
              });
              
              const userHistory = globalPayoutsList.filter(p => 
                p.destination === matchedUser.payoutDetails || 
                p.destination.includes(matchedUser.payoutDetails) || 
                (matchedUser.payoutDetails && matchedUser.payoutDetails.length > 4 && p.destination.includes(matchedUser.payoutDetails.slice(-4))) ||
                p.destination === matchedUser.email
              );
              
              if (userHistory.length > 0) {
                setPayoutHistory(userHistory);
                localStorage.setItem('wwebnixo_affiliate_payout_history', JSON.stringify(userHistory));
              }
            }
          }
        }
      } catch (e) {
        console.error("Global database synchronization on load failed", e);
      }
    }

    // --- SUPABASE LIVE INTEGRATION SYNC ---
    if (isSupabaseConfigured()) {
      // 1. Sync settings
      loadSettingsFromSupabase().then(settings => {
        if (settings) {
          if (settings.commission_rate) localStorage.setItem('webnixo_commission_rate', settings.commission_rate);
          if (settings.min_payout) localStorage.setItem('webnixo_min_payout', settings.min_payout);
          if (settings.comm_199) localStorage.setItem('webnixo_comm_199', settings.comm_199);
          if (settings.comm_499) localStorage.setItem('webnixo_comm_499', settings.comm_499);
          if (settings.comm_999) localStorage.setItem('webnixo_comm_999', settings.comm_999);
          if (settings.admin_password) localStorage.setItem('webnixo_admin_password', settings.admin_password);
          if (settings.marketing_logoUrl) localStorage.setItem('webnixo_marketing_logoUrl', settings.marketing_logoUrl);
          if (settings.marketing_videoCode) localStorage.setItem('webnixo_marketing_videoCode', settings.marketing_videoCode);
          if (settings.marketing_banners) localStorage.setItem('webnixo_marketing_banners', settings.marketing_banners);
        }
      }).catch(err => console.warn("Could not sync settings from Supabase:", err));

      // 2. Sync profile if a user is logged in
      if (cachedUser) {
        try {
          const parsed = JSON.parse(cachedUser);
          if (parsed.email && parsed.email !== 'shiva@webnixo.in') {
            loadProfileFromSupabase(parsed.email).then(remoteData => {
              if (remoteData) {
                setUser(remoteData.profile);
                setStats(remoteData.stats);
                setPayout(remoteData.payout);
                localStorage.setItem('wwebnixo_affiliate_user', JSON.stringify(remoteData.profile));
                localStorage.setItem('wwebnixo_affiliate_stats', JSON.stringify(remoteData.stats));
                localStorage.setItem('wwebnixo_affiliate_payout', JSON.stringify(remoteData.payout));
              }
            }).catch(e => console.warn("Could not sync profile from Supabase:", e));

            loadEventsFromSupabase(parsed.email).then(remoteEvents => {
              if (remoteEvents) {
                setEvents(remoteEvents);
                localStorage.setItem('wwebnixo_affiliate_events', JSON.stringify(remoteEvents));
              }
            }).catch(e => console.warn("Could not sync events from Supabase:", e));

            loadPayoutsFromSupabase(parsed.email).then(remotePayouts => {
              if (remotePayouts) {
                setPayoutHistory(remotePayouts);
                localStorage.setItem('wwebnixo_affiliate_payout_history', JSON.stringify(remotePayouts));
              }
            }).catch(e => console.warn("Could not sync payouts from Supabase:", e));
          }
        } catch (e) {
          console.error("Supabase live sync parsing failed", e);
        }
      }
    }

    if (cachedIsLoggedIn) {
      setIsLoggedIn(true);
      if (cachedIsAdmin) {
        setIsAdminMode(true);
      }
    }
  }, []);

  // Synchronize active user with administrator's global list of users
  const syncToGlobalUsersList = (
    uProfile: UserProfile,
    uStats: AffiliateStats = stats,
    uPayout: PayoutDetails = payout
  ) => {
    try {
      if (!uProfile.email || uProfile.email === 'shiva@webnixo.in') return;
      const globalUsersStr = localStorage.getItem('webnixo_global_users');
      let globalUsersList: any[] = [];
      
      if (globalUsersStr) {
        globalUsersList = JSON.parse(globalUsersStr);
      } else {
        // Fallback default list of users (purely genuine, starts empty)
        globalUsersList = [];
      }

      const existsIndex = globalUsersList.findIndex(u => u.email.toLowerCase() === uProfile.email.toLowerCase());
      const payoutDetailsStr = uPayout.payoutMethod === 'upi' ? uPayout.upiId : `${uPayout.bankName} (A/C: ${uPayout.accountNumber}, IFSC: ${uPayout.ifscCode})`;
      
      if (existsIndex >= 0) {
        globalUsersList[existsIndex] = {
          ...globalUsersList[existsIndex],
          password: uProfile.password || globalUsersList[existsIndex].password || 'password123',
          fullName: uProfile.fullName || globalUsersList[existsIndex].fullName,
          companyName: uProfile.companyName || globalUsersList[existsIndex].companyName,
          website: uProfile.website || globalUsersList[existsIndex].website,
          phone: uProfile.phone || globalUsersList[existsIndex].phone,
          promoStrategy: uProfile.promoStrategy || globalUsersList[existsIndex].promoStrategy,
          country: uProfile.country || globalUsersList[existsIndex].country,
          referralCode: uProfile.referralCode || globalUsersList[existsIndex].referralCode,
          customCouponCode: uProfile.customCouponCode !== undefined ? uProfile.customCouponCode : globalUsersList[existsIndex].customCouponCode,
          isRegisteredAffiliate: uProfile.isRegisteredAffiliate !== undefined ? uProfile.isRegisteredAffiliate : globalUsersList[existsIndex].isRegisteredAffiliate,
          sales: uStats.sales !== undefined ? uStats.sales : globalUsersList[existsIndex].sales,
          commissionEarned: uStats.commissionEarned !== undefined ? uStats.commissionEarned : globalUsersList[existsIndex].commissionEarned,
          unpaidCommission: uStats.unpaidCommission !== undefined ? uStats.unpaidCommission : globalUsersList[existsIndex].unpaidCommission,
          payoutMethod: uPayout.payoutMethod || globalUsersList[existsIndex].payoutMethod,
          payoutDetails: payoutDetailsStr || globalUsersList[existsIndex].payoutDetails,
          status: globalUsersList[existsIndex].status || 'Active'
        };
      } else {
        globalUsersList.push({
          id: uProfile.id || `user_${Math.floor(1000 + Math.random() * 9000)}`,
          email: uProfile.email,
          password: uProfile.password || 'password123',
          fullName: uProfile.fullName || '',
          companyName: uProfile.companyName || '',
          website: uProfile.website || '',
          phone: uProfile.phone || '',
          promoStrategy: uProfile.promoStrategy || '',
          country: uProfile.country || 'India',
          referralCode: uProfile.referralCode || `partner_${Math.random().toString(36).substring(2, 8)}`,
          customCouponCode: uProfile.customCouponCode || '',
          isRegisteredAffiliate: uProfile.isRegisteredAffiliate !== undefined ? uProfile.isRegisteredAffiliate : true,
          sales: uStats.sales || 0,
          commissionEarned: uStats.commissionEarned || 0,
          unpaidCommission: uStats.unpaidCommission || 0,
          payoutMethod: uPayout.payoutMethod || 'upi',
          payoutDetails: payoutDetailsStr || '',
          status: 'Active' as const,
          joinedAt: uProfile.joinedAt || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        });
      }
      localStorage.setItem('webnixo_global_users', JSON.stringify(globalUsersList));
    } catch (e) {
      console.error("syncToGlobalUsersList helper failed:", e);
    }
  };

  // Sync state to localStorage helper & Supabase
  const saveState = (
    updatedUser: UserProfile, 
    updatedStats: AffiliateStats, 
    updatedPayout: PayoutDetails, 
    updatedEvents: ReferralEvent[], 
    updatedChart: any[],
    updatedHistory: PayoutHistoryItem[] = payoutHistory
  ) => {
    localStorage.setItem('wwebnixo_affiliate_user', JSON.stringify(updatedUser));
    localStorage.setItem('wwebnixo_affiliate_stats', JSON.stringify(updatedStats));
    localStorage.setItem('wwebnixo_affiliate_payout', JSON.stringify(updatedPayout));
    localStorage.setItem('wwebnixo_affiliate_events', JSON.stringify(updatedEvents));
    localStorage.setItem('wwebnixo_affiliate_chart', JSON.stringify(updatedChart));
    localStorage.setItem('wwebnixo_affiliate_payout_history', JSON.stringify(updatedHistory));

    // Keep administrator's global list in perfect sync
    syncToGlobalUsersList(updatedUser, updatedStats, updatedPayout);

    if (isSupabaseConfigured() && updatedUser.email && updatedUser.email !== 'shiva@webnixo.in') {
      syncProfileToSupabase(updatedUser, updatedStats, updatedPayout).catch(err => {
        console.warn("Async Supabase profile sync error:", err);
      });
      syncEventsToSupabase(updatedUser.email, updatedEvents).catch(err => {
        console.warn("Async Supabase events sync error:", err);
      });
      syncPayoutsToSupabase(updatedUser.email, updatedHistory).catch(err => {
        console.warn("Async Supabase payouts sync error:", err);
      });
    }
  };

  // Auth Operations
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) {
      alert("Please complete the security check.");
      return;
    }
    
    // Check for admin credentials
    const storedAdminPass = localStorage.getItem('webnixo_admin_password') || '123456';
    const cleanEmail = emailInput.trim();

    if (cleanEmail === 'shiva@webnixo.in' && passwordInput === storedAdminPass) {
      setIsAdminMode(true);
      setIsLoggedIn(true);
      localStorage.setItem('wwebnixo_isAdmin', 'true');
      localStorage.setItem('wwebnixo_isLoggedIn', 'true');
      resetTurnstile();
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
          alert(errData.error || "Signup blocked.");
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
            if (!loginRes.ok) {
              const errData = await loginRes.json();
              alert(errData.error || "Login failed");
              resetTurnstile();
              return;
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
              alert("No affiliate account found with this email on Supabase. Please sign up.");
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
                alert("The password entered is incorrect.");
                resetTurnstile();
                return;
              }
              finalUser = { ...finalUser, ...foundUser };
            } else {
              alert("No affiliate account found locally. Please sign up.");
              resetTurnstile();
              return;
            }
          } else {
            if (cleanEmail !== user.email || password !== user.password) {
              alert("No local fallback account found. Please sign up.");
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

  
