import { useState } from 'react';
import { FileText, Search, ChevronDown, ChevronUp, HelpCircle, ShieldAlert } from 'lucide-react';

export default function TermsAndConditions() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>('commissions');

  const policies = [
    {
      id: 'commissions',
      title: '1. Commission Structures & Recurring Earnings',
      content: 'WEBNIXO AI pays a lucrative 20% recurring lifetime commission on every paid subscriber referred through your unique referral link. This applies to all pricing models (₹199, ₹499, and ₹999 plans). Commissions continue as long as the referred customer remains an active paying subscriber.'
    },
    {
      id: 'cookie-policy',
      title: '2. Cookie Tracking & Validation Window',
      content: 'We use premium browser cookies to track referral traffic. Our cookies maintain a duration of 60 days. This means that if a customer clicks your link and subscribes within 60 days, you will receive full commission credit. Clearing browser storage or using strict private browsers might prevent cookies from registering correctly.'
    },
    {
      id: 'payouts',
      title: '3. Payout Verification & Monthly Schedule',
      content: 'Payout verifications are executed on the 1st of every calendar month. Released funds will be sent to your configured payout channel (UPI or Bank account) within 3-5 working days. The minimum balance required to unlock a payout is ₹1000.00. If your earnings do not reach ₹1000.00 within a month, they roll over to the following month.'
    },
    {
      id: 'anti-spam',
      title: '4. Promotional Standards & Anti-Spam Guidelines',
      content: 'We hold our partners to high ethical standards. You are strictly forbidden from distributing your link via unsolicited emails (spam), black-hat forum postings, or deceptive advertising. You must not bid on "WEBNIXO", "WEBNIXO AI", or misspelt variations in PPC campaigns (such as Google Ads or Bing). Breach of this policy results in immediate termination of the affiliate account and forfeiture of unpaid commissions.'
    },
    {
      id: 'termination',
      title: '5. Program Termination & Agreement Changes',
      content: 'WEBNIXO AI reserves the right to adjust commission percentages, payout minimums, or cookie terms upon giving a 14-day notice to active partners. We reserve the right to suspend any affiliate account immediately if we identify fraudulent clicks, multi-account self-referrals, or malicious promotion.'
    }
  ];

  const filteredPolicies = policies.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const togglePolicy = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6" id="terms-and-conditions-tab">
      <div className="space-y-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Affiliate Agreement & Terms</h3>
          <p className="text-xs text-slate-500">
            Familiarize yourself with our affiliate partner guidelines, policies, and payout terms.
          </p>
        </div>
        
        {/* Search Input */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search policies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Main Accordion List */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="divide-y divide-slate-100">
          {filteredPolicies.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No matching policies found for "{searchQuery}". Try searching for 'commission' or 'payout'.
            </div>
          ) : (
            filteredPolicies.map((policy) => {
              const isExpanded = expandedId === policy.id;
              return (
                <div key={policy.id} className="transition-all">
                  <button
                    onClick={() => togglePolicy(policy.id)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
                  >
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-indigo-500" />
                      {policy.title}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 text-xs text-slate-600 leading-relaxed bg-slate-50/20 border-t border-slate-50">
                      {policy.content}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Trust Badge warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-amber-900">Compliance & FTC Regulations</h4>
          <p className="text-[10px] text-amber-800 leading-normal mt-1">
            Depending on your jurisdiction, you are legally obligated to disclose to your audience that you receive a commission if they purchase WEBNIXO AI. We advise placing a simple statement like: *“Some of the links on this page are affiliate links, meaning I earn a small commission if you buy.”*
          </p>
        </div>
      </div>

      {/* Partnership Contact */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm text-center space-y-2">
        <HelpCircle className="h-6 w-6 text-indigo-500 mx-auto" />
        <h4 className="text-xs font-bold text-slate-800">Have custom questions or need an Enterprise contract?</h4>
        <p className="text-[10px] text-slate-500 max-w-md mx-auto">
          If you are an influencer, a large agency, or operate an educational cohort with substantial traffic, we can set up custom commission tiers of up to **45%**. Get in touch with our partnerships lead.
        </p>
        <div className="pt-2">
          <a href="mailto:affiliates@wwebnixo.ai" className="inline-block bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] px-4 py-2 rounded-xl transition-all">
            Contact Partnerships
          </a>
        </div>
      </div>
    </div>
  );
}
