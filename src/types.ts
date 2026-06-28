export interface UserProfile {
  id: string;
  email: string;
  password?: string;
  fullName: string;
  phone: string;
  companyName: string;
  website: string;
  promoStrategy: string;
  country: string;
  isRegisteredAffiliate: boolean;
  referralCode: string;
  customCouponCode?: string;
  joinedAt: string;
}

export interface PayoutDetails {
  payoutMethod: 'upi' | 'bank';
  upiId: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  ifscCode: string;
}

export interface PayoutHistoryItem {
  id: string;
  amount: number;
  date: string;
  method: 'upi' | 'bank';
  destination: string;
  status: 'Pending' | 'Credited';
  transactionId?: string;
}

export interface AffiliateStats {
  clicks: number;
  signups: number;
  sales: number;
  commissionEarned: number;
  unpaidCommission: number;
  payoutStatus: 'Pending' | 'Approved' | 'Paid' | 'None';
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  sales: number;
  commission: number;
  isCurrentUser?: boolean;
}

export interface MarketingResource {
  id: string;
  title: string;
  type: 'logo' | 'banner' | 'video';
  format: string;
  dimensions?: string;
  url: string;
  embedCode?: string;
}

export interface ReferralEvent {
  id: string;
  type: 'click' | 'signup' | 'sale';
  details: string;
  timestamp: string;
  commission?: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  cost: number;
  period: string;
  is_active: boolean;
}
