import React, { useState } from 'react';
import { CreditCard, Check, ShieldCheck, AlertCircle, Sparkles, Clock, CheckCircle, ArrowUpRight, History } from 'lucide-react';
import { PayoutDetails as PayoutDetailsType, PayoutHistoryItem } from '../types';

interface PayoutDetailsProps {
  initialDetails?: PayoutDetailsType;
  onSave: (details: PayoutDetailsType) => void;
  unpaidCommission: number;
  payoutHistory: PayoutHistoryItem[];
  onRequestPayout: () => void;
}

export default function PayoutDetails({ 
  initialDetails, 
  onSave, 
  unpaidCommission, 
  payoutHistory, 
  onRequestPayout 
}: PayoutDetailsProps) {
  const [method, setMethod] = useState<'upi' | 'bank'>(initialDetails?.payoutMethod || 'upi');
  const [upiId, setUpiId] = useState(initialDetails?.upiId || '');
  const [bankName, setBankName] = useState(initialDetails?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(initialDetails?.accountNumber || '');
  const [accountHolderName, setAccountHolderName] = useState(initialDetails?.accountHolderName || '');
  const [ifscCode, setIfscCode] = useState(initialDetails?.ifscCode || '');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Basic Validation
    if (method === 'upi') {
      if (!upiId.trim()) {
        setError('UPI ID cannot be empty');
        return;
      }
      if (!upiId.includes('@')) {
        setError('Invalid UPI ID. Must contain @ (e.g., user@okaxis)');
        return;
      }
    } else {
      if (!bankName.trim() || !accountNumber.trim() || !accountHolderName.trim() || !ifscCode.trim()) {
        setError('Please fill in all bank details');
        return;
      }
      if (accountNumber.length < 8) {
        setError('Account Number should be at least 8 digits');
        return;
      }
    }

    onSave({
      payoutMethod: method,
      upiId: method === 'upi' ? upiId : '',
      bankName: method === 'bank' ? bankName : '',
      accountNumber: method === 'bank' ? accountNumber : '',
      accountHolderName: method === 'bank' ? accountHolderName : '',
      ifscCode: method === 'bank' ? ifscCode : '',
    });

    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const hasConfiguredPayout = method === 'upi' ? !!upiId.trim() : (!!bankName.trim() && !!accountNumber.trim());

  return (
    <div className="space-y-8" id="payout-details-tab">
      <div className="space-y-1.5">
        <h3 className="text-xl font-bold text-slate-900">Payout Center</h3>
        <p className="text-xs text-slate-500">
          Configure your preferred payout channel and request commission withdrawals instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Payout Configurations */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-2">
            <h4 className="font-bold text-slate-800 text-sm">Payout Preferences</h4>
            <p className="text-[11px] text-slate-400">Configure where you want to receive your commissions.</p>
          </div>

          {/* Payout Method Selector */}
          <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => { setMethod('upi'); setError(''); }}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                method === 'upi' 
                ? 'bg-white text-indigo-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              UPI Transfer (Instant)
            </button>
            <button
              type="button"
              onClick={() => { setMethod('bank'); setError(''); }}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                method === 'bank' 
                ? 'bg-white text-indigo-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Bank Transfer (1-2 days)
            </button>
          </div>

          {/* Info Box */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex gap-2.5 items-start">
            <ShieldCheck className="h-4.5 w-4.5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h5 className="text-xs font-bold text-slate-800">Secure Direct Payouts</h5>
              <p className="text-[10px] text-slate-500 leading-normal">
                Commissions are automatically verified and processed once your balance crosses the <strong className="text-indigo-700">₹1000.00</strong> threshold. UPI payouts are instant and have zero fee.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2 font-semibold">
                <Check className="h-4 w-4 shrink-0" />
                Payout configuration saved successfully!
              </div>
            )}

            {method === 'upi' ? (
              /* UPI FORM */
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  UPI ID (Virtual Payment Address) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g., yourname@okaxis or mobile@paytm"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-slate-700"
                  />
                </div>
                <span className="text-[10px] text-slate-400 leading-normal block">
                  Make sure this UPI address is active. Any payments routed to an inactive address cannot be retrieved.
                </span>
              </div>
            ) : (
              /* BANK ACCOUNT FORM */
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Account Holder Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Full name as listed in passbook"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                      Bank Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., HDFC Bank, SBI"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                      IFSC Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., HDFC0000123"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                      className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono uppercase text-slate-700"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Account Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Enter Bank Account Number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-slate-700"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
              id="save-payout-details-btn"
            >
              Save Payout Preference
            </button>
          </form>
        </div>

        {/* Right Column: Dynamic Balance & Request Payout & History */}
        <div className="lg:col-span-5 space-y-6">
          {/* Unpaid Balance Card */}
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Current Unpaid Balance</h4>
            <div>
              <span className="text-3xl font-black font-sans text-white">₹{unpaidCommission.toFixed(2)}</span>
              <p className="text-[10px] text-slate-400 mt-1">
                Threshold remaining: <strong className="text-indigo-300">₹{Math.max(0, 1000 - unpaidCommission).toFixed(2)}</strong> to reach ₹1000 minimum.
              </p>
            </div>

            <button
              onClick={onRequestPayout}
              disabled={unpaidCommission < 1000 || !hasConfiguredPayout}
              className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md ${
                unpaidCommission >= 1000 && hasConfiguredPayout
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer hover:scale-[1.01] shadow-emerald-900/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              <ArrowUpRight className="h-4 w-4" />
              Request Payout Now
            </button>

            {!hasConfiguredPayout ? (
              <p className="text-[9px] text-center text-amber-400 font-semibold">
                ⚠️ Please save your payout preference to request withdrawals.
              </p>
            ) : unpaidCommission < 1000 ? (
              <p className="text-[9px] text-center text-slate-400">
                ℹ️ Balance must be at least ₹1000.00 to request payout.
              </p>
            ) : (
              <p className="text-[9px] text-center text-emerald-400 font-semibold animate-pulse">
                ✅ Minimum threshold reached! Click above to request payout.
              </p>
            )}
          </div>

          {/* Payout History with Statuses */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <History className="h-4 w-4 text-indigo-500" />
              <h4 className="font-bold text-slate-800 text-sm">Payout History</h4>
            </div>

            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
              {payoutHistory.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-[11px] space-y-1">
                  <Clock className="h-6 w-6 mx-auto text-slate-300" />
                  <p className="font-semibold">No payout transactions yet</p>
                  <p className="text-[10px]">Your history will be recorded once you request your first payout.</p>
                </div>
              ) : (
                payoutHistory.map((item) => (
                  <div key={item.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400">{item.date}</span>
                      <span className="font-extrabold text-slate-900 text-xs">₹{item.amount.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium capitalize">
                        Method: {item.method.toUpperCase()} ({item.destination})
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'Credited'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse'
                      }`}>
                        {item.status === 'Credited' ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            Credited
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" />
                            Processing
                          </>
                        )}
                      </span>
                    </div>

                    {item.status === 'Credited' && item.transactionId && (
                      <div className="bg-white border border-slate-100 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-500 font-mono flex items-center justify-between">
                        <span>Trxn ID:</span>
                        <span className="font-black text-slate-700">{item.transactionId}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
