import React, { useState } from 'react';
import { 
  Building, Globe, Briefcase, ChevronRight, CheckCircle2, 
  HelpCircle, ArrowUpRight, DollarSign, FileText, Sparkles 
} from 'lucide-react';
import { UserProfile } from '../types';\nimport { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile';\nimport { useRef, useState } from 'react';

interface AffiliateRegistrationProps {
  onRegister: (data: Partial<UserProfile>) => void;
  userEmail: string;
}

export default function AffiliateRegistration({ onRegister, userEmail }: AffiliateRegistrationProps) {
  const plan199Comm = Number(localStorage.getItem('webnixo_comm_199') || '39.80');
  const plan499Comm = Number(localStorage.getItem('webnixo_comm_499') || '99.80');
  const plan999Comm = Number(localStorage.getItem('webnixo_comm_999') || '199.80');

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    companyName: '',
    website: '',
    promoStrategy: 'blog',
    customStrategy: '',
    country: 'India',
    acceptedTerms: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone Number is required';
    if (!formData.website.trim()) {
      newErrors.website = 'Instagram ID or Social Media profile is required';
    }
    if (!formData.acceptedTerms) newErrors.acceptedTerms = 'You must accept the terms & conditions';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onRegister({
        fullName: formData.fullName,
        phone: formData.phone,
        companyName: formData.companyName,
        website: formData.website,
        promoStrategy: formData.promoStrategy === 'other' ? formData.customStrategy : formData.promoStrategy,
        country: formData.country,
        isRegisteredAffiliate: true,
        referralCode: `wweb_${formData.fullName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 8)}_${Math.floor(1000 + Math.random() * 9000)}`
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4" id="affiliate-registration-tab">
      {/* Intro Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5" />
          Partner with WEBNIXO AI
        </div>
        <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight sm:text-4xl">
          Apply to the WEBNIXO AI Affiliate Program
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Monetize your content, audience, and network. Share the world's most powerful AI web construction engine and earn passive recurring commissions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Registration Form */}
        <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
              Partnership Application Form
            </h3>

            {/* Email (Disabled, prefilled) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Account Email
              </label>
              <input
                type="email"
                value={userEmail}
                disabled
                className="w-full bg-slate-50 border border-slate-200 text-slate-500 rounded-xl px-4 py-2.5 text-sm cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className={`w-full bg-white border ${errors.fullName ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-indigo-500'} rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1`}
                />
                {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="+91 XXXXX XXXXX"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`w-full bg-white border ${errors.phone ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-indigo-500'} rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1`}
                />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              </div>
            </div>

            {/* Instagram / Social Media Link */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Instagram ID or Social Media Link <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="@username or profile link (e.g., https://instagram.com/username)"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className={`w-full bg-white border ${errors.website ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-indigo-500'} rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1`}
                />
              </div>
              {errors.website && <p className="text-xs text-red-500 mt-1">{errors.website}</p>}
            </div>

            {/* Promotion Strategy */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Primary Promotion Strategy
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <select
                  value={formData.promoStrategy}
                  onChange={(e) => setFormData({ ...formData, promoStrategy: e.target.value })}
                  className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
                >
                  <option value="blog">Blog Posts & SEO Content</option>
                  <option value="youtube">YouTube Videos & Reviews</option>
                  <option value="newsletters">Email Newsletter Recommendation</option>
                  <option value="social">Social Media Campaigns (Instagram/Twitter/LinkedIn)</option>
                  <option value="agency">Direct Referral to Agency Clients</option>
                  <option value="other">Other strategy (Specify below)</option>
                </select>
              </div>
            </div>

            {formData.promoStrategy === 'other' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Specify Strategy
                </label>
                <textarea
                  placeholder="How will you promote WEBNIXO AI?"
                  value={formData.customStrategy}
                  onChange={(e) => setFormData({ ...formData, customStrategy: e.target.value })}
                  className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 h-20"
                />
              </div>
            )}

            {/* Country of Residence Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Your Country of Residence
              </label>
              <select
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
              >
                <option value="India">India</option>
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Canada">Canada</option>
                <option value="Australia">Australia</option>
                <option value="Singapore">Singapore</option>
                <option value="United Arab Emirates">United Arab Emirates</option>
                <option value="Saudi Arabia">Saudi Arabia</option>
                <option value="Germany">Germany</option>
                <option value="France">France</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Terms and conditions acceptance */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.acceptedTerms}
                  onChange={(e) => setFormData({ ...formData, acceptedTerms: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 shrink-0 mt-0.5 cursor-pointer"
                />
                <span className="text-xs text-slate-600 leading-normal">
                  I agree to the <span className="font-semibold text-indigo-600 underline">WEBNIXO AI Affiliate Agreement</span>, and confirm that I will follow anti-spam guidelines and accurately represent WEBNIXO AI.
                </span>
              </label>
              {errors.acceptedTerms && <p className="text-xs text-red-500 mt-1">{errors.acceptedTerms}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm py-3 rounded-xl transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer"
              id="submit-affiliate-registration"
            >
              Submit Application & Activate Dashboard
              <ChevronRight className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Benefits Sidebar */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 space-y-5 shadow-sm">
            <h4 className="text-md font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-indigo-400" />
              Affiliate Program Perks
            </h4>

            <ul className="space-y-4">
              <li className="flex gap-3">
                <div className="h-8 w-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400 shrink-0">
                  <span className="text-sm font-bold">₹</span>
                </div>
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-300">20% Lifetime Recurring</h5>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    Earn flat recurring payouts on referred subscriptions (e.g., ₹{plan199Comm.toFixed(2)} for the ₹199 plan, ₹{plan499Comm.toFixed(2)} for the ₹499 plan, or ₹{plan999Comm.toFixed(2)} for the ₹999 plan), recurring every month for the lifetime of their subscription.
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <div className="h-8 w-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400 shrink-0">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-300">60-Day Cookie Window</h5>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    Our system tracks referrals for up to 60 days. Even if they don't subscribe instantly, you still get credited!
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <div className="h-8 w-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400 shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-300">Sleek Marketing Kit</h5>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    Instant access to beautiful, professionally designed banners, official brand logo assets, and video guides to use in your materials.
                  </p>
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="h-4.5 w-4.5 text-slate-400" />
              Frequently Asked Questions
            </h4>

            <div className="space-y-3">
              <div>
                <h5 className="text-xs font-bold text-slate-800">When do I get paid?</h5>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Payouts are verified on the 1st of every month and released immediately once your unpaid balance crosses the minimum ₹1000 threshold.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <h5 className="text-xs font-bold text-slate-800">What payout methods are supported?</h5>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  We support hassle-free UPI payments, direct bank transfers, or international PayPal invoicing. Set your preference in Payout Settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
