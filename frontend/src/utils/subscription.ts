import { Alert } from 'react-native';
import type { NavigationProp } from '@react-navigation/native';
import type { AppUser } from '../store/auth.store';

export const TRIAL_PLAN_ID = 'trial';
export const MONTHLY_PRICE_INR = 300;

type Nav = NavigationProp<Record<string, object | undefined>>;

/** Free trial and paid monthly plan both count as an active membership. */
export function hasActiveSubscription(user: AppUser | null | undefined): boolean {
  if (!user) return false;
  if ((user.subscriptionTier ?? 0) <= 0) return false;
  if (!user.subscriptionExpiresAt) return false;
  return new Date(user.subscriptionExpiresAt) > new Date();
}

export function isOnTrial(user: AppUser | null | undefined): boolean {
  return hasActiveSubscription(user) && user?.subscriptionPlan === TRIAL_PLAN_ID;
}

export function daysLeft(user: AppUser | null | undefined): number {
  if (!user?.subscriptionExpiresAt) return 0;
  const ms = new Date(user.subscriptionExpiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

/** Members (trial or paid) can spend coins on extras beyond their daily quota. */
export function canSpendCoins(user: AppUser | null | undefined, paidFeaturesDisabled = false): boolean {
  return paidFeaturesDisabled || hasActiveSubscription(user);
}

export type InteractionAccess = 'allowed' | 'need_subscribe';

export function getInteractionAccess(
  user: AppUser | null | undefined,
  options?: { paidFeaturesDisabled?: boolean },
): InteractionAccess {
  if (options?.paidFeaturesDisabled) return 'allowed';
  return hasActiveSubscription(user) ? 'allowed' : 'need_subscribe';
}

export function showSubscribeRequiredAlert(navigation: Nav, feature = 'use this feature'): void {
  Alert.alert(
    'Membership required',
    `Your free month has ended. Subscribe for ₹${MONTHLY_PRICE_INR}/month to ${feature}. ` +
      'You can still browse profiles and send free interests.',
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Subscribe', onPress: () => navigation.navigate('Subscription') },
    ],
  );
}

export function showInsufficientCoinsAlert(navigation: Nav, action = 'do this'): void {
  Alert.alert(
    'Not enough coins',
    `You need 1 coin to ${action}. Buy coins or wait for tomorrow's free quota.`,
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Buy coins', onPress: () => navigation.navigate('Coins') },
    ],
  );
}

export function getErrorMessage(err: unknown, fallback = 'Please try again'): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } }; message?: string })
    ?.response?.data?.message
    || (err as { message?: string })?.message;
  if (Array.isArray(msg)) return msg.join('\n');
  return msg || fallback;
}

/** Routes paywall, coin and generic API errors to the right prompt. */
export function showPaymentOrCoinError(navigation: Nav, err: unknown, action = 'complete this action'): void {
  const status = (err as { response?: { status?: number } })?.response?.status;
  const msg = getErrorMessage(err);

  if (msg.toLowerCase().includes('insufficient coins')) {
    showInsufficientCoinsAlert(navigation, action);
    return;
  }
  if (status === 403 && /subscri|trial/i.test(msg)) {
    showSubscribeRequiredAlert(navigation, action);
    return;
  }
  Alert.alert('Could not complete', msg);
}
