import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SubscriptionScreenProps } from '../../navigation/types';
import { Colors, FontSize, Spacing, BorderRadius } from '../../theme';
import SubscriptionService, { type PlansResponse, type MembershipStatus } from '../../services/subscription.service';
import PlayBilling from '../../services/playBilling.service';
import { useFeatureFlagsStore } from '../../store/featureFlags.store';
import { MONTHLY_PRICE_INR } from '../../utils/subscription';

type Props = SubscriptionScreenProps;

const FREE_FEATURES = [
  'Create your profile and discover NRI friends',
  'Send interests (😊 🌹 ☕ 🧸) — 5 free every day',
  'Accept or decline interests you receive',
  'Save favorites and see who viewed you',
];

function formatDate(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SubscriptionScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const paidFeaturesDisabled = useFeatureFlagsStore((s) => s.paidFeaturesDisabled);
  const [plans, setPlans] = useState<PlansResponse | null>(null);
  const [status, setStatus] = useState<MembershipStatus | null>(null);
  const [playPrice, setPlayPrice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([SubscriptionService.getPlans(), SubscriptionService.getStatus()]);
      setPlans(p);
      setStatus(s);
      if (Platform.OS === 'android') {
        const sku = PlayBilling.getProductId();
        const prices = await PlayBilling.fetchLocalizedPlayPrices([sku], []);
        setPlayPrice(prices[sku] ?? null);
      }
    } catch {
      Alert.alert('Error', 'Could not load membership details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubscribe = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Android only', 'Membership is purchased through Google Play on Android.');
      return;
    }
    setPurchasing(true);
    try {
      await PlayBilling.purchasePremium();
      const s = await SubscriptionService.getStatus();
      setStatus(s);
      Alert.alert('Welcome to Premium 🧡', `Your membership is active until ${formatDate(s.expiresAt)}.`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Purchase failed';
      if (!String(msg).toLowerCase().includes('cancel')) Alert.alert('Payment failed', msg);
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return <View style={styles.loader}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  const plan = plans?.plan;
  const price = playPrice ?? `₹${plan?.monthlyPrice ?? MONTHLY_PRICE_INR}`;
  const isPaid = !!status?.active && !status.onTrial;
  const onTrial = !!status?.onTrial;

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={[Colors.primarySoft, Colors.background]} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NRI Friends Premium</Text>
        <Text style={styles.headerSubtitle}>One simple plan. Same price for everyone.</Text>
      </LinearGradient>

      {paidFeaturesDisabled ? (
        <View style={[styles.statusCard, styles.statusActive]}>
          <Text style={styles.statusTitle}>🎉 Everything is free right now</Text>
          <Text style={styles.statusText}>Paid features are switched off, so you can use every feature without a membership.</Text>
        </View>
      ) : (
        <View style={[styles.statusCard, (isPaid || onTrial) ? styles.statusActive : styles.statusExpired]}>
          {isPaid ? (
            <>
              <Text style={styles.statusTitle}>🧡 Premium is active</Text>
              <Text style={styles.statusText}>
                Renews on {formatDate(status!.expiresAt)} · {status!.daysLeft} days left. Manage or cancel in the Play Store.
              </Text>
            </>
          ) : onTrial ? (
            <>
              <Text style={styles.statusTitle}>🎁 Free trial · {status!.daysLeft} {status!.daysLeft === 1 ? 'day' : 'days'} left</Text>
              <Text style={styles.statusText}>
                Your trial ends on {formatDate(status!.expiresAt)}. Subscribe any time — remaining trial days are kept.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.statusTitle}>⏳ Your free month has ended</Text>
              <Text style={styles.statusText}>
                Subscribe to keep connecting, messaging and sending super likes and compliments.
              </Text>
            </>
          )}
        </View>
      )}

      {plan && (
        <View style={styles.planCard}>
          <Text style={styles.planBadge}>{plan.badge}</Text>
          <Text style={styles.planName}>{plan.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{price}</Text>
            <Text style={styles.priceUnit}>/month</Text>
          </View>
          <Text style={styles.priceNote}>Billed monthly via Google Play · cancel any time</Text>

          <View style={styles.divider} />
          {plan.features.map((f) => (
            <View key={f} style={styles.featureRow}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}

          {!paidFeaturesDisabled && (
            <TouchableOpacity
              style={[styles.subscribeBtn, isPaid && styles.subscribeBtnDisabled]}
              onPress={handleSubscribe}
              disabled={purchasing || isPaid}
            >
              {purchasing
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.subscribeBtnText}>{isPaid ? '✓ You are a member' : `Subscribe for ${price}/month`}</Text>}
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.freeCard}>
        <Text style={styles.freeTitle}>Always free</Text>
        {FREE_FEATURES.map((f) => (
          <View key={f} style={styles.featureRow}>
            <Text style={styles.featureCheck}>•</Text>
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.coinsLink} onPress={() => navigation.navigate('Coins')}>
        <Text style={styles.coinsLinkText}>🪙 Need more? Coins cover extra super likes, compliments and new chats beyond daily limits</Text>
      </TouchableOpacity>

      <View style={{ height: insets.bottom + 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.lg },
  backBtn: { marginBottom: Spacing.sm },
  backBtnText: { fontSize: 28, color: Colors.textPrimary },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.textPrimary },
  headerSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },

  statusCard: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md, padding: Spacing.md,
    borderRadius: BorderRadius.lg, borderWidth: 1,
  },
  statusActive: { backgroundColor: Colors.primarySoft, borderColor: Colors.primaryLight },
  statusExpired: { backgroundColor: '#FDECEA', borderColor: Colors.error },
  statusTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textPrimary },
  statusText: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4, lineHeight: 20 },

  planCard: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md, padding: Spacing.lg,
    borderRadius: 20, borderWidth: 2, borderColor: Colors.primary, backgroundColor: Colors.surfaceElevated,
  },
  planBadge: { fontSize: 36, marginBottom: 4 },
  planName: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.primary },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: Spacing.sm },
  price: { fontSize: 38, fontWeight: '900', color: Colors.textPrimary },
  priceUnit: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: 7 },
  priceNote: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
  featureRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: 6 },
  featureCheck: { color: Colors.primary, fontWeight: '800', fontSize: FontSize.sm },
  featureText: { color: Colors.textSecondary, fontSize: FontSize.sm, flex: 1, lineHeight: 20 },
  subscribeBtn: {
    marginTop: Spacing.md, borderRadius: BorderRadius.full, paddingVertical: 14,
    alignItems: 'center', backgroundColor: Colors.primary,
  },
  subscribeBtnDisabled: { opacity: 0.7 },
  subscribeBtnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },

  freeCard: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md, padding: Spacing.lg,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  freeTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.sm },

  coinsLink: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.xl, padding: Spacing.md,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.primaryLight, backgroundColor: Colors.primarySoft,
  },
  coinsLinkText: { color: Colors.primaryDark, fontSize: FontSize.sm, fontWeight: '700', textAlign: 'center' },
});
