// ─── Coins values ───────────────────────────────────────────────────────────
export const COIN_VALUE_INR = 50;           // 1 coin = ₹50 (Play regional pricing)
export const DAILY_LOGIN_COINS = 1;
export const REFERRAL_REWARD_COINS = 10;    // Referrer earns when someone uses their code
export const REFERRAL_SIGNUP_BONUS_COINS = 10; // New user bonus for entering a valid code
export const COIN_ACTION_COST = 1;          // 1 coin = 1 super like | message | compliment

// ─── Membership ─────────────────────────────────────────────────────────────
// Everyone (men and women) gets the same plan. New accounts start with a free
// trial; after it ends, likes, messages, super likes and compliments need the plan.
export enum SubscriptionTier {
  NONE = 0,
  MEMBER = 1,
}

export const FREE_TRIAL_DAYS = 30;
export const TRIAL_PLAN_ID = 'trial';
export const MONTHLY_PLAN_ID = 'nri_monthly';
export const MONTHLY_PRICE_INR = 300;

/** Interests (smile / rose / coffee / bear) are free for everyone, capped per day. */
export const DAILY_FREE_INTERESTS = 5;

export interface MemberDailyQuotas {
  messages: number;       // new conversations started per day
  superLikes: number;
  compliments: number;
}

export const MEMBER_DAILY_QUOTAS: MemberDailyQuotas = {
  messages: 20,
  superLikes: 5,
  compliments: 5,
};

export function getDailyQuotasForTier(tier: number): MemberDailyQuotas {
  return tier >= SubscriptionTier.MEMBER
    ? MEMBER_DAILY_QUOTAS
    : { messages: 0, superLikes: 0, compliments: 0 };
}

export function hasActiveMembership(user: {
  subscriptionTier?: number | null;
  subscriptionExpiresAt?: Date | string | null;
}): boolean {
  if (!user.subscriptionTier || user.subscriptionTier < SubscriptionTier.MEMBER) return false;
  if (!user.subscriptionExpiresAt) return false;
  return new Date(user.subscriptionExpiresAt) > new Date();
}

export interface PlanConfig {
  id: string;
  name: string;
  tier: SubscriptionTier;
  monthlyPrice: number;   // INR
  badge: string;
  features: string[];
}

export const NRI_MONTHLY_PLAN: PlanConfig = {
  id: MONTHLY_PLAN_ID,
  name: 'NRI Friends Premium',
  tier: SubscriptionTier.MEMBER,
  monthlyPrice: MONTHLY_PRICE_INR,
  badge: '🧡',
  features: [
    'Like profiles and see who liked you back',
    `Start ${MEMBER_DAILY_QUOTAS.messages} new conversations a day`,
    `${MEMBER_DAILY_QUOTAS.superLikes} super likes a day`,
    `${MEMBER_DAILY_QUOTAS.compliments} compliments a day`,
    'Unlimited replies in existing chats',
    'Same price for everyone',
  ],
};

// ─── Google Play product IDs ────────────────────────────────────────────────
const PLAY_PREFIX = 'nrifriends';

export function getPlaySubscriptionProductId(): string {
  return `${PLAY_PREFIX}_premium_1m`;
}

export function isPlaySubscriptionProductId(productId: string): boolean {
  return productId === getPlaySubscriptionProductId();
}

/** Google Play one-time SKU for coin packs: nrifriends_coins_1, nrifriends_coins_5, … */
export function getPlayCoinProductId(packId: string): string {
  return `${PLAY_PREFIX}_${packId}`;
}

export function parsePlayCoinProductId(productId: string): string | null {
  const match = productId.match(new RegExp(`^${PLAY_PREFIX}_coins_(\\d+)$`));
  if (!match) return null;
  const packId = `coins_${match[1]}`;
  if (!COIN_PACKS.find((p) => p.id === packId)) return null;
  return packId;
}

export function getPlayPackageName(): string {
  return process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.nrifriends.app';
}

export function getPlayCatalog() {
  return {
    packageName: getPlayPackageName(),
    subscriptions: [
      {
        productId: getPlaySubscriptionProductId(),
        planId: NRI_MONTHLY_PLAN.id,
        period: 'monthly',
        priceInr: NRI_MONTHLY_PLAN.monthlyPrice,
        months: 1,
      },
    ],
    coinPacks: COIN_PACKS.map((pack) => ({
      productId: getPlayCoinProductId(pack.id),
      packId: pack.id,
      coins: pack.coins,
      priceInr: pack.priceInr,
    })),
  };
}

export function getPlanBadge(planId: string | null | undefined): string {
  if (planId === MONTHLY_PLAN_ID) return `${NRI_MONTHLY_PLAN.badge} Premium`;
  if (planId === TRIAL_PLAN_ID) return '🎁 Free trial';
  return '';
}

// ─── Coin packs (Google Play consumables) ───────────────────────────────────
export interface CoinPack {
  id: string;
  coins: number;
  priceInr: number;
  label: string;
  emoji: string;
}

export const COIN_PACKS: CoinPack[] = [
  { id: 'coins_1', coins: 1, priceInr: 50, label: '1 Coin', emoji: '🪙' },
  { id: 'coins_5', coins: 5, priceInr: 250, label: '5 Coins', emoji: '🪙' },
  { id: 'coins_10', coins: 10, priceInr: 500, label: '10 Coins', emoji: '💰' },
  { id: 'coins_25', coins: 25, priceInr: 1250, label: '25 Coins', emoji: '💎' },
  { id: 'coins_50', coins: 50, priceInr: 2500, label: '50 Coins', emoji: '👑' },
];
