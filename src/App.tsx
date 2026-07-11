import React, { useState, useEffect } from 'react';
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

    // Save to Supabase OTP table if configured
    if (isSupabaseConfigured()) {
      try {
        await storeOTPInSupabase(email, code, purpose);
      } catch (err) {
        console.warn("Supabase OTP store error:", err);
      }
    }
    
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
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for admin credentials
    const storedAdminPass = localStorage.getItem('webnixo_admin_password') || '123456';
    const cleanEmail = emailInput.trim();
    if (cleanEmail === 'shiva@webnixo.in' && passwordInput === storedAdminPass) {
      setIsAdminMode(true);
      setIsLoggedIn(true);
      localStorage.setItem('wwebnixo_isAdmin', 'true');
      localStorage.setItem('wwebnixo_isLoggedIn', 'true');
      return;
    }

    if (cleanEmail && passwordInput.length >= 6) {
      if (authMode === 'signup') {
        // Trigger registration OTP verification
        setVerificationMode('signup_otp');
        handleSendOTP(cleanEmail, 'register');
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
            const remoteData = await loadProfileFromSupabase(cleanEmail);
            if (remoteData) {
              // Password check (if they configured a password)
              if (remoteData.profile.password && remoteData.profile.password !== password) {
                alert("The password entered is incorrect for this registered Supabase email.");
                return;
              }
              finalUser = remoteData.profile;
              finalStats = remoteData.stats;
              finalPayout = remoteData.payout;

              const remoteEvents = await loadEventsFromSupabase(cleanEmail);
              if (remoteEvents) finalEvents = remoteEvents;

              const remotePayouts = await loadPayoutsFromSupabase(cleanEmail);
              if (remotePayouts) finalHistory = remotePayouts;
            } else {
              // Create a brand new affiliate profile in Supabase
              const refCode = `partner_${Math.random().toString(36).substring(2, 8)}`;
              finalUser.referralCode = refCode;
              await syncProfileToSupabase(finalUser, finalStats, finalPayout);
            }
          } catch (err) {
            console.error("Supabase authentication loader failed:", err);
          }
        } else {
          // Fallback lookup in local storage mode
          try {
            const globalUsersStr = localStorage.getItem('webnixo_global_users');
            if (globalUsersStr) {
              const globalUsersList: any[] = JSON.parse(globalUsersStr);
              const matchedLocal = globalUsersList.find(u => u.email.toLowerCase() === cleanEmail.toLowerCase());
              if (matchedLocal) {
                // Password check
                if (matchedLocal.password && matchedLocal.password !== password) {
                  alert("The password entered is incorrect for this registered email.");
                  return;
                }
                
                // Restore profile
                finalUser = {
                  id: matchedLocal.id,
                  email: matchedLocal.email,
                  password: matchedLocal.password,
                  fullName: matchedLocal.fullName || matchedLocal.email.split('@')[0],
                  phone: matchedLocal.phone || '',
                  companyName: matchedLocal.companyName || '',
                  website: matchedLocal.website || '',
                  promoStrategy: matchedLocal.promoStrategy || '',
                  country: matchedLocal.country || 'India',
                  isRegisteredAffiliate: matchedLocal.isRegisteredAffiliate !== undefined ? matchedLocal.isRegisteredAffiliate : true,
                  referralCode: matchedLocal.referralCode,
                  customCouponCode: matchedLocal.customCouponCode || '',
                  joinedAt: matchedLocal.joinedAt || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                };

                // Restore stats
                finalStats = {
                  clicks: matchedLocal.clicks || 0,
                  signups: matchedLocal.signups || 0,
                  sales: matchedLocal.sales || 0,
                  commissionEarned: matchedLocal.commissionEarned || 0,
                  unpaidCommission: matchedLocal.unpaidCommission || 0,
                  payoutStatus: matchedLocal.unpaidCommission === 0 ? 'Paid' : 'Pending'
                };

                // Restore payout details
                const isUpi = matchedLocal.payoutMethod === 'upi';
                finalPayout = {
                  payoutMethod: matchedLocal.payoutMethod || 'upi',
                  upiId: isUpi ? matchedLocal.payoutDetails : '',
                  bankName: !isUpi ? (matchedLocal.bankName || '') : '',
                  accountNumber: !isUpi ? (matchedLocal.accountNumber || '') : '',
                  accountHolderName: !isUpi ? (matchedLocal.accountHolderName || matchedLocal.fullName || '') : '',
                  ifscCode: !isUpi ? (matchedLocal.ifscCode || '') : ''
                };
              } else {
                if (!finalUser.referralCode) {
                  finalUser.referralCode = `partner_${Math.random().toString(36).substring(2, 8)}`;
                }
                finalUser.isRegisteredAffiliate = false; // Need to complete registration
              }
            } else {
              if (!finalUser.referralCode) {
                finalUser.referralCode = `partner_${Math.random().toString(36).substring(2, 8)}`;
              }
            }
          } catch (e) {
            console.error("Local storage lookup failed:", e);
            if (!finalUser.referralCode) {
              finalUser.referralCode = `partner_${Math.random().toString(36).substring(2, 8)}`;
            }
          }
        }

        setUser(finalUser);
        setStats(finalStats);
        setPayout(finalPayout);
        setEvents(finalEvents);
        setPayoutHistory(finalHistory);

        setIsAdminMode(false);
        setIsLoggedIn(true);
        localStorage.setItem('wwebnixo_isAdmin', 'false');
        localStorage.setItem('wwebnixo_isLoggedIn', 'true');

        saveState(finalUser, finalStats, finalPayout, finalEvents, chartData, finalHistory);
      };

      authenticateUser();
    }
  };

  const completeSignup = async () => {
    const cleanEmail = emailInput.trim();
    const password = passwordInput;
    
    let finalUser: UserProfile = {
      id: `user_${Math.floor(1000 + Math.random() * 9000)}`,
      email: cleanEmail,
      password: password,
      fullName: cleanEmail.split('@')[0],
      phone: '',
      companyName: '',
      website: '',
      promoStrategy: '',
      country: 'India',
      isRegisteredAffiliate: false,
      referralCode: `partner_${Math.random().toString(36).substring(2, 8)}`,
      joinedAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    };

    let finalStats: AffiliateStats = {
      clicks: 0,
      signups: 0,
      sales: 0,
      commissionEarned: 0,
      unpaidCommission: 0,
      payoutStatus: 'None'
    };
    
    let finalPayout: PayoutDetails = {
      payoutMethod: 'upi',
      upiId: '',
      bankName: '',
      accountNumber: '',
      accountHolderName: '',
      ifscCode: ''
    };
    
    let finalEvents: ReferralEvent[] = [];
    let finalHistory: PayoutHistoryItem[] = [];

    // Sync to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        await syncProfileToSupabase(finalUser, finalStats, finalPayout);
      } catch (err) {
        console.error("Supabase sign up sync failed:", err);
      }
    }

    // Instantly sync changes to the administrator's global user database in LocalStorage
    try {
      const globalUsersStr = localStorage.getItem('webnixo_global_users');
      const globalUsersList = globalUsersStr ? JSON.parse(globalUsersStr) : [];
      
      // Map to GlobalAffiliate compatible format
      const mappedAffiliate = {
        id: finalUser.id,
        email: finalUser.email,
        password: finalUser.password || 'password123',
        fullName: finalUser.fullName,
        companyName: finalUser.companyName,
        website: finalUser.website,
        promoStrategy: finalUser.promoStrategy,
        country: finalUser.country,
        referralCode: finalUser.referralCode,
        customCouponCode: finalUser.customCouponCode || '',
        sales: finalStats.sales,
        commissionEarned: finalStats.commissionEarned,
        unpaidCommission: finalStats.unpaidCommission,
        payoutMethod: finalPayout.payoutMethod,
        payoutDetails: finalPayout.payoutMethod === 'upi' ? finalPayout.upiId : `${finalPayout.bankName} (A/C: ${finalPayout.accountNumber}, IFSC: ${finalPayout.ifscCode})`,
        status: 'Active' as const,
        joinedAt: finalUser.joinedAt,
        isRegisteredAffiliate: false
      };
      
      const exists = globalUsersList.some((u: any) => u.email === mappedAffiliate.email);
      if (!exists) {
        globalUsersList.push(mappedAffiliate);
        localStorage.setItem('webnixo_global_users', JSON.stringify(globalUsersList));
      }
    } catch (err) {
      console.error("Failed to sync registered user to admin list", err);
    }

    setUser(finalUser);
    setStats(finalStats);
    setPayout(finalPayout);
    setEvents(finalEvents);
    setPayoutHistory(finalHistory);

    setIsAdminMode(false);
    setIsLoggedIn(true);
    setVerificationMode('none');
    setOtpInput('');
    setOtpCode('');
    setBackupOtpDelivery(null);
    localStorage.setItem('wwebnixo_isAdmin', 'false');
    localStorage.setItem('wwebnixo_isLoggedIn', 'true');

    saveState(finalUser, finalStats, finalPayout, finalEvents, chartData, finalHistory);
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
    
    try {
      // 1. Update in local storage global database
      const globalUsersStr = localStorage.getItem('webnixo_global_users');
      if (globalUsersStr) {
        const globalUsersList: any[] = JSON.parse(globalUsersStr);
        const updatedGlobalUsers = globalUsersList.map(u => {
          if (u.email === emailToReset) {
            return {
              ...u,
              password: newPasswordInput
            };
          }
          return u;
        });
        localStorage.setItem('webnixo_global_users', JSON.stringify(updatedGlobalUsers));
      }

      // 2. Update in active user session if the email matches
      if (user.email === emailToReset) {
        setUser(prev => ({ ...prev, password: newPasswordInput }));
      }

      // 3. Update in Supabase if configured
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('profiles')
          .update({ password: newPasswordInput })
          .eq('email', emailToReset);
          
        if (error) {
          console.error("Supabase password reset error:", error);
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
      alert("Password has been reset successfully! You can now sign in with your new credentials.");
    } catch (err) {
      console.error("Password reset update failed:", err);
      setOtpError("Failed to update password. Please try again.");
    }
  };

  // Registration callback
  const handleRegisterAffiliate = (data: Partial<UserProfile>) => {
    const nextUser = {
      ...user,
      ...data,
      isRegisteredAffiliate: true
    };
    setUser(nextUser);

    // Log registration
    const newLog: ReferralEvent = {
      id: Math.random().toString(),
      type: 'signup',
      details: 'Registered as an official WEBNIXO AI Partner!',
      timestamp: 'Just now'
    };
    const nextEvents = [newLog, ...events];
    setEvents(nextEvents);
    
    saveState(nextUser, stats, payout, nextEvents, chartData, payoutHistory);
  };

  // Simulated traffic generator callbacks
  const handleSimulateClick = () => {
    const updatedStats = {
      ...stats,
      clicks: stats.clicks + 1
    };
    setStats(updatedStats);

    const newLog: ReferralEvent = {
      id: Math.random().toString(),
      type: 'click',
      details: `Referred Link Click - IP block ${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      timestamp: 'Just now'
    };
    const updatedEvents = [newLog, ...events.slice(0, 19)];
    setEvents(updatedEvents);

    // Update today's chart click index
    const updatedChart = chartData.map((item, idx) => {
      if (idx === chartData.length - 1) {
        return { ...item, clicks: item.clicks + 1 };
      }
      return item;
    });
    setChartData(updatedChart);

    saveState(user, updatedStats, payout, updatedEvents, updatedChart, payoutHistory);
  };

  const handleSimulateSignup = () => {
    const updatedStats = {
      ...stats,
      clicks: stats.clicks + 1, // clicks always leads signup
      signups: stats.signups + 1
    };
    setStats(updatedStats);

    const newLog: ReferralEvent = {
      id: Math.random().toString(),
      type: 'signup',
      details: `Referral Signup - user_${Math.floor(Math.random() * 9000 + 1000)} registered successfully`,
      timestamp: 'Just now'
    };
    const updatedEvents = [newLog, ...events.slice(0, 19)];
    setEvents(updatedEvents);

    const updatedChart = chartData.map((item, idx) => {
      if (idx === chartData.length - 1) {
        return { ...item, clicks: item.clicks + 1, signups: item.signups + 1 };
      }
      return item;
    });
    setChartData(updatedChart);

    saveState(user, updatedStats, payout, updatedEvents, updatedChart, payoutHistory);
  };

  const handleSimulateSale = (amount: number) => {
    const plan199Comm = Number(localStorage.getItem('webnixo_comm_199') || '39.80');
    const plan499Comm = Number(localStorage.getItem('webnixo_comm_499') || '99.80');
    const plan999Comm = Number(localStorage.getItem('webnixo_comm_999') || '199.80');
    let commission = amount * 0.20;
    if (amount === 199) commission = plan199Comm;
    else if (amount === 499) commission = plan499Comm;
    else if (amount === 999) commission = plan999Comm;

    const updatedStats = {
      ...stats,
      clicks: stats.clicks + 2,
      signups: stats.signups + 1,
      sales: stats.sales + 1,
      commissionEarned: stats.commissionEarned + commission,
      unpaidCommission: stats.unpaidCommission + commission
    };
    setStats(updatedStats);

    const newLog: ReferralEvent = {
      id: Math.random().toString(),
      type: 'sale',
      details: `Subscription Verified (₹${amount.toFixed(0)}) - Earned ₹${commission.toFixed(2)} Recurring commission`,
      timestamp: 'Just now',
      commission: commission
    };
    const updatedEvents = [newLog, ...events.slice(0, 19)];
    setEvents(updatedEvents);

    const updatedChart = chartData.map((item, idx) => {
      if (idx === chartData.length - 1) {
        return { 
          ...item, 
          clicks: item.clicks + 2, 
          signups: item.signups + 1, 
          sales: item.sales + 1,
          revenue: item.revenue + commission
        };
      }
      return item;
    });
    setChartData(updatedChart);

    saveState(user, updatedStats, payout, updatedEvents, updatedChart, payoutHistory);
  };

  const handleRequestPayout = () => {
    if (stats.unpaidCommission < 1000) return;

    const payoutAmount = stats.unpaidCommission;
    const currentMethod = payout.payoutMethod;
    const currentDestination = payout.payoutMethod === 'upi' ? payout.upiId : `${payout.bankName} (A/C: *${payout.accountNumber.slice(-4)})`;

    // Reset unpaid balance to 0
    const updatedStats: AffiliateStats = {
      ...stats,
      unpaidCommission: 0,
      payoutStatus: 'Pending'
    };
    setStats(updatedStats);

    // Add pending payout record
    const newPayoutId = 'pay_' + Math.floor(Math.random() * 1000000);
    const newPayoutItem: PayoutHistoryItem = {
      id: newPayoutId,
      amount: payoutAmount,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      method: currentMethod,
      destination: currentDestination || 'Primary Account',
      status: 'Pending'
    };

    const nextHistory = [newPayoutItem, ...payoutHistory];
    setPayoutHistory(nextHistory);

    // Sync to global database for admin preview
    try {
      const globalPayoutsStr = localStorage.getItem('webnixo_global_payouts');
      const globalPayoutsList: PayoutHistoryItem[] = globalPayoutsStr ? JSON.parse(globalPayoutsStr) : [];
      // Avoid duplicate insert
      if (!globalPayoutsList.some(p => p.id === newPayoutItem.id)) {
        globalPayoutsList.unshift(newPayoutItem);
        localStorage.setItem('webnixo_global_payouts', JSON.stringify(globalPayoutsList));
      }

      const globalUsersStr = localStorage.getItem('webnixo_global_users');
      if (globalUsersStr) {
        const globalUsersList: any[] = JSON.parse(globalUsersStr);
        const updatedGlobalUsers = globalUsersList.map(u => {
          if (u.email === user.email) {
            return {
              ...u,
              unpaidCommission: 0
            };
          }
          return u;
        });
        localStorage.setItem('webnixo_global_users', JSON.stringify(updatedGlobalUsers));
      }
    } catch (err) {
      console.error("Global database synchronization failed", err);
    }

    // Add event log
    const newLog: ReferralEvent = {
      id: Math.random().toString(),
      type: 'click',
      details: `Requested withdrawal of ₹${payoutAmount.toFixed(2)} to ${currentMethod.toUpperCase()}`,
      timestamp: 'Just now'
    };
    const nextEvents = [newLog, ...events.slice(0, 19)];
    setEvents(nextEvents);

    saveState(user, updatedStats, payout, nextEvents, chartData, nextHistory);

    // Auto-process to "Credited" with Transaction ID after 3 seconds for ultimate real-time demo satisfaction!
    setTimeout(() => {
      setPayoutHistory(prevHistory => {
        const processedHistory = prevHistory.map(item => {
          if (item.id === newPayoutId) {
            return {
              ...item,
              status: 'Credited' as const,
              transactionId: 'TXN' + Math.floor(1000000000 + Math.random() * 9000000000)
            };
          }
          return item;
        });

        setStats(prevStats => {
          const finishedStats = {
            ...prevStats,
            payoutStatus: 'Paid' as const
          };
          localStorage.setItem('wwebnixo_affiliate_stats', JSON.stringify(finishedStats));
          return finishedStats;
        });

        localStorage.setItem('wwebnixo_affiliate_payout_history', JSON.stringify(processedHistory));
        return processedHistory;
      });
    }, 3000);
  };

  const handleResetData = () => {
    const defaultStats: AffiliateStats = {
      clicks: 0,
      signups: 0,
      sales: 0,
      commissionEarned: 0.00,
      unpaidCommission: 0.00,
      payoutStatus: 'None'
    };
    setStats(defaultStats);
    setEvents([]);
    setPayoutHistory([]);
    setChartData([
      { day: 'Mon', clicks: 0, signups: 0, sales: 0, revenue: 0 },
      { day: 'Tue', clicks: 0, signups: 0, sales: 0, revenue: 0 },
      { day: 'Wed', clicks: 0, signups: 0, sales: 0, revenue: 0 },
      { day: 'Thu', clicks: 0, signups: 0, sales: 0, revenue: 0 },
      { day: 'Fri', clicks: 0, signups: 0, sales: 0, revenue: 0 },
      { day: 'Sat', clicks: 0, signups: 0, sales: 0, revenue: 0 },
      { day: 'Sun (Today)', clicks: 0, signups: 0, sales: 0, revenue: 0 }
    ]);
    saveState(user, defaultStats, payout, [], chartData, []);
  };

  const handleUpdateProfile = (data: Partial<UserProfile>) => {
    setUser(prev => {
      const next = { ...prev, ...data };
      saveState(next, stats, payout, events, chartData, payoutHistory);
      return next;
    });
  };

  const handleSavePayout = (data: PayoutDetails) => {
    setPayout(data);
    localStorage.setItem('wwebnixo_affiliate_payout', JSON.stringify(data));
    saveState(user, stats, data, events, chartData, payoutHistory);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsAdminMode(false);
    setIsSidebarOpen(false);
    localStorage.removeItem('wwebnixo_isAdmin');
    localStorage.removeItem('wwebnixo_isLoggedIn');
  };

  // Direct Google Drive image url for WEBNIXO AI Logo (dynamic from localStorage)
  const companyLogoUrl = localStorage.getItem('webnixo_marketing_logoUrl') || "https://lh3.googleusercontent.com/d/11yuTE40NZx1imt0DARVHUfIPTrgtrJA6=s512";

  const [copiedLink, setCopiedLink] = useState(false);

  const getCurrentPathStr = () => {
    if (!isLoggedIn) {
      return authMode === 'login' ? '/login' : '/signup';
    }
    if (isAdminMode) {
      return '/admin';
    }
    if (activeTab === 'dashboard') return '/dashboard';
    if (activeTab === 'resources') return '/resources';
    if (activeTab === 'payout') return '/payouts';
    if (activeTab === 'leaderboard') return '/leaderboard';
    if (activeTab === 'terms') return '/terms';
    if (activeTab === 'profile') return '/profile';
    return '/dashboard';
  };

  const currentPathStr = getCurrentPathStr();
  const simulatedUrl = `affiliate.webnixo.in${currentPathStr}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://${simulatedUrl}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* 1. MOCK SIGN-IN / SIGN-UP PAGE */}
      {!isLoggedIn ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
          <div className="max-w-md w-full space-y-8 bg-white border border-slate-100 p-8 sm:p-10 rounded-3xl shadow-2xl">
            
            {/* Logo area */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-center w-full max-h-[100px]">
                <img 
                  src={companyLogoUrl} 
                  alt="WEBNIXO AI Logo" 
                  className="max-h-16 w-auto object-contain"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // Fallback sleek corporate logo if Google Drive link fails CORS inside an iframe
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const sibling = target.nextElementSibling as HTMLElement;
                    if (sibling) sibling.style.display = 'flex';
                  }}
                />
                <div className="hidden h-14 items-center justify-center font-black text-slate-900 text-xl tracking-tighter uppercase select-none">
                  <span className="text-indigo-600 font-extrabold mr-1">W</span>EBNIXO <span className="bg-indigo-600 text-white px-1.5 py-0.5 rounded ml-1 text-xs">AI</span>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">WEBNIXO AI Affiliate Partner</h2>
                <p className="text-xs text-slate-500 mt-1">Sign in to launch, manage, and scale your passive referral commissions.</p>
              </div>
            </div>

            {/* Dynamic Card Screens depending on Verification/OTP flows */}
            {verificationMode === 'none' ? (
              <>
                {/* Segment control */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      authMode === 'login' 
                      ? 'bg-white text-indigo-700 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('signup')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      authMode === 'signup' 
                      ? 'bg-white text-indigo-700 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Register
                  </button>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="name@webnixo.ai"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                        Password
                      </label>
                      {authMode === 'login' && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setVerificationMode('forgot_email');
                            setOtpError('');
                            setOtpStatusMsg('');
                            setForgotEmailInput(emailInput);
                          }}
                          className="text-[10px] text-indigo-600 hover:underline cursor-pointer bg-transparent border-none p-0"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-mono"
                    />
                  </div>

                  {authMode === 'signup' && (
                    <div className="pt-1">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          required
                          className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 mt-0.5 cursor-pointer"
                        />
                        <span className="text-[11px] text-slate-500 leading-normal">
                          I accept the terms, guidelines, cookie policies, and confirm I will promote WEBNIXO AI ethically.
                        </span>
                      </label>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm py-3 rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer pt-2.5 pb-2.5"
                    id="sign-in-btn"
                  >
                    <Lock className="h-4 w-4" />
                    {authMode === 'login' ? 'Access Affiliate Portal' : 'Create Affiliate Account'}
                  </button>
                </form>
              </>
            ) : (verificationMode === 'signup_otp' || verificationMode === 'forgot_otp') ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                  <button 
                    type="button" 
                    onClick={() => {
                      setVerificationMode('none');
                      setBackupOtpDelivery(null);
                    }}
                    className="flex items-center gap-1 hover:text-indigo-600 cursor-pointer text-[11px] font-bold text-slate-500 hover:text-slate-800 bg-transparent border-none"
                  >
                    <ArrowLeft className="h-3 w-3" /> Back
                  </button>
                  <span className="text-slate-300">|</span>
                  <span className="font-semibold text-indigo-600">Verification</span>
                </div>

                <div>
                  <h3 className="text-md font-extrabold text-slate-900 tracking-tight">Security Verification</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Please enter the security code sent to <strong>{verificationMode === 'signup_otp' ? emailInput : forgotEmailInput}</strong>.
                  </p>
                </div>

                {otpStatusMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-[11px] rounded-xl font-medium leading-relaxed">
                    {otpStatusMsg}
                  </div>
                )}

                {otpError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-[11px] rounded-xl font-medium">
                    {otpError}
                  </div>
                )}

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setOtpError('');
                  setOtpLoading(true);

                  let verified = false;
                  const emailToVerify = verificationMode === 'signup_otp' ? emailInput : forgotEmailInput;
                  const purposeStr = verificationMode === 'signup_otp' ? 'register' : 'forgot_password';

                  if (isSupabaseConfigured()) {
                    try {
                      const res = await verifyOTPFromSupabase(emailToVerify, otpInput.trim(), purposeStr);
                      if (res.success) {
                        verified = true;
                      } else {
                        // Fallback check against the in-memory fallback code so they don't get locked out
                        if (otpInput.trim() === otpCode) {
                          verified = true;
                        } else {
                          setOtpError(res.error || "Incorrect security code.");
                        }
                      }
                    } catch (err: any) {
                      console.warn("Supabase OTP verification check failed:", err);
                      if (otpInput.trim() === otpCode) {
                        verified = true;
                      } else {
                        setOtpError("Error verifying security code via Supabase.");
                      }
                    }
                  } else {
                    if (otpInput.trim() === otpCode) {
                      verified = true;
                    } else {
                      setOtpError("Incorrect security code. Please check your inbox.");
                    }
                  }

                  setOtpLoading(false);

                  if (verified) {
                    if (verificationMode === 'signup_otp') {
                      completeSignup();
                    } else {
                      setVerificationMode('reset_password');
                      setOtpInput('');
                      setOtpError('');
                    }
                  }
                }} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      6-Digit Security Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      pattern="[0-9]{6}"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="w-full text-center bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-lg font-bold font-mono tracking-[0.5em] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={otpInput.length !== 6}
                    className={`w-full font-semibold text-sm py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                      otpInput.length === 6 
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <Check className="h-4 w-4" />
                    Verify Security Code
                  </button>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      disabled={resendCooldown > 0 || otpLoading}
                      onClick={() => handleSendOTP(verificationMode === 'signup_otp' ? emailInput : forgotEmailInput, verificationMode === 'signup_otp' ? 'register' : 'forgot_password')}
                      className={`text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:underline bg-transparent border-none ${
                        resendCooldown > 0 || otpLoading ? 'text-slate-400 cursor-not-allowed hover:no-underline' : 'text-indigo-600'
                      }`}
                    >
                      <RefreshCw className={`h-3 w-3 ${otpLoading ? 'animate-spin' : ''}`} />
                      {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Code'}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setVerificationMode('none');
                        setBackupOtpDelivery(null);
                      }}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-700 hover:underline cursor-pointer bg-transparent border-none"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : verificationMode === 'forgot_email' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                  <button 
                    type="button" 
                    onClick={() => {
                      setVerificationMode('none');
                      setBackupOtpDelivery(null);
                    }}
                    className="flex items-center gap-1 hover:text-indigo-600 cursor-pointer text-[11px] font-bold text-slate-500 hover:text-slate-800 bg-transparent border-none"
                  >
                    <ArrowLeft className="h-3 w-3" /> Back to Sign In
                  </button>
                </div>

                <div>
                  <h3 className="text-md font-extrabold text-slate-900 tracking-tight">Reset Password</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Enter your registered affiliate email address. We will send a security code to authorize a password change.
                  </p>
                </div>

                {otpError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-[11px] rounded-xl font-medium">
                    {otpError}
                  </div>
                )}

                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!forgotEmailInput.trim()) return;
                  setVerificationMode('forgot_otp');
                  handleSendOTP(forgotEmailInput.trim(), 'forgot_password');
                }} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                      Registered Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={forgotEmailInput}
                        onChange={(e) => setForgotEmailInput(e.target.value)}
                        placeholder="e.g. name@webnixo.ai"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl pl-11 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={otpLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {otpLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Delivering code...
                      </>
                    ) : (
                      <>
                        <Key className="h-4 w-4" />
                        Request Security Code
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-md font-extrabold text-slate-900 tracking-tight">Create New Password</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Your security code is confirmed. Please choose a new, highly secure password.
                  </p>
                </div>

                {otpError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-[11px] rounded-xl font-medium">
                    {otpError}
                  </div>
                )}

                <form onSubmit={(e) => {
                  e.preventDefault();
                  completePasswordReset();
                }} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmNewPasswordInput}
                      onChange={(e) => setConfirmNewPasswordInput(e.target.value)}
                      placeholder="Confirm your password"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    Reset Password & Sign In
                  </button>
                </form>
              </div>
            )}

            <div className="text-center pt-2">
              <p className="text-[10px] text-slate-400">
                WEBNIXO AI uses end-to-end cloud protection. Cookies must be enabled.
              </p>
            </div>
          </div>
        </div>
      ) : isAdminMode ? (
        <AdminPortal onLogout={handleLogout} />
      ) : (
        /* 2. LOGGED IN PORTAL INTERFACE */
        <div className="flex-1 flex flex-col md:flex-row relative">
          
          {/* Header Mobile Navigation bar */}
          <header className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 z-30 shrink-0">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-600 text-white font-extrabold text-xs px-2 py-1 rounded">W</span>
              <span className="text-xs font-black uppercase tracking-wider">WEBNIXO Partner</span>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1 text-slate-400 hover:text-white"
            >
              {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </header>

          {/* Mobile Overlay Backdrop */}
          {isSidebarOpen && (
            <div 
              className="md:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-30 transition-opacity duration-300"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Sidebar Area (Responsive Drawer) */}
          <aside className={`bg-slate-900 text-slate-300 w-64 border-r border-slate-800 flex flex-col justify-between shrink-0 fixed md:static top-0 bottom-0 left-0 transition-transform duration-300 z-40 md:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            <div className="flex flex-col overflow-y-auto">
              {/* Partner Brand Hub */}
              <div className="p-5 border-b border-slate-800/60 bg-slate-950 flex flex-col gap-3">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center justify-center">
                  <img 
                    src={companyLogoUrl} 
                    alt="WEBNIXO AI Logo" 
                    className="max-h-12 w-auto object-contain"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      const sibling = target.nextElementSibling as HTMLElement;
                      if (sibling) sibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden h-10 items-center justify-center font-black text-white text-md tracking-tighter uppercase select-none">
                    <span className="text-indigo-400 font-extrabold mr-1">W</span>EBNIXO <span className="bg-indigo-500 text-white px-1.5 py-0.5 rounded ml-1 text-xs">AI</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-1">
                  <div className="h-2 w-2 bg-emerald-500 rounded-full animate-ping" />
                  <span className="text-[10px] uppercase font-black tracking-widest text-indigo-300">
                    Affiliate Network
                  </span>
                </div>
              </div>

              {/* Sidebar Tabs Links */}
              {user.isRegisteredAffiliate ? (
                <nav className="p-4 space-y-1" id="sidebar-nav">
                  <button
                    onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'dashboard' 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30 font-extrabold' 
                      : 'hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    <MousePointerClick className="h-4 w-4" />
                    Partner Dashboard
                  </button>

                  <button
                    onClick={() => { setActiveTab('resources'); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'resources' 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30 font-extrabold' 
                      : 'hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    Marketing Materials
                  </button>

                  <button
                    onClick={() => { setActiveTab('payout'); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'payout' 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30 font-extrabold' 
                      : 'hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    <CreditCard className="h-4 w-4" />
                    Payout Configuration
                  </button>

                  <button
                    onClick={() => { setActiveTab('leaderboard'); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'leaderboard' 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30 font-extrabold' 
                      : 'hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    <Award className="h-4 w-4" />
                    Referral Leaderboard
                  </button>

                  <button
                    onClick={() => { setActiveTab('terms'); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'terms' 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30 font-extrabold' 
                      : 'hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    <Shield className="h-4 w-4" />
                    Program Agreement
                  </button>

                  <button
                    onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'profile' 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30 font-extrabold' 
                      : 'hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    <Settings className="h-4 w-4" />
                    Account Settings
                  </button>
                </nav>
              ) : (
                /* Unregistered Locked Sidebar view */
                <div className="p-5 text-center space-y-4">
                  <div className="h-10 w-10 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white">Application Pending</p>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Complete the registration questionnaire to unlock the affiliate tools.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Footer section in Sidebar */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col gap-3">
              <div className="flex items-center gap-3 px-1">
                <div className="h-8 w-8 bg-indigo-600 text-white font-extrabold text-xs rounded-xl flex items-center justify-center uppercase">
                  {user.fullName ? user.fullName.slice(0, 2) : 'A'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate leading-snug">{user.fullName || 'Affiliate'}</p>
                  <p className="text-[10px] text-slate-500 truncate font-mono">{user.email}</p>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 hover:bg-red-950/20 text-xs font-bold rounded-xl text-slate-400 hover:text-red-300 border border-slate-800 hover:border-red-900/40 transition-all cursor-pointer"
                id="logout-btn"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </aside>

          {/* Main Workspace content container */}
          <main className="flex-1 bg-slate-50 p-4 sm:p-6 md:p-8 overflow-y-auto max-h-[calc(100vh-50px)] md:max-h-screen">
            
            {/* 3. SHOWN IF LOGGED IN BUT NOT REGISTERED AS PARTNER */}
            {!user.isRegisteredAffiliate ? (
              <AffiliateRegistration 
                userEmail={user.email} 
                onRegister={handleRegisterAffiliate} 
              />
            ) : (
              /* 4. SHOW ACTIVE PORTAL TAB ONCE REGISTERED */
              <div className="max-w-5xl mx-auto">
                {activeTab === 'dashboard' && (
                  <Dashboard 
                    user={user} 
                    stats={stats} 
                    events={events} 
                    chartData={chartData} 
                    onUpdateUser={handleUpdateProfile}
                    onNavigate={(route) => {
                      if (route === 'login') {
                        setIsLoggedIn(false);
                        setAuthMode('login');
                        navigate('/login');
                      } else if (route === 'signup') {
                        setIsLoggedIn(false);
                        setAuthMode('signup');
                        navigate('/signup');
                      } else if (route === 'admin') {
                        setIsAdminMode(true);
                        navigate('/admin');
                      } else if (route === 'logout') {
                        handleLogout();
                        navigate('/login');
                      } else {
                        setIsAdminMode(false);
                        setActiveTab(route as any);
                        const pathMap: Record<string, string> = {
                          dashboard: '/dashboard',
                          resources: '/resources',
                          payout: '/payouts',
                          leaderboard: '/leaderboard',
                          terms: '/terms',
                          profile: '/profile'
                        };
                        navigate(pathMap[route] || '/dashboard');
                      }
                    }}
                  />
                )}
                
                {activeTab === 'resources' && (
                  <MarketingResources referralCode={user.referralCode} />
                )}

                {activeTab === 'payout' && (
                  <PayoutDetailsComponent 
                    initialDetails={payout} 
                    onSave={handleSavePayout} 
                    unpaidCommission={stats.unpaidCommission}
                    payoutHistory={payoutHistory}
                    onRequestPayout={handleRequestPayout}
                  />
                )}

                {activeTab === 'leaderboard' && (
                  <Leaderboard 
                    entries={leaderboard} 
                    currentUserSales={stats.sales} 
                    currentUserCommission={stats.commissionEarned} 
                    currentUserName={user.fullName} 
                  />
                )}

                {activeTab === 'terms' && (
                  <TermsAndConditions />
                )}

                {activeTab === 'profile' && (
                  <ProfileSettings 
                    user={user} 
                    onUpdateUser={handleUpdateProfile} 
                  />
                )}
              </div>
            )}
          </main>

          {/* Overlay background for Mobile Drawer sidebar */}
          {isSidebarOpen && (
            <div 
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden fixed inset-0 bg-black/60 z-30" 
            />
          )}
        </div>
      )}
    </div>
  );
}
