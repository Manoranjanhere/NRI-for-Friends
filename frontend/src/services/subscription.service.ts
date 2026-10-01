import { api } from './api';

export interface PlanConfig {
  id: string;
  name: string;
  tier: number;
  monthlyPrice: number;
  badge: string;
  features: string[];
  playProductId: string;
}

export interface PlansResponse {
  plan: PlanConfig;
  freeTrialDays: number;
  dailyFreeInterests: number;
  paymentProvider: string;
}

export interface MembershipStatus {
  active: boolean;
  onTrial: boolean;
  plan: string | null;
  expiresAt: string | null;
  trialEndsAt: string | null;
  daysLeft: number;
}

export interface CoinTransaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface CoinPack {
  id: string;
  coins: number;
  priceInr: number;
  label: string;
  emoji: string;
  playProductId: string;
}

const SubscriptionService = {
  async getPlans(): Promise<PlansResponse> {
    const { data } = await api.get<PlansResponse>('/subscriptions/plans');
    return data;
  },

  async getStatus(): Promise<MembershipStatus> {
    const { data } = await api.get<MembershipStatus>('/subscriptions/status');
    return data;
  },

  async getFeatureFlags(): Promise<{ paidFeaturesDisabled: boolean }> {
    const { data } = await api.get('/subscriptions/feature-flags');
    return data;
  },

  async getCoinsBalance(): Promise<{ coins: number; transactions: CoinTransaction[] }> {
    const { data } = await api.get('/coins/balance');
    return data;
  },

  async claimDailyReward(): Promise<{ awarded: boolean; coins: number; balance: number }> {
    const { data } = await api.post('/coins/daily-reward');
    return data;
  },

  async getCoinPacks(): Promise<CoinPack[]> {
    const { data } = await api.get<CoinPack[]>('/coins/packs');
    return data;
  },
};

export default SubscriptionService;
