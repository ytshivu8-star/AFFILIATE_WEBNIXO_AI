import React, { useState, useEffect } from 'react';
import { 
  Users, CreditCard, Award, Ticket, Search, Filter, CheckCircle2, Clock, 
  ArrowUpRight, ShieldAlert, Sparkles, Ban, Check, Sliders, Play, 
  RefreshCw, DollarSign, UserCheck, Trash2, Mail, Phone, Globe, ChevronRight, X, Copy, Database, CheckCircle
} from 'lucide-react';
import { UserProfile, PayoutHistoryItem, ReferralEvent, AffiliateStats, PayoutDetails, SubscriptionPlan } from '../types';
import {
  isSupabaseConfigured,
  supabase,
  syncSettingsToSupabase,
  loadAllProfilesFromSupabase,
  loadAllPayoutsFromSupabase,
  syncProfileToSupabase,
  syncPayoutsToSupabase,
  getSQLInitializationScript,
  checkSupabaseConnection,
  supabaseErrorState,
  loadSubscriptionPlansFromSupabase,
  saveSubscriptionPlanToSupabase
} from '../lib/supabase';

interface GlobalAffiliate {
  id: string;
  email: string;
  password?: string;
  fullName: string;
  companyName: string;
  website: string;
  promoStrategy: string;
  country: string;
  referralCode: string;
  customCouponCode?: string;
  sales: number;
  commissionEarned: number;
  unpaidCommission: number;
  payoutMethod: 'upi' | 'bank';
  payoutDetails: string;
  status: 'Active' | 'Suspended';
  isRegisteredAffiliate?: boolean;
  joinedAt?: string;
}

interface AdminPortalProps {
  onLogout: () => void;
}

export default function AdminPortal({ onLogout }: AdminPortalProps) {
  const [activeTab, setActiveTab] = useState<'payouts' | 'partners' | 'coupons' | 'settings' | 'plans'>('payouts');
  
  // Supabase Diagnostics State
  const [supabaseStatus, setSupabaseStatus] = useState<'testing' | 'connected' | 'schema_missing' | 'disconnected'>('testing');
  const [supabaseMsg, setSupabaseMsg] = useState('');
  const [showSqlSetup, setShowSqlSetup] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Subscription Plans State
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editPlanData, setEditPlanData] = useState<Partial<SubscriptionPlan>>({});
  
  // Search & Filter States
  const [payoutSearch, setPayoutSearch] = useState('');
  const [payoutFilter, setPayoutFilter] = useState<'All' | 'Pending' | 'Credited'>('All');
  const [partnerSearch, setPartnerSearch] = useState('');
  const [partnerFilter, setPartnerFilter] = useState<'All' | 'Active' | 'Suspended'>('All');
  
  // Edit Transaction State
  const [editingPayoutId, setEditingPayoutId] = useState<string | null>(null);
  const [inputTxnId, setInputTxnId] = useState('');
  const [inputStatus, setInputStatus] = useState<'Pending' | 'Credited'>('Credited');
  
  // Custom injection states
  const [selectedPartnerForSale, setSelectedPartnerForSale] = useState<string | null>(null);
  const [injectionPlan, setInjectionPlan] = useState<number>(499);
  const [injectionType, setInjectionType] = useState<'sale' | 'click' | 'signup'>('sale');
  
  // Global simulated data loaded from localStorage or initialized with defaults
  const [globalAffiliates, setGlobalAffiliates] = useState<GlobalAffiliate[]>([]);
  const [globalPayouts, setGlobalPayouts] = useState<PayoutHistoryItem[]>([]);
  const [systemCommissionRate, setSystemCommissionRate] = useState<number>(20);
  const [systemMinPayout, setSystemMinPayout] = useState<number>(1000);
  const [showConfigSuccess, setShowConfigSuccess] = useState(false);

  // Marketing materials editing states & Admin password state
  const [marketingLogoUrl, setMarketingLogoUrl] = useState('');
  const [marketingVideoCode, setMarketingVideoCode] = useState('');
  const [marketingBannerLeaderboardTitle, setMarketingBannerLeaderboardTitle] = useState('');
  const [marketingBannerLeaderboardDesc, setMarketingBannerLeaderboardDesc] = useState('');
  const [marketingBannerSquareTitle, setMarketingBannerSquareTitle] = useState('');
  const [marketingBannerSquareDesc, setMarketingBannerSquareDesc] = useState('');
  const [marketingBannerSocialTitle, setMarketingBannerSocialTitle] = useState('');
  const [marketingBannerSocialDesc, setMarketingBannerSocialDesc] = useState('');
  const [adminPassword, setAdminPassword] = useState('123456');

  // Plan Specific Commission Payout rates editable by admin
  const [plan199Comm, setPlan199Comm] = useState<number>(39.80);
  const [plan499Comm, setPlan499Comm] = useState<number>(99.80);
  const [plan999Comm, setPlan999Comm] = useState<number>(199.80);

  // Load and initialize global state
  useEffect(() => {
    // 1. Initialize Users
    const storedUsers = localStorage.getItem('webnixo_global_users');
    let affiliatesList: GlobalAffiliate[] = [];
    
    if (storedUsers) {
      try {
        const parsed = JSON.parse(storedUsers);
        if (Array.isArray(parsed)) {
          affiliatesList = parsed.filter((u: any) => {
            const email = (u.email || '').toLowerCase().trim();
            return (
              u.id !== 'user_1' &&
              u.id !== 'user_2' &&
              u.id !== 'user_3' &&
              u.id !== 'user_4' &&
              u.id !== 'user_5' &&
              email !== 'aravind.s@gmail.com' &&
              email !== 'priya.patel@outlook.com' &&
              email !== 'rahul.sharma@gmail.com' &&
              email !== 'info@techvantage.ai' &&
              email !== 'deepak.v@designcraft.io'
            );
          });
        }
      } catch (e) {
        affiliatesList = [];
      }
    } else {
      // Create initial empty database of users (purely genuine)
      affiliatesList = [];
      localStorage.setItem('webnixo_global_users', JSON.stringify(affiliatesList));
    }

    // Include the current active user if they exist in standard localStorage
    const localActiveUser = localStorage.getItem('wwebnixo_affiliate_user');
    const localActiveStats = localStorage.getItem('wwebnixo_affiliate_stats');
    const localActivePayout = localStorage.getItem('wwebnixo_affiliate_payout');

    if (localActiveUser) {
      const parsedUser = JSON.parse(localActiveUser);
      const parsedStats = localActiveStats ? JSON.parse(localActiveStats) : { sales: 0, commissionEarned: 0, unpaidCommission: 0 };
      const parsedPayout = localActivePayout ? JSON.parse(localActivePayout) : {};
      
      const exists = affiliatesList.some(u => u.email === parsedUser.email);
      if (!exists && parsedUser.email !== 'shiva@webnixo.in') {
        let activeId = parsedUser.id || 'curr_user';
        if (affiliatesList.some(u => u.id === activeId)) {
          activeId = `user_${Math.floor(1000 + Math.random() * 9000)}`;
        }
        const activeAffiliate: GlobalAffiliate = {
          id: activeId,
          email: parsedUser.email,
          password: parsedUser.password || 'password123',
          fullName: parsedUser.fullName || 'Active Affiliate',
          companyName: parsedUser.companyName || 'N/A',
          website: parsedUser.website || 'N/A',
          promoStrategy: parsedUser.promoStrategy || 'N/A',
          country: parsedUser.country || 'India',
          referralCode: parsedUser.referralCode || 'webnixo_partner',
          customCouponCode: parsedUser.customCouponCode,
          sales: parsedStats.sales || 0,
          commissionEarned: parsedStats.commissionEarned || 0,
          unpaidCommission: parsedStats.unpaidCommission || 0,
          payoutMethod: parsedPayout.payoutMethod || 'upi',
          payoutDetails: parsedPayout.payoutMethod === 'upi' ? parsedPayout.upiId : `${parsedPayout.bankName} (A/C: ${parsedPayout.accountNumber})`,
          status: 'Active'
        };
        affiliatesList.push(activeAffiliate);
        localStorage.setItem('webnixo_global_users', JSON.stringify(affiliatesList));
      } else if (exists && parsedUser.email !== 'shiva@webnixo.in') {
        // Sync active user values if they already exist
        affiliatesList = affiliatesList.map(u => {
          if (u.email === parsedUser.email) {
            return {
              ...u,
              password: parsedUser.password || u.password || 'password123',
              sales: parsedStats.sales || 0,
              commissionEarned: parsedStats.commissionEarned || 0,
              unpaidCommission: parsedStats.unpaidCommission || 0,
              customCouponCode: parsedUser.customCouponCode,
              payoutMethod: parsedPayout.payoutMethod || u.payoutMethod,
              payoutDetails: parsedPayout.payoutMethod === 'upi' 
                ? parsedPayout.upiId 
                : parsedPayout.payoutMethod === 'bank' 
                ? `${parsedPayout.bankName} (A/C: ${parsedPayout.accountNumber})` 
                : u.payoutDetails
            };
          }
          return u;
        });
        localStorage.setItem('webnixo_global_users', JSON.stringify(affiliatesList));
      }
    }

    // Ensure absolute uniqueness of IDs in affiliatesList to prevent React duplicate key errors
    const seenUserIds = new Set<string>();
    const sanitizedAffiliatesList = affiliatesList.map((u, index) => {
      let uniqueId = u.id;
      if (!uniqueId || seenUserIds.has(uniqueId)) {
        uniqueId = `user_${Math.floor(1000 + Math.random() * 9000)}`;
        while (seenUserIds.has(uniqueId)) {
          uniqueId = `user_${Math.floor(1000 + Math.random() * 9000)}`;
        }
      }
      seenUserIds.add(uniqueId);
      return { ...u, id: uniqueId };
    });
    
    const hasUserChanges = sanitizedAffiliatesList.some((u, i) => u.id !== affiliatesList[i].id);
    if (hasUserChanges) {
      localStorage.setItem('webnixo_global_users', JSON.stringify(sanitizedAffiliatesList));
    }
    setGlobalAffiliates(sanitizedAffiliatesList);

    // 2. Initialize Payout Requests
    const storedPayouts = localStorage.getItem('webnixo_global_payouts');
    let payoutsList: PayoutHistoryItem[] = [];
    
    if (storedPayouts) {
      try {
        const parsed = JSON.parse(storedPayouts);
        if (Array.isArray(parsed)) {
          payoutsList = parsed.filter((p: any) => {
            const dest = (p.destination || '').toLowerCase();
            return (
              p.id !== 'pay_1' &&
              p.id !== 'pay_2' &&
              !p.id?.startsWith('pay_mock') &&
              !dest.includes('aravind@okaxis') &&
              !dest.includes('sharma@paytm') &&
              !dest.includes('shivu@okaxis') &&
              !dest.includes('hdfc bank') &&
              !dest.includes('icici bank')
            );
          });
        }
      } catch (e) {
        payoutsList = [];
      }
    } else {
      // Create empty genuine payout history
      payoutsList = [];
      localStorage.setItem('webnixo_global_payouts', JSON.stringify(payoutsList));
    }

    // Merge in current user's local payout history if any
    const localActiveHistory = localStorage.getItem('wwebnixo_affiliate_payout_history');
    if (localActiveHistory) {
      const parsedHistory: PayoutHistoryItem[] = JSON.parse(localActiveHistory);
      parsedHistory.forEach(item => {
        if (!payoutsList.some(p => p.id === item.id)) {
          payoutsList.push(item);
        }
      });
      localStorage.setItem('webnixo_global_payouts', JSON.stringify(payoutsList));
    }

    // Ensure absolute uniqueness of IDs in payoutsList to prevent React duplicate key errors
    const seenPayoutIds = new Set<string>();
    const sanitizedPayoutsList = payoutsList.map((p, index) => {
      let uniqueId = p.id;
      if (!uniqueId || seenPayoutIds.has(uniqueId)) {
        uniqueId = `pay_${Math.floor(100000 + Math.random() * 900000)}`;
        while (seenPayoutIds.has(uniqueId)) {
          uniqueId = `pay_${Math.floor(100000 + Math.random() * 900000)}`;
        }
      }
      seenPayoutIds.add(uniqueId);
      return { ...p, id: uniqueId };
    });
    
    const hasPayoutChanges = sanitizedPayoutsList.some((p, i) => p.id !== payoutsList[i].id);
    if (hasPayoutChanges) {
      localStorage.setItem('webnixo_global_payouts', JSON.stringify(sanitizedPayoutsList));
    }
    setGlobalPayouts(sanitizedPayoutsList);

    // 3. System Configuration
    const rate = localStorage.getItem('webnixo_commission_rate');
    const threshold = localStorage.getItem('webnixo_min_payout');
    if (rate) setSystemCommissionRate(Number(rate));
    if (threshold) setSystemMinPayout(Number(threshold));

    const stored199 = localStorage.getItem('webnixo_comm_199') || '39.80';
    const stored499 = localStorage.getItem('webnixo_comm_499') || '99.80';
    const stored999 = localStorage.getItem('webnixo_comm_999') || '199.80';
    setPlan199Comm(Number(stored199));
    setPlan499Comm(Number(stored499));
    setPlan999Comm(Number(stored999));

    // 4. Load admin password and marketing resources
    const storedAdminPass = localStorage.getItem('webnixo_admin_password') || '123456';
    setAdminPassword(storedAdminPass);

    const storedLogo = localStorage.getItem('webnixo_marketing_logoUrl') || 'https://lh3.googleusercontent.com/d/11yuTE40NZx1imt0DARVHUfIPTrgtrJA6=s512';
    setMarketingLogoUrl(storedLogo);

    const storedVideo = localStorage.getItem('webnixo_marketing_videoCode') || `<iframe width="560" height="315" src="https://www.youtube.com/embed/placeholder" title="WEBNIXO AI Overview" frameborder="0" allowfullscreen></iframe>`;
    setMarketingVideoCode(storedVideo);

    const storedBanners = localStorage.getItem('webnixo_marketing_banners');
    if (storedBanners) {
      try {
        const parsedBanners = JSON.parse(storedBanners);
        const lBanner = parsedBanners.find((b: any) => b.id === 'banner-leaderboard');
        if (lBanner) {
          setMarketingBannerLeaderboardTitle(lBanner.title);
          setMarketingBannerLeaderboardDesc(lBanner.description);
        }
        const sBanner = parsedBanners.find((b: any) => b.id === 'banner-square');
        if (sBanner) {
          setMarketingBannerSquareTitle(sBanner.title);
          setMarketingBannerSquareDesc(sBanner.description);
        }
        const socBanner = parsedBanners.find((b: any) => b.id === 'banner-social');
        if (socBanner) {
          setMarketingBannerSocialTitle(socBanner.title);
          setMarketingBannerSocialDesc(socBanner.description);
        }
      } catch (e) {
        console.error("Failed to parse banners", e);
      }
    } else {
      setMarketingBannerLeaderboardTitle('Leaderboard Banner (728 x 90)');
      setMarketingBannerLeaderboardDesc('Ideal for header or footer spaces on blogs and content websites.');
      setMarketingBannerSquareTitle('Medium Rectangle (300 x 250)');
      setMarketingBannerSquareDesc('Perfect for sidebar placements, widget zones, or in-article content.');
      setMarketingBannerSocialTitle('Social Post / Square (1080 x 1080)');
      setMarketingBannerSocialDesc('High-resolution square format tailored for LinkedIn, Twitter, or Instagram.');
    }

    // Load from Supabase if configured
    if (isSupabaseConfigured()) {
      loadAllProfilesFromSupabase().then(remoteProfiles => {
        if (remoteProfiles && remoteProfiles.length > 0) {
          setGlobalAffiliates(prev => {
            const combined = [...prev];
            remoteProfiles.forEach(remote => {
              if (remote.email === 'shiva@webnixo.in') return;
              
              const email = (remote.email || '').toLowerCase().trim();
              if (
                remote.id === 'user_1' ||
                remote.id === 'user_2' ||
                remote.id === 'user_3' ||
                remote.id === 'user_4' ||
                remote.id === 'user_5' ||
                email === 'aravind.s@gmail.com' ||
                email === 'priya.patel@outlook.com' ||
                email === 'rahul.sharma@gmail.com' ||
                email === 'info@techvantage.ai' ||
                email === 'deepak.v@designcraft.io'
              ) return; // Skip mock profile
              
              const idx = combined.findIndex(u => u.email === remote.email);
              const mappedAffiliate: GlobalAffiliate = {
                id: remote.id,
                email: remote.email,
                password: remote.password || 'password123',
                fullName: remote.fullName,
                companyName: remote.companyName,
                website: remote.website,
                promoStrategy: remote.promoStrategy,
                country: remote.country,
                referralCode: remote.referralCode,
                customCouponCode: remote.customCouponCode,
                sales: remote.sales,
                commissionEarned: remote.commissionEarned,
                unpaidCommission: remote.unpaidCommission,
                payoutMethod: remote.payoutMethod,
                payoutDetails: remote.payoutDetails,
                status: remote.status || 'Active'
              };
              if (idx >= 0) {
                combined[idx] = mappedAffiliate;
              } else {
                combined.push(mappedAffiliate);
              }
            });
            localStorage.setItem('webnixo_global_users', JSON.stringify(combined));
            return combined;
          });
        }
      }).catch(err => console.warn("Could not load global profiles from Supabase:", err));

      loadAllPayoutsFromSupabase().then(remotePayouts => {
        if (remotePayouts && remotePayouts.length > 0) {
          setGlobalPayouts(prev => {
            const combined = [...prev];
            remotePayouts.forEach(remote => {
              const dest = (remote.destination || '').toLowerCase();
              if (
                remote.id === 'pay_1' ||
                remote.id === 'pay_2' ||
                remote.id?.startsWith('pay_mock') ||
                dest.includes('aravind@okaxis') ||
                dest.includes('sharma@paytm') ||
                dest.includes('shivu@okaxis') ||
                dest.includes('hdfc bank') ||
                dest.includes('icici bank')
              ) return; // Skip mock payout

              const idx = combined.findIndex(p => p.id === remote.id);
              const mappedPayout: PayoutHistoryItem = {
                id: remote.id,
                amount: remote.amount,
                date: remote.date,
                method: remote.method as 'upi' | 'bank',
                destination: remote.destination,
                status: remote.status as 'Pending' | 'Credited',
                transactionId: remote.transactionId
              };
              // Add custom email attribute
              (mappedPayout as any).userEmail = remote.userEmail;

              if (idx >= 0) {
                combined[idx] = mappedPayout;
              } else {
                combined.push(mappedPayout);
              }
            });
            localStorage.setItem('webnixo_global_payouts', JSON.stringify(combined));
            return combined;
          });
        }
      }).catch(err => console.warn("Could not load global payouts from Supabase:", err));

      loadSubscriptionPlansFromSupabase().then(plans => {
        if (plans && plans.length > 0) {
          setSubscriptionPlans(plans);
        } else {
          // Defaults if empty or fails
          setSubscriptionPlans([
            { id: 'free', name: 'Starter Plan', cost: 0, period: 'forever', is_active: true },
            { id: 'monthly', name: 'Monthly Pass', cost: 49, period: 'mo', is_active: true },
            { id: 'premium', name: 'Premium Pass', cost: 99, period: 'mo', is_active: true },
            { id: 'yearly', name: 'Yearly Elite', cost: 499, period: 'yr', is_active: true },
            { id: 'refill_500', name: '500 Credits', cost: 159, period: 'one-time', is_active: true },
            { id: 'refill_1500', name: '1500 Credits', cost: 349, period: 'one-time', is_active: true },
            { id: 'refill_3500', name: '3500 Credits', cost: 599, period: 'one-time', is_active: true },
            { id: 'refill_8000', name: '8000 Credits', cost: 999, period: 'one-time', is_active: true },
            { id: 'refill_20000', name: '20000 Credits', cost: 1999, period: 'one-time', is_active: true }
          ]);
        }
      }).catch(err => console.warn("Could not load subscription plans from Supabase:", err));

      // Check connection and schema health
      checkSupabaseConnection().then(connected => {
        if (connected) {
          setSupabaseStatus('connected');
        } else {
          if (supabaseErrorState.hasSchemaError) {
            setSupabaseStatus('schema_missing');
            setSupabaseMsg(supabaseErrorState.errorMessage);
          } else {
            setSupabaseStatus('disconnected');
          }
        }
      }).catch(() => {
        setSupabaseStatus('disconnected');
      });
    } else {
      setSupabaseStatus('disconnected');
    }

  }, []);

  // Sync back state helpers
  const saveGlobalState = (updatedAffiliates: GlobalAffiliate[], updatedPayouts: PayoutHistoryItem[]) => {
    setGlobalAffiliates(updatedAffiliates);
    setGlobalPayouts(updatedPayouts);
    localStorage.setItem('webnixo_global_users', JSON.stringify(updatedAffiliates));
    localStorage.setItem('webnixo_global_payouts', JSON.stringify(updatedPayouts));

    // Also check if any of these changes affect the currently logged-in user simulation
    const localActiveUser = localStorage.getItem('wwebnixo_affiliate_user');
    if (localActiveUser) {
      const parsedUser = JSON.parse(localActiveUser);
      const match = updatedAffiliates.find(u => u.email === parsedUser.email);
      if (match) {
        // Sync stats
        const activeStats = {
          clicks: 250, // default placeholder click density
          signups: match.sales * 6,
          sales: match.sales,
          commissionEarned: match.commissionEarned,
          unpaidCommission: match.unpaidCommission,
          payoutStatus: match.unpaidCommission === 0 ? 'Paid' as const : 'Pending' as const
        };
        localStorage.setItem('wwebnixo_affiliate_stats', JSON.stringify(activeStats));

        // Sync payout history specific to current user
        const matchedPayouts = updatedPayouts.filter(p => 
          p.destination === match.payoutDetails || 
          p.destination.includes(match.payoutDetails.slice(-4)) ||
          p.destination === match.email
        );
        if (matchedPayouts.length > 0) {
          localStorage.setItem('wwebnixo_affiliate_payout_history', JSON.stringify(matchedPayouts));
        }
      }
    }

    // --- SUPABASE SYNCHRONIZATION ---
    if (isSupabaseConfigured()) {
      // 1. Sync updated affiliate profiles
      updatedAffiliates.forEach(affiliate => {
        // Exclude local initial mock users unless they are modified, but upsert is safe
        const mappedUser: UserProfile = {
          id: affiliate.id,
          email: affiliate.email,
          password: affiliate.password,
          fullName: affiliate.fullName,
          phone: '',
          companyName: affiliate.companyName,
          website: affiliate.website,
          promoStrategy: affiliate.promoStrategy,
          country: affiliate.country,
          isRegisteredAffiliate: affiliate.isRegisteredAffiliate || true,
          referralCode: affiliate.referralCode,
          customCouponCode: affiliate.customCouponCode,
          joinedAt: affiliate.joinedAt || new Date().toISOString()
        };

        const mappedStats: AffiliateStats = {
          clicks: affiliate.sales * 12,
          signups: affiliate.sales * 6,
          sales: affiliate.sales,
          commissionEarned: affiliate.commissionEarned,
          unpaidCommission: affiliate.unpaidCommission,
          payoutStatus: affiliate.unpaidCommission === 0 ? 'Paid' : 'Pending'
        };

        const mappedPayout: PayoutDetails = affiliate.payoutMethod === 'upi' ? {
          payoutMethod: 'upi',
          upiId: affiliate.payoutDetails,
          bankName: '',
          accountNumber: '',
          accountHolderName: '',
          ifscCode: ''
        } : {
          payoutMethod: 'bank',
          upiId: '',
          bankName: affiliate.payoutDetails.split(' (')[0] || affiliate.payoutDetails,
          accountNumber: affiliate.payoutDetails.includes('A/C:') ? affiliate.payoutDetails.split('A/C: ')[1]?.split(',')[0] || '' : '',
          accountHolderName: '',
          ifscCode: affiliate.payoutDetails.includes('IFSC:') ? affiliate.payoutDetails.split('IFSC: ')[1]?.replace(')', '') || '' : ''
        };

        syncProfileToSupabase(mappedUser, mappedStats, mappedPayout).catch(e => {
          console.warn("Could not sync affiliate updates to Supabase:", e);
        });
      });

      // 2. Sync payouts grouped by email
      const payoutsByEmail: Record<string, PayoutHistoryItem[]> = {};
      updatedPayouts.forEach(p => {
        const email = (p as any).userEmail || p.destination || 'unknown@webnixo.in';
        if (!payoutsByEmail[email]) payoutsByEmail[email] = [];
        payoutsByEmail[email].push(p);
      });

      Object.entries(payoutsByEmail).forEach(([email, items]) => {
        syncPayoutsToSupabase(email, items).catch(e => {
          console.warn("Could not sync payouts updates to Supabase for email:", email, e);
        });
      });
    }
  };

  // Process a Payout Request (marking Credited and adding Transaction ID)
  const handleStartProcessPayout = (payout: PayoutHistoryItem) => {
    setEditingPayoutId(payout.id);
    setInputTxnId(payout.transactionId || 'TXN' + Math.floor(1000000000 + Math.random() * 9000000000));
    setInputStatus(payout.status);
  };

  const handleSaveProcessPayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayoutId) return;

    const targetPayout = globalPayouts.find(p => p.id === editingPayoutId);
    if (!targetPayout) return;

    const updatedPayouts = globalPayouts.map(p => {
      if (p.id === editingPayoutId) {
        return {
          ...p,
          status: inputStatus,
          transactionId: inputStatus === 'Credited' ? inputTxnId : undefined
        };
      }
      return p;
    });

    // If marked as Credited, we should also subtract this from the affiliate's unpaid commission balance
    // But wait! When the user clicks "Request Payout Now" in their dashboard, they already reset their unpaid commission to 0.
    // If we mark it from here, we find the affiliate corresponding to this payout destination/user and sync up.
    let updatedAffiliates = [...globalAffiliates];
    
    // Attempt to locate affiliate by matching payout details
    const matchedAffiliate = globalAffiliates.find(u => 
      u.payoutDetails === targetPayout.destination || 
      targetPayout.destination.includes(u.payoutDetails) ||
      (u.payoutDetails && u.payoutDetails.length > 4 && targetPayout.destination.includes(u.payoutDetails.slice(-4)))
    );

    if (matchedAffiliate && inputStatus === 'Credited' && targetPayout.status !== 'Credited') {
      updatedAffiliates = globalAffiliates.map(u => {
        if (u.id === matchedAffiliate.id) {
          return {
            ...u,
            unpaidCommission: Math.max(0, u.unpaidCommission - targetPayout.amount)
          };
        }
        return u;
      });
    }

    saveGlobalState(updatedAffiliates, updatedPayouts);
    setEditingPayoutId(null);
  };

  const handleSaveSubscriptionPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlanId) return;

    const currentPlan = subscriptionPlans.find(p => p.id === editingPlanId);
    if (!currentPlan) return;

    const updatedPlan: SubscriptionPlan = {
      ...currentPlan,
      ...editPlanData
    };

    if (isSupabaseConfigured()) {
      const { success, error } = await saveSubscriptionPlanToSupabase(updatedPlan);
      if (!success) {
        alert("Failed to save to database: " + error + "\nMake sure you have run the SQL script in Supabase SQL Editor to create the table and policies.");
        return; // Stop and don't update local state if database save fails
      }
    }

    const updatedPlans = subscriptionPlans.map(p => p.id === editingPlanId ? updatedPlan : p);
    setSubscriptionPlans(updatedPlans);
    setEditingPlanId(null);
    setEditPlanData({});
  };

  // Toggle Suspended status
  const handleToggleSuspend = (id: string) => {
    const updated = globalAffiliates.map(u => {
      if (u.id === id) {
        return {
          ...u,
          status: u.status === 'Active' ? 'Suspended' as const : 'Active' as const
        };
      }
      return u;
    });
    saveGlobalState(updated, globalPayouts);
  };

  // Delete/Deactivate Coupon
  const handleToggleCoupon = (id: string) => {
    const updated = globalAffiliates.map(u => {
      if (u.id === id) {
        return {
          ...u,
          customCouponCode: undefined // Or deactivate
        };
      }
      return u;
    });
    saveGlobalState(updated, globalPayouts);
  };

  // Injected Click/Signup/Sale generator for test automation
  const handleInjectAction = (id: string) => {
    setSelectedPartnerForSale(id);
    setInjectionType('sale');
  };

  const handleExecuteInjection = () => {
    if (!selectedPartnerForSale) return;

    const partner = globalAffiliates.find(u => u.id === selectedPartnerForSale);
    if (!partner) return;

    let updatedAffiliates = [...globalAffiliates];

    if (injectionType === 'sale') {
      let commEarned = injectionPlan * (systemCommissionRate / 100);
      if (injectionPlan === 199) commEarned = plan199Comm;
      else if (injectionPlan === 499) commEarned = plan499Comm;
      else if (injectionPlan === 999) commEarned = plan999Comm;

      updatedAffiliates = globalAffiliates.map(u => {
        if (u.id === selectedPartnerForSale) {
          return {
            ...u,
            sales: u.sales + 1,
            commissionEarned: u.commissionEarned + commEarned,
            unpaidCommission: u.unpaidCommission + commEarned
          };
        }
        return u;
      });
    } else if (injectionType === 'signup') {
      // Just mock logging
    }

    saveGlobalState(updatedAffiliates, globalPayouts);
    setSelectedPartnerForSale(null);
    
    // Add real-time event logs to general events list
    const activeEvents = localStorage.getItem('wwebnixo_affiliate_events');
    const parsedEvents: ReferralEvent[] = activeEvents ? JSON.parse(activeEvents) : [];
    
    const commValue = injectionType === 'sale' 
      ? (injectionPlan === 199 ? plan199Comm : injectionPlan === 499 ? plan499Comm : injectionPlan === 999 ? plan999Comm : injectionPlan * (systemCommissionRate / 100)) 
      : undefined;

    const newLog: ReferralEvent = {
      id: Math.random().toString(),
      type: injectionType === 'sale' ? 'sale' : 'signup',
      details: injectionType === 'sale' 
        ? `Injected Sale (₹${injectionPlan}) - Earned ₹${commValue?.toFixed(2)} Commission for ${partner.fullName}`
        : `Injected Trial Signup for ${partner.fullName}`,
      timestamp: 'Just now',
      commission: commValue
    };

    localStorage.setItem('wwebnixo_affiliate_events', JSON.stringify([newLog, ...parsedEvents.slice(0, 19)]));
  };

  const convertGoogleDriveUrl = (url: string) => {
    if (!url) return '';
    const cleanUrl = url.trim();
    if (cleanUrl.includes('drive.google.com') || cleanUrl.includes('docs.google.com') || cleanUrl.includes('googleusercontent.com')) {
      const match = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || cleanUrl.match(/id=([a-zA-Z0-9_-]+)/) || cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}=s512`;
      }
    }
    return cleanUrl;
  };

  // Save System configs
  const handleSaveSystemConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('webnixo_commission_rate', systemCommissionRate.toString());
    localStorage.setItem('webnixo_min_payout', systemMinPayout.toString());
    
    // Save custom plan commissions
    localStorage.setItem('webnixo_comm_199', plan199Comm.toString());
    localStorage.setItem('webnixo_comm_499', plan499Comm.toString());
    localStorage.setItem('webnixo_comm_999', plan999Comm.toString());

    // Save admin password
    localStorage.setItem('webnixo_admin_password', adminPassword);

    // Parse & Save logo Url
    const finalizedLogoUrl = convertGoogleDriveUrl(marketingLogoUrl);
    localStorage.setItem('webnixo_marketing_logoUrl', finalizedLogoUrl);
    setMarketingLogoUrl(finalizedLogoUrl);

    // Save video code
    localStorage.setItem('webnixo_marketing_videoCode', marketingVideoCode);

    // Save customized banners
    const customizedBannersList = [
      { id: 'banner-leaderboard', title: marketingBannerLeaderboardTitle, description: marketingBannerLeaderboardDesc },
      { id: 'banner-square', title: marketingBannerSquareTitle, description: marketingBannerSquareDesc },
      { id: 'banner-social', title: marketingBannerSocialTitle, description: marketingBannerSocialDesc },
    ];
    localStorage.setItem('webnixo_marketing_banners', JSON.stringify(customizedBannersList));

    // Push live sync to Supabase
    if (isSupabaseConfigured()) {
      syncSettingsToSupabase({
        commission_rate: systemCommissionRate.toString(),
        min_payout: systemMinPayout.toString(),
        comm_199: plan199Comm.toString(),
        comm_499: plan499Comm.toString(),
        comm_999: plan999Comm.toString(),
        admin_password: adminPassword,
        marketing_logoUrl: finalizedLogoUrl,
        marketing_videoCode: marketingVideoCode,
        marketing_banners: JSON.stringify(customizedBannersList)
      }).catch(err => {
        console.warn("Failed to sync system configuration to Supabase:", err);
      });
    }

    setShowConfigSuccess(true);
    setTimeout(() => setShowConfigSuccess(false), 3000);
  };

  // Filter lists
  const filteredPayouts = globalPayouts.filter(p => {
    const matchesSearch = p.destination.toLowerCase().includes(payoutSearch.toLowerCase()) || 
                          p.amount.toString().includes(payoutSearch);
    const matchesFilter = payoutFilter === 'All' || p.status === payoutFilter;
    return matchesSearch && matchesFilter;
  });

  const filteredPartners = globalAffiliates.filter(u => {
    const matchesSearch = u.fullName.toLowerCase().includes(partnerSearch.toLowerCase()) || 
                          u.email.toLowerCase().includes(partnerSearch.toLowerCase()) ||
                          u.referralCode.toLowerCase().includes(partnerSearch.toLowerCase());
    const matchesFilter = partnerFilter === 'All' || u.status === partnerFilter;
    return matchesSearch && matchesFilter;
  });

  // Calculate global aggregate statistics
  const totalPayoutsProcessed = globalPayouts
    .filter(p => p.status === 'Credited')
    .reduce((sum, p) => sum + p.amount, 0);

  const outstandingPayouts = globalPayouts
    .filter(p => p.status === 'Pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalRegisteredAffiliates = globalAffiliates.length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" id="admin-portal-wrapper">
      {/* Admin Top Header */}
      <header className="border-b border-slate-900 bg-slate-950 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-tr from-amber-500 to-orange-600 text-white font-extrabold text-sm px-2.5 py-1.5 rounded-xl shadow-md">
            W
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-white">WEBNIXO AI</span>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 font-bold px-1.5 py-0.5 rounded border border-amber-500/20">ADMIN CONTROL</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Internal Affiliate Management Terminal</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-white">Shiva Admin</span>
            <span className="text-[9px] text-emerald-400 font-mono font-bold">● SYSTEM ONLINE</span>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-red-950/40 text-[11px] font-bold text-slate-300 hover:text-red-300 rounded-xl border border-slate-800 hover:border-red-900/40 transition-all cursor-pointer"
            id="admin-logout-btn"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Grid View */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        
        {/* Statistics Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Pending Payouts</span>
              <div className="h-8 w-8 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center border border-amber-500/20">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-white font-sans">₹{outstandingPayouts.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
              <p className="text-[9px] text-slate-400 mt-1">Outstanding liabilities needing clearance</p>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Processed Payouts</span>
              <div className="h-8 w-8 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-white font-sans">₹{totalPayoutsProcessed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
              <p className="text-[9px] text-slate-400 mt-1">Commissions paid out successfully</p>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Affiliate Partners</span>
              <div className="h-8 w-8 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-white font-sans">{totalRegisteredAffiliates}</h3>
              <p className="text-[9px] text-slate-400 mt-1">Total verified brand promoters</p>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Avg Commission</span>
              <div className="h-8 w-8 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center border border-rose-500/20">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-white font-sans">{systemCommissionRate}%</h3>
              <p className="text-[9px] text-slate-400 mt-1">Default recurring split per sale</p>
            </div>
          </div>
        </div>

        {/* Dynamic Navigation Rails */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-900 pb-2 gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/50 rounded-xl max-w-full overflow-x-auto scrollbar-none whitespace-nowrap">
            <button
              onClick={() => setActiveTab('payouts')}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'payouts'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              Payout Withdrawals
            </button>
            <button
              onClick={() => setActiveTab('partners')}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'partners'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
              }`}
            >
              <Users className="h-4 w-4" />
              Promoters & Affiliates
            </button>
            <button
              onClick={() => setActiveTab('coupons')}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'coupons'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
              }`}
            >
              <Ticket className="h-4 w-4" />
              Affiliate Coupons
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'settings'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
              }`}
            >
              <Sliders className="h-4 w-4" />
              Settings
            </button>
            <button
              onClick={() => setActiveTab('plans')}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'plans'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
              }`}
            >
              <Database className="h-4 w-4" />
              Subscription Plans
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-600" />
            <span>State synchronized in live workspace</span>
          </div>
        </div>

        {/* Tab 1: Payout Withdrawals Handling */}
        {activeTab === 'payouts' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-bold text-white text-base">Affiliate Commission Claims</h4>
                <p className="text-xs text-slate-400">Review pending affiliate withdrawal requests, view account details, and stamp transaction hash codes.</p>
              </div>

              {/* Filtering Controls */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search destination..."
                    value={payoutSearch}
                    onChange={(e) => setPayoutSearch(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-xs text-slate-100 rounded-xl pl-9 pr-4 py-2 w-48 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <select
                  value={payoutFilter}
                  onChange={(e) => setPayoutFilter(e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 text-xs text-slate-100 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                >
                  <option value="All">All Payouts</option>
                  <option value="Pending">Pending Only</option>
                  <option value="Credited">Credited Only</option>
                </select>
              </div>
            </div>

            {/* Editing/Processing Modal Card */}
            {editingPayoutId && (
              <div className="bg-slate-900 border-2 border-amber-500/40 rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h5 className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                    <Sliders className="h-4.5 w-4.5" />
                    Process Commission Withdrawal
                  </h5>
                  <button 
                    onClick={() => setEditingPayoutId(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveProcessPayout} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Transaction Reference ID (Trxn ID)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. TXN29381029318"
                      value={inputTxnId}
                      onChange={(e) => setInputTxnId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Claim Status</label>
                    <select
                      value={inputStatus}
                      onChange={(e) => setInputStatus(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="Pending">Pending Validation</option>
                      <option value="Credited">Credited / Disbursed</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs py-2 rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      Apply Stamp
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingPayoutId(null)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2 rounded-xl transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* List Table */}
            <div className="bg-slate-900/20 border border-slate-900 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-900 bg-slate-900/40 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="p-4">Claim Date</th>
                      <th className="p-4">Payout Method</th>
                      <th className="p-4">Destination Target</th>
                      <th className="p-4 text-right">Commission Amount</th>
                      <th className="p-4">Verification Status</th>
                      <th className="p-4">Transaction ID</th>
                      <th className="p-4 text-right">Administrative Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-xs">
                    {filteredPayouts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          <CreditCard className="h-8 w-8 mx-auto text-slate-700 mb-2" />
                          <p className="font-bold">No claims match the search query</p>
                          <p className="text-[10px] text-slate-600">Pending or approved payout claims will list here</p>
                        </td>
                      </tr>
                    ) : (
                      filteredPayouts.map((payout) => (
                        <tr key={payout.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="p-4 font-mono text-slate-300">{payout.date}</td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-800 text-indigo-300 uppercase border border-indigo-500/10">
                              {payout.method}
                            </span>
                          </td>
                          <td className="p-4 font-medium text-white">{payout.destination}</td>
                          <td className="p-4 text-right font-black font-sans text-white">₹{payout.amount.toFixed(2)}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              payout.status === 'Credited'
                              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-950/40 text-amber-400 border border-amber-500/20 animate-pulse'
                            }`}>
                              {payout.status === 'Credited' ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                              {payout.status}
                            </span>
                          </td>
                          <td className="p-4">
                            {payout.transactionId ? (
                              <code className="text-[11px] text-slate-300 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800/40 font-mono">{payout.transactionId}</code>
                            ) : (
                              <span className="text-slate-600 font-mono">—</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleStartProcessPayout(payout)}
                              className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
                              id={`process-btn-${payout.id}`}
                            >
                              <Sliders className="h-3 w-3" />
                              {payout.status === 'Credited' ? 'Re-issue' : 'Credit Payout'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Partner Directory */}
        {activeTab === 'partners' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-bold text-white text-base">WWEBNIXO Promoters Ledger</h4>
                <p className="text-xs text-slate-400">View performance indices, approve/suspend user accounts, and manually inject client sales for diagnostic verification.</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search name/email/code..."
                    value={partnerSearch}
                    onChange={(e) => setPartnerSearch(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-xs text-slate-100 rounded-xl pl-9 pr-4 py-2 w-48 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <select
                  value={partnerFilter}
                  onChange={(e) => setPartnerFilter(e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 text-xs text-slate-100 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                >
                  <option value="All">All Partners</option>
                  <option value="Active">Active Only</option>
                  <option value="Suspended">Suspended Only</option>
                </select>
              </div>
            </div>

            {/* Inject Sale dialogue modal */}
            {selectedPartnerForSale && (
              <div className="bg-slate-900 border-2 border-indigo-500/40 rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h5 className="text-sm font-bold text-indigo-400 flex items-center gap-1.5">
                    <Sparkles className="h-4.5 w-4.5" />
                    Manually Inject Simulated Conversion Events
                  </h5>
                  <button 
                    onClick={() => setSelectedPartnerForSale(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Interaction Target</label>
                    <select
                      value={injectionType}
                      onChange={(e) => setInjectionType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="sale">Convert Paid Subscriber</option>
                      <option value="signup">Trial Sign-Up</option>
                    </select>
                  </div>

                  {injectionType === 'sale' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Customer Plan Type</label>
                      <select
                        value={injectionPlan}
                        onChange={(e) => setInjectionPlan(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value={199}>₹199 Starter Plan</option>
                        <option value={499}>₹499 Pro AI Plan</option>
                        <option value={999}>₹999 Enterprise Plan</option>
                      </select>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleExecuteInjection}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2 rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      Inject Event
                    </button>
                    <button
                      onClick={() => setSelectedPartnerForSale(null)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2 rounded-xl transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Partners Table */}
            <div className="bg-slate-900/20 border border-slate-900 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-900 bg-slate-900/40 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="p-4">Affiliate Name</th>
                      <th className="p-4">Email Address</th>
                      <th className="p-4">User Password</th>
                      <th className="p-4">Ref Code / Coupon</th>
                      <th className="p-4 text-right">Referral Sales</th>
                      <th className="p-4 text-right">Total Commission</th>
                      <th className="p-4 text-right">Unpaid Balance</th>
                      <th className="p-4">System Status</th>
                      <th className="p-4 text-right">Partner Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-xs">
                    {filteredPartners.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-500">
                          <Users className="h-8 w-8 mx-auto text-slate-700 mb-2" />
                          <p className="font-bold">No affiliates match search criteria</p>
                        </td>
                      </tr>
                    ) : (
                      filteredPartners.map((partner) => (
                        <tr key={partner.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="p-4 font-bold text-white flex items-center gap-2">
                            <div className="h-6 w-6 bg-slate-800 rounded-md flex items-center justify-center font-bold text-[10px] text-slate-300">
                              {partner.fullName.slice(0, 2).toUpperCase()}
                            </div>
                            {partner.fullName}
                          </td>
                          <td className="p-4 font-mono text-slate-300">{partner.email}</td>
                          <td className="p-4">
                            <span className="font-mono text-amber-400 bg-amber-950/20 border border-amber-900/10 px-2 py-0.5 rounded select-all font-semibold">
                              {partner.password || 'password123'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <span className="font-mono text-[11px] bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-indigo-300 block w-fit">
                                {partner.referralCode}
                              </span>
                              {partner.customCouponCode ? (
                                <span className="font-mono text-[10px] bg-indigo-950/30 px-1.5 py-0.5 rounded border border-indigo-500/20 text-indigo-400 block w-fit">
                                  🎟️ {partner.customCouponCode}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-600 font-medium">No active coupon</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-right font-black text-white">{partner.sales} sales</td>
                          <td className="p-4 text-right font-black font-sans text-emerald-400">₹{partner.commissionEarned.toFixed(2)}</td>
                          <td className="p-4 text-right font-black font-sans text-amber-500">₹{partner.unpaidCommission.toFixed(2)}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              partner.status === 'Active'
                              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
                              : 'bg-red-950/40 text-red-400 border border-red-500/20'
                            }`}>
                              {partner.status === 'Active' ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleInjectAction(partner.id)}
                                className="px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                title="Inject simulation event"
                              >
                                <Play className="h-3 w-3" />
                                Inject Sale
                              </button>
                              <button
                                onClick={() => handleToggleSuspend(partner.id)}
                                className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                                  partner.status === 'Active'
                                  ? 'bg-red-950/40 hover:bg-red-950 text-red-400 hover:text-red-300 border border-red-900/30'
                                  : 'bg-emerald-950/40 hover:bg-emerald-950 text-emerald-400 hover:text-emerald-300 border border-emerald-900/30'
                                }`}
                              >
                                <Ban className="h-3 w-3" />
                                {partner.status === 'Active' ? 'Suspend' : 'Activate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Campaign Coupons Directory */}
        {activeTab === 'coupons' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h4 className="font-bold text-white text-base">Campaign Discount Coupons</h4>
              <p className="text-xs text-slate-400">Manage all customized 10% discount codes claimed by affiliate promoters. Track active uses and approve/delete codes.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {globalAffiliates
                .filter(u => u.customCouponCode)
                .map((user) => (
                  <div key={user.id} className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 bg-indigo-600/20 text-indigo-300 font-black text-xs rounded-lg flex items-center justify-center">
                          🎟️
                        </div>
                        <div>
                          <h5 className="font-bold text-white text-xs">{user.customCouponCode}</h5>
                          <span className="text-[10px] text-slate-400">Created by {user.fullName}</span>
                        </div>
                      </div>

                      <span className="text-[9px] bg-emerald-950/40 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                        10% Off
                      </span>
                    </div>

                    <div className="bg-slate-950/40 rounded-xl p-3 text-[11px] space-y-1 font-mono text-slate-400">
                      <div className="flex justify-between">
                        <span>Associated Ref:</span>
                        <span className="text-white font-bold">{user.referralCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Sales:</span>
                        <span className="text-white font-bold">{user.sales}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Estimated Comm.:</span>
                        <span className="text-emerald-400 font-bold">₹{(user.commissionEarned).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleCoupon(user.id)}
                        className="flex-1 bg-red-950/40 hover:bg-red-950 border border-red-900/30 hover:border-red-500/20 text-red-400 hover:text-red-300 font-bold text-[10px] py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Revoke Coupon
                      </button>
                    </div>
                  </div>
                ))}

              {globalAffiliates.filter(u => u.customCouponCode).length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500">
                  <Ticket className="h-10 w-10 mx-auto text-slate-700 mb-2" />
                  <p className="font-bold">No custom discount coupons created yet</p>
                  <p className="text-[11px] text-slate-600">Coupons requested by affiliates will display here for monitoring.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Settings */}
        {activeTab === 'settings' && (
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 max-w-2xl mx-auto space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h4 className="font-bold text-white text-base">Global Affiliate System Configurations</h4>
              <p className="text-xs text-slate-400">Control system-wide affiliate settings instantly. Changes apply to simulated profiles immediately.</p>
            </div>

            {/* Supabase Status Panel */}
            <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-indigo-400" />
                  <div>
                    <h5 className="font-bold text-slate-200 text-xs uppercase tracking-wider">Supabase Live Connection Status</h5>
                    <p className="text-[10px] text-slate-500 font-medium">Real-time cloud backup & synchronization</p>
                  </div>
                </div>
                {supabaseStatus === 'testing' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 animate-pulse">Checking...</span>
                )}
                {supabaseStatus === 'connected' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live & Synced
                  </span>
                )}
                {supabaseStatus === 'schema_missing' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-500/20">Missing Schema</span>
                )}
                {supabaseStatus === 'disconnected' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-500/20">Inactive / Offline</span>
                )}
              </div>

              {supabaseStatus === 'schema_missing' && (
                <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-xl space-y-2">
                  <p className="text-[10px] text-amber-300 leading-relaxed">
                    <strong>Connection Succeeded</strong>, but the required tables do not exist in your Supabase project yet! The application is running smoothly on local storage fallback. Run the SQL script below in your Supabase Dashboard to complete live cloud storage setup.
                  </p>
                  <button 
                    type="button"
                    onClick={() => setShowSqlSetup(!showSqlSetup)}
                    className="text-[10px] font-extrabold text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1 cursor-pointer"
                  >
                    {showSqlSetup ? 'Hide SQL Script' : 'Get SQL Initialization Script →'}
                  </button>
                </div>
              )}

              {supabaseStatus === 'connected' && (
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Your WebNixo platform is officially connected to live cloud databases! All affiliate accounts, payout lists, clicks/leads events, and site configuration parameters are automatically mirrored to your Supabase instance.
                </p>
              )}

              {supabaseStatus === 'disconnected' && (
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Supabase connection is not active. The applet is currently operating offline using secure local storage. Update your credentials inside <code>.env</code> to activate.
                  </p>
                  {isSupabaseConfigured() && (
                    <button
                      type="button"
                      onClick={() => setShowSqlSetup(!showSqlSetup)}
                      className="text-[10px] font-extrabold text-indigo-400 hover:text-indigo-300 underline mt-2 block cursor-pointer"
                    >
                      {showSqlSetup ? 'Hide Setup Help' : 'View Schema Database Setup Instructions →'}
                    </button>
                  )}
                </div>
              )}

              {showSqlSetup && (
                <div className="p-4 bg-slate-950 border border-slate-900 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Supabase SQL Schema Script</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(getSQLInitializationScript());
                        setCopiedSql(true);
                        setTimeout(() => setCopiedSql(false), 2000);
                      }}
                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-indigo-400 rounded-lg flex items-center gap-1 border border-slate-800 cursor-pointer"
                    >
                      {copiedSql ? (
                        <>
                          <CheckCircle className="h-3 w-3 text-emerald-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copy Script
                        </>
                      )}
                    </button>
                  </div>
                  
                  <div className="text-[10px] text-slate-400 space-y-1">
                    <p>1. Open your <strong>Supabase Project Dashboard</strong>.</p>
                    <p>2. Select the <strong>SQL Editor</strong> tab from the left sidebar.</p>
                    <p>3. Create a <strong>New Query</strong>, paste this script, and click <strong>Run</strong>.</p>
                  </div>

                  <pre className="p-3 bg-slate-950 border border-slate-800 text-[9px] text-indigo-300 font-mono overflow-x-auto max-h-48 rounded-lg">
                    {getSQLInitializationScript()}
                  </pre>
                </div>
              )}
            </div>

            {showConfigSuccess && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2 font-bold animate-pulse">
                <Check className="h-4 w-4" />
                Global affiliate system settings updated successfully!
              </div>
            )}

            <form onSubmit={handleSaveSystemConfig} className="space-y-6">
              <div className="bg-slate-950/20 border border-slate-800/60 rounded-2xl p-4 space-y-4">
                <h5 className="font-bold text-amber-500 text-xs uppercase tracking-wider">Affiliate Commission Structures</h5>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Default Commission Ratio (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={systemCommissionRate}
                      onChange={(e) => setSystemCommissionRate(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
                    />
                    <span className="absolute right-4 top-2 text-slate-500 text-sm font-bold">%</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">Current model pays a flat percentage out-of-the-box on client conversions (Starter, Pro, Enterprise).</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Minimum Payout Threshold (₹)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={100}
                      value={systemMinPayout}
                      onChange={(e) => setSystemMinPayout(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
                    />
                    <span className="absolute right-4 top-2 text-slate-500 text-sm font-sans font-bold">₹</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">Minimum unpaid commissions needed for affiliates to trigger instant checkout.</span>
                </div>

                {/* Individual plan commissions editable fields */}
                <div className="pt-4 border-t border-slate-800/60 space-y-3">
                  <h6 className="text-[11px] font-black text-indigo-400 uppercase tracking-widest block">Per-Plan Fixed Commissions (₹)</h6>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">₹199 Starter Plan</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={plan199Comm}
                          onChange={(e) => setPlan199Comm(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-3 pr-6 py-1.5 text-xs text-white focus:outline-none font-mono font-semibold"
                        />
                        <span className="absolute right-3 top-1.5 text-slate-500 text-xs font-bold">₹</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">₹499 Pro AI Plan</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={plan499Comm}
                          onChange={(e) => setPlan499Comm(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-3 pr-6 py-1.5 text-xs text-white focus:outline-none font-mono font-semibold"
                        />
                        <span className="absolute right-3 top-1.5 text-slate-500 text-xs font-bold">₹</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">₹999 Enterprise Plan</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={plan999Comm}
                          onChange={(e) => setPlan999Comm(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-3 pr-6 py-1.5 text-xs text-white focus:outline-none font-mono font-semibold"
                        />
                        <span className="absolute right-3 top-1.5 text-slate-500 text-xs font-bold">₹</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 block">Set the absolute Indian Rupee (₹) commission payout an affiliate earns for one referred purchase of each plan from the main website.</span>
                </div>
              </div>

              {/* ADMIN ACCOUNT SECURITY CARD */}
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                <h5 className="font-bold text-amber-500 text-xs uppercase tracking-wider">Admin Account Password</h5>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold block font-sans">Change Admin Password</label>
                  <input
                    type="text"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-2 text-sm text-white focus:outline-none font-mono"
                    placeholder="Enter new admin password"
                  />
                  <span className="text-[10px] text-slate-500 block">Changing this password updates Shiva's login credentials instantly.</span>
                </div>
              </div>

              {/* PROMOTIONAL MATERIALS & GOOGLE DRIVE MEDIA CARD */}
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 space-y-4">
                <div className="border-b border-slate-800 pb-2">
                  <h5 className="font-bold text-indigo-400 text-xs uppercase tracking-wider">Promotional Collateral (Google Drive Ready)</h5>
                  <p className="text-[10px] text-slate-400 mt-0.5">Customize default marketing items loaded in affiliate dashboards. Supports direct URL links or any standard Google Drive file share links.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-bold block">WEBNIXO AI Logo Asset Link (Google Drive / Direct URL)</label>
                  <input
                    type="text"
                    value={marketingLogoUrl}
                    onChange={(e) => setMarketingLogoUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none font-mono"
                    placeholder="e.g. https://drive.google.com/file/d/..."
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    💡 <strong>Google Drive Support:</strong> Paste any shared Drive link. We will automatically extract the file ID and configure direct web hotlinking!
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-bold block">YouTube Explainer Video Embed Iframe</label>
                  <textarea
                    rows={2}
                    value={marketingVideoCode}
                    onChange={(e) => setMarketingVideoCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none font-mono"
                    placeholder="<iframe width='560' height='315' ...></iframe>"
                  />
                  <span className="text-[10px] text-slate-500 block">Provide custom HTML embed code for promoters to share easily.</span>
                </div>

                {/* Banner 1 */}
                <div className="space-y-3 pt-2 border-t border-slate-800/60">
                  <h6 className="font-bold text-slate-400 text-[10px] uppercase">Leaderboard Banner Copy (728 x 90)</h6>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500">Banner Title</label>
                      <input
                        type="text"
                        value={marketingBannerLeaderboardTitle}
                        onChange={(e) => setMarketingBannerLeaderboardTitle(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500">Banner Description</label>
                      <input
                        type="text"
                        value={marketingBannerLeaderboardDesc}
                        onChange={(e) => setMarketingBannerLeaderboardDesc(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Banner 2 */}
                <div className="space-y-3 pt-2 border-t border-slate-800/60">
                  <h6 className="font-bold text-slate-400 text-[10px] uppercase">Square Banner Copy (300 x 250)</h6>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500">Banner Title</label>
                      <input
                        type="text"
                        value={marketingBannerSquareTitle}
                        onChange={(e) => setMarketingBannerSquareTitle(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500">Banner Description</label>
                      <input
                        type="text"
                        value={marketingBannerSquareDesc}
                        onChange={(e) => setMarketingBannerSquareDesc(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Banner 3 */}
                <div className="space-y-3 pt-2 border-t border-slate-800/60">
                  <h6 className="font-bold text-slate-400 text-[10px] uppercase">Social Post Square Copy (1080 x 1080)</h6>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500">Banner Title</label>
                      <input
                        type="text"
                        value={marketingBannerSocialTitle}
                        onChange={(e) => setMarketingBannerSocialTitle(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500">Banner Description</label>
                      <input
                        type="text"
                        value={marketingBannerSocialDesc}
                        onChange={(e) => setMarketingBannerSocialDesc(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs py-2.5 rounded-xl transition-all shadow-md cursor-pointer uppercase tracking-wider"
              >
                Save All Administrative Configurations
              </button>
            </form>
          </div>
        )}

        {/* Tab 5: Subscription Plans */}
        {activeTab === 'plans' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-bold text-white text-base">Subscription Plans</h4>
                <p className="text-xs text-slate-400">Manage the pricing and availability of your SaaS subscription tiers.</p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-950/80 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-800">
                    <tr>
                      <th className="p-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Plan ID</th>
                      <th className="p-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Name</th>
                      <th className="p-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Cost (₹)</th>
                      <th className="p-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Period</th>
                      <th className="p-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Status</th>
                      <th className="p-4 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {subscriptionPlans.map((plan) => (
                      <tr key={plan.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4">
                          <span className="font-mono text-slate-300">{plan.id}</span>
                        </td>
                        <td className="p-4">
                          {editingPlanId === plan.id ? (
                            <input
                              type="text"
                              value={editPlanData.name ?? plan.name}
                              onChange={(e) => setEditPlanData({ ...editPlanData, name: e.target.value })}
                              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white w-full"
                            />
                          ) : (
                            <span className="text-white font-bold">{plan.name}</span>
                          )}
                        </td>
                        <td className="p-4">
                          {editingPlanId === plan.id ? (
                            <input
                              type="number"
                              value={editPlanData.cost ?? plan.cost}
                              onChange={(e) => setEditPlanData({ ...editPlanData, cost: Number(e.target.value) })}
                              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white w-20"
                            />
                          ) : (
                            <span className="text-amber-400 font-bold">₹{plan.cost}</span>
                          )}
                        </td>
                        <td className="p-4">
                          {editingPlanId === plan.id ? (
                            <input
                              type="text"
                              value={editPlanData.period ?? plan.period}
                              onChange={(e) => setEditPlanData({ ...editPlanData, period: e.target.value })}
                              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white w-16"
                            />
                          ) : (
                            <span className="text-slate-300">{plan.period}</span>
                          )}
                        </td>
                        <td className="p-4">
                          {editingPlanId === plan.id ? (
                            <select
                              value={editPlanData.is_active ?? plan.is_active ? 'active' : 'inactive'}
                              onChange={(e) => setEditPlanData({ ...editPlanData, is_active: e.target.value === 'active' })}
                              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white"
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          ) : (
                            plan.is_active ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                                <CheckCircle className="h-3 w-3" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 text-[10px] font-bold border border-slate-500/20">
                                <Ban className="h-3 w-3" /> Inactive
                              </span>
                            )
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {editingPlanId === plan.id ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={handleSaveSubscriptionPlan}
                                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded font-bold transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingPlanId(null);
                                  setEditPlanData({});
                                }}
                                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingPlanId(plan.id);
                                setEditPlanData(plan);
                              }}
                              className="px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded transition-colors cursor-pointer"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
