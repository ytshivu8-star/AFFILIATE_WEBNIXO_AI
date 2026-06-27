import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, DollarSign, MousePointerClick, 
  Copy, Check, ArrowUpRight, Award, ChevronRight, Clock, ShieldAlert, CheckCircle2, AlertCircle, Info, Sparkles, Ticket, Edit3
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AffiliateStats, ReferralEvent, UserProfile } from '../types';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface DashboardProps {
  user: UserProfile;
  stats: AffiliateStats;
  events: ReferralEvent[];
  chartData: any[];
  onUpdateUser: (data: Partial<UserProfile>) => void;
}

export default function Dashboard({ user, stats, events, chartData, onUpdateUser }: DashboardProps) {
  const [copied, setCopied] = useState(false);
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const [customCouponInput, setCustomCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState(false);
  const [isEditingCoupon, setIsEditingCoupon] = useState(false);

  const referralLink = `${window.location.origin}/ref?code=${user.referralCode || 'webnixo_ai_partner'}`;

  const plan199Comm = Number(localStorage.getItem('webnixo_comm_199') || '39.80');
  const plan499Comm = Number(localStorage.getItem('webnixo_comm_499') || '99.80');
  const plan999Comm = Number(localStorage.getItem('webnixo_comm_999') || '199.80');

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const copyCouponToClipboard = async () => {
    if (!user.customCouponCode) return;
    try {
      await navigator.clipboard.writeText(user.customCouponCode);
      setCopiedCoupon(true);
      setTimeout(() => setCopiedCoupon(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handleGenerateCouponSuggestion = () => {
    const prefix = user.fullName ? user.fullName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) : 'NIXO';
    setCustomCouponInput(`${prefix}20`);
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    setCouponSuccess(false);

    const cleanCode = customCouponInput.trim().toUpperCase();
    if (!cleanCode) {
      setCouponError('Coupon code cannot be empty');
      return;
    }
    if (cleanCode.length < 3 || cleanCode.length > 12) {
      setCouponError('Coupon code must be between 3 and 12 characters');
      return;
    }
    if (!/^[A-Z0-9]+$/.test(cleanCode)) {
      setCouponError('Coupon code can only contain letters and numbers');
      return;
    }

    // 1. Uniqueness check in local storage synced user database
    let isTakenLocally = false;
    try {
      const globalUsersStr = localStorage.getItem('webnixo_global_users');
      if (globalUsersStr) {
        const globalUsersList: any[] = JSON.parse(globalUsersStr);
        isTakenLocally = globalUsersList.some(
          (u: any) => 
            u.email !== user.email && 
            u.customCouponCode && 
            u.customCouponCode.trim().toUpperCase() === cleanCode
        );
      }
    } catch (err) {
      console.warn("Failed local storage coupon check:", err);
    }

    if (isTakenLocally) {
      setCouponError(`The coupon code "${cleanCode}" is already claimed by another affiliate. Please choose a unique code.`);
      return;
    }

    // 2. Uniqueness check in Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('webnixo_profiles_affilate')
          .select('email')
          .eq('custom_coupon_code', cleanCode)
          .neq('email', user.email)
          .limit(1);

        if (data && data.length > 0) {
          setCouponError(`The coupon code "${cleanCode}" is already claimed in the cloud database. Please choose a unique code.`);
          return;
        }
      } catch (err) {
        console.warn("Supabase coupon uniqueness check skipped or failed:", err);
      }
    }

    onUpdateUser({ customCouponCode: cleanCode });
    setCouponSuccess(true);
    setIsEditingCoupon(false);
    setTimeout(() => setCouponSuccess(false), 3000);
  };

  // Convert status to badge styling
  const getPayoutStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Fully Paid
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
            <Clock className="h-3.5 w-3.5" />
            Approved & Pending Release
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
            <Clock className="h-3.5 w-3.5" />
            Under Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded-full text-xs font-semibold">
            <AlertCircle className="h-3.5 w-3.5" />
            No Pending Payout
          </span>
        );
    }
  };

  const conversionRate = stats.clicks > 0 ? ((stats.signups / stats.clicks) * 100).toFixed(1) : '0.0';
  const salesConversion = stats.signups > 0 ? ((stats.sales / stats.signups) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6" id="dashboard-tab">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/40 rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Award className="h-32 w-32 text-indigo-400" />
        </div>
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-full text-xs font-semibold mb-3">
            <TrendingUp className="h-3.5 w-3.5" />
            WEBNIXO AI Certified Affiliate
          </span>
          <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
            Welcome back, {user.fullName || 'Affiliate Partner'}!
          </h2>
        </div>
      </div>

      {/* Referral Link Card & Custom Coupon Code Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Referral Link Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-1 mb-4">
            <h3 className="font-semibold text-slate-900 text-base flex items-center gap-2">
              Your Unique Referral Link
            </h3>
            <p className="text-xs text-slate-500">
              Share this link to track your referrals. Users are cookie-tagged for 60 days.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full mt-auto">
            <div className="relative flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-mono text-xs text-slate-700 select-all overflow-x-auto whitespace-nowrap scrollbar-thin">
              {referralLink}
            </div>
            <button
              onClick={copyToClipboard}
              className={`flex items-center gap-1.5 px-4 py-2.5 font-semibold text-xs rounded-xl transition-all cursor-pointer shrink-0 ${
                copied 
                ? 'bg-emerald-600 text-white shadow-emerald-200' 
                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-100'
              } shadow-sm`}
              id="copy-referral-link"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        {/* Custom Coupon Code Generator Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-1 mb-4">
            <h3 className="font-semibold text-slate-900 text-base flex items-center gap-2">
              <Ticket className="h-4.5 w-4.5 text-indigo-500" />
              Custom Discount Coupon
            </h3>
            <p className="text-xs text-slate-500">
              Allow your audience to get a **10% discount** while securing your **20% commission**!
            </p>
          </div>

          {user.customCouponCode && !isEditingCoupon ? (
            <div className="space-y-2 mt-auto">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 font-mono text-sm text-indigo-700 font-black tracking-widest text-center">
                  {user.customCouponCode}
                </div>
                <button
                  onClick={copyCouponToClipboard}
                  className={`flex items-center gap-1.5 px-4 py-2.5 font-semibold text-xs rounded-xl transition-all cursor-pointer shrink-0 ${
                    copiedCoupon
                    ? 'bg-emerald-600 text-white shadow-emerald-200'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
                  } shadow-sm`}
                >
                  {copiedCoupon ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedCoupon ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomCouponInput(user.customCouponCode || '');
                    setIsEditingCoupon(true);
                  }}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-3 py-2.5 rounded-xl transition-all shrink-0 cursor-pointer"
                  title="Edit Coupon Code"
                >
                  <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                  Edit
                </button>
              </div>
              <p className="text-[10px] text-emerald-600 font-semibold text-center flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Coupon is active! Shares tracked automatically.
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreateCoupon} className="space-y-2 mt-auto">
              {couponError && <p className="text-[10px] text-red-500 font-medium">{couponError}</p>}
              {couponSuccess && <p className="text-[10px] text-emerald-600 font-semibold">Coupon updated successfully!</p>}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    type="text"
                    placeholder="e.g. SHIVA20"
                    value={customCouponInput}
                    onChange={(e) => setCustomCouponInput(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-mono uppercase h-10"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateCouponSuggestion}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs h-10 px-4 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Suggest
                  </button>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="submit"
                    className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-5 rounded-xl transition-all cursor-pointer whitespace-nowrap"
                  >
                    {user.customCouponCode ? 'Update' : 'Create'}
                  </button>
                  {user.customCouponCode && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingCoupon(false);
                        setCouponError('');
                      }}
                      className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-xs h-10 px-4 rounded-xl transition-all cursor-pointer whitespace-nowrap"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* 2. REFERRAL PROGRAM PLAN COMMISSIONS SECTION */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800/60">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
              Referral Commission Payout Rates
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Secure these flat recurring payouts when customers referred by you purchase subscriptions.
            </p>
          </div>
          <span className="inline-flex self-start sm:self-auto items-center gap-1.5 text-[10px] font-black text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full uppercase tracking-widest">
            Fixed commission structures
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ₹199 Card */}
          <div className="bg-slate-950/30 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between transition-all hover:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest bg-slate-800 px-2.5 py-1 rounded">
                Starter Tier
              </span>
              <span className="text-xs font-semibold text-slate-400">
                ₹199 / mo plan
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Your Earning</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-indigo-400 tracking-tight font-mono">
                  ₹{plan199Comm.toFixed(2)}
                </span>
                <span className="text-xs font-bold text-slate-500">/ sale</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 italic">
              Received recurringly for the lifetime of the active customer subscription.
            </p>
          </div>

          {/* ₹499 Card */}
          <div className="bg-slate-950/30 border border-indigo-950/40 rounded-xl p-4 flex flex-col justify-between transition-all hover:border-indigo-950">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest bg-indigo-950/30 px-2.5 py-1 rounded">
                Pro AI Tier
              </span>
              <span className="text-xs font-semibold text-slate-400">
                ₹499 / mo plan
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Your Earning</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-amber-500 tracking-tight font-mono">
                  ₹{plan499Comm.toFixed(2)}
                </span>
                <span className="text-xs font-bold text-slate-500">/ sale</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 italic">
              Received recurringly for the lifetime of the active customer subscription.
            </p>
          </div>

          {/* ₹999 Card */}
          <div className="bg-slate-950/30 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between transition-all hover:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-black text-purple-300 uppercase tracking-widest bg-purple-950/20 px-2.5 py-1 rounded">
                Enterprise Tier
              </span>
              <span className="text-xs font-semibold text-slate-400">
                ₹999 / mo plan
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Your Earning</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight font-mono">
                  ₹{plan999Comm.toFixed(2)}
                </span>
                <span className="text-xs font-bold text-slate-500">/ sale</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 italic">
              Received recurringly for the lifetime of the active customer subscription.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card: Sales */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Paid Sales</span>
            <div className="h-8 w-8 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{stats.sales}</h4>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                {salesConversion}%
              </span>
              <span className="text-[10px] text-slate-400">signup-to-paid</span>
            </div>
          </div>
        </div>

        {/* Card: Total Commission */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all ring-1 ring-indigo-50 bg-gradient-to-b from-white to-slate-50/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Earned</span>
            <div className="h-8 w-8 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
              <span className="text-md font-extrabold font-sans">₹</span>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              ₹{stats.commissionEarned.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] text-slate-400">
                Unpaid: <strong className="text-indigo-600">₹{stats.unpaidCommission.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payout Details Status & Threshold tracker */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2 md:border-r md:border-slate-100 md:pr-6">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Payout Period</h4>
          <p className="text-sm font-semibold text-slate-800">Payout Release: Monthly (1st of month)</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-slate-500">Status:</span>
            {getPayoutStatusBadge(stats.payoutStatus)}
          </div>
        </div>

        <div className="space-y-2 md:border-r md:border-slate-100 md:px-6 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Payout Threshold Progress</h4>
            <div className="flex items-end justify-between mt-1">
              <span className="text-lg font-bold text-slate-800">₹{stats.unpaidCommission.toFixed(2)}</span>
              <span className="text-xs text-slate-500">Min Threshold: ₹1000.00</span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
            <div 
              className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, (stats.unpaidCommission / 1000) * 100)}%` }}
            />
          </div>
        </div>

        <div className="space-y-2 md:pl-6 flex flex-col justify-center">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex gap-2.5">
            <Info className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-slate-700">Need immediate help?</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Payouts are handled within 3 working days of reaching the minimum payout. Reach out to our partner support at <a href="mailto:partners@webnixo.ai" className="text-indigo-600 underline">partners@webnixo.ai</a>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Graph and Recent events Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph Card */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Referral Trends</h3>
              <p className="text-xs text-slate-500">Daily breakdown of your referral link activities</p>
            </div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                <span className="h-2.5 w-2.5 bg-indigo-500 rounded-full inline-block"></span>
                Clicks
              </span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                <span className="h-2.5 w-2.5 bg-emerald-400 rounded-full inline-block"></span>
                Sales
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#f8fafc' }}
                  labelStyle={{ fontWeight: 'bold', fontSize: '12px', color: '#818cf8' }}
                  itemStyle={{ fontSize: '11px', padding: '1px 0' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="clicks" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorClicks)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Events Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 text-base">Live Activity Log</h3>
            <p className="text-xs text-slate-500">Real-time tracker of clicks and subscriptions</p>
          </div>

          <div className="flex-1 overflow-y-auto max-h-60 pr-1 space-y-3 scrollbar-thin mt-2">
            {events.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8 text-slate-400">
                <Clock className="h-8 w-8 text-slate-300 animate-pulse mb-2" />
                <p className="text-xs font-semibold">No recent activity detected</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Use the simulator below to generate traffic</p>
              </div>
            ) : (
              events.map((event) => (
                <div key={event.id} className="flex items-start justify-between border-b border-slate-50 pb-2.5 last:border-0 last:pb-0">
                  <div className="flex gap-2">
                    <span className={`h-6 w-6 rounded-lg flex items-center justify-center text-[10px] shrink-0 mt-0.5 ${
                      event.type === 'click' 
                      ? 'bg-indigo-50 text-indigo-600' 
                      : event.type === 'signup' 
                      ? 'bg-emerald-50 text-emerald-600' 
                      : 'bg-amber-50 text-amber-600'
                    }`}>
                      {event.type === 'click' ? 'CLK' : event.type === 'signup' ? 'SUP' : 'SLS'}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{event.details}</p>
                      <p className="text-[10px] text-slate-400">{event.timestamp}</p>
                    </div>
                  </div>
                  {event.commission ? (
                    <span className="text-xs font-bold text-emerald-600">
                      +₹{event.commission.toFixed(2)}
                    </span>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-2.5 mt-2">
            <p className="text-[10px] text-slate-600 leading-normal flex items-start gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5" />
              Your referral cookies remain active for 60 days. Users who purchase any plan within 60 days of click are tracked to you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
