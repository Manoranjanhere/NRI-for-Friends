import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  RefreshControl,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MyProfileScreenProps } from '../../navigation/types';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import { api } from '../../services/api';
import { useAuthStore, type AppUser } from '../../store/auth.store';
import { getProfileCompleteness } from '../../utils/profileCompleteness';
import { hasActiveSubscription, isOnTrial, daysLeft, MONTHLY_PRICE_INR } from '../../utils/subscription';
import { useFeatureFlagsStore } from '../../store/featureFlags.store';

export default function MyProfileScreen({ navigation }: MyProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const paidFeaturesDisabled = useFeatureFlagsStore((s) => s.paidFeaturesDisabled);
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [me, pics, referral] = await Promise.allSettled([
      api.get<AppUser>('/auth/me'),
      api.get<{ id: string; url: string }[]>('/users/profile/photos'),
      user?.referralCode ? Promise.resolve(null) : api.get<{ referralCode: string }>('/users/referral-code'),
    ]);
    if (me.status === 'fulfilled') updateUser(me.value.data);
    if (pics.status === 'fulfilled') setPhotos(Array.isArray(pics.value.data) ? pics.value.data : []);
    if (referral.status === 'fulfilled' && referral.value) updateUser({ referralCode: referral.value.data.referralCode });
  }, [user?.referralCode, updateUser]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const { percent, nextSteps } = getProfileCompleteness(user, photos.length);
  const active = hasActiveSubscription(user);
  const trial = isOnTrial(user);
  const left = daysLeft(user);

  const shareReferral = async () => {
    if (!user?.referralCode) return;
    try {
      await Share.share({
        message:
          `I'm on NRI Friends — the app for Indians abroad to find friends from home. ` +
          `Join with my code ${user.referralCode} and we both get bonus coins! 🤝`,
      });
    } catch {
      Alert.alert('Your referral code', user.referralCode);
    }
  };

  const Row = ({ icon, title, desc, onPress, accent }: {
    icon: string; title: string; desc?: string; onPress: () => void; accent?: boolean;
  }) => (
    <TouchableOpacity style={[styles.row, accent && styles.rowAccent]} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {desc ? <Text style={styles.rowDesc}>{desc}</Text> : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={[Colors.primarySoft, Colors.background]} style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => user && navigation.navigate('ProfileDetail', { userId: user.id })}>
          {photos[0]?.url ? (
            <FastImage source={{ uri: photos[0].url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarLetter}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.name}>
          {user?.name}{user?.age ? `, ${user.age}` : ''}{user?.isVerified ? ' ✅' : ''}
        </Text>
        <Text style={styles.meta}>
          📍 {user?.city}{user?.country ? `, ${user.country}` : ''}{user?.grewUpCity ? `  ·  🌱 ${user.grewUpCity}` : ''}
        </Text>
        <TouchableOpacity onPress={() => user && navigation.navigate('ProfileDetail', { userId: user.id })}>
          <Text style={styles.preview}>Preview my profile ›</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Completeness */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Profile strength</Text>
          <Text style={styles.percent}>{percent}%</Text>
        </View>
        <View style={styles.meterTrack}>
          <View style={[styles.meterFill, { width: `${percent}%` }]} />
        </View>
        {nextSteps.length > 0 ? (
          <TouchableOpacity onPress={() => navigation.navigate(nextSteps[0].includes('photo') ? (nextSteps[0].includes('Verify') ? 'PhotoVerification' : 'Stage2') : 'EditProfile')}>
            <Text style={styles.nextStep}>Next: {nextSteps[0]} ›</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.nextStep}>Your profile is complete — great job! 🎉</Text>
        )}
      </View>

      {/* Membership */}
      {!paidFeaturesDisabled && (
        <TouchableOpacity
          style={[styles.card, active ? styles.memberCard : styles.expiredCard]}
          onPress={() => navigation.navigate('Subscription')}
          activeOpacity={0.9}
        >
          <Text style={styles.cardTitle}>
            {trial ? '🎁 Free trial' : active ? '🧡 NRI Friends Member' : '⏳ Membership ended'}
          </Text>
          <Text style={styles.memberText}>
            {trial
              ? `${left} ${left === 1 ? 'day' : 'days'} left of your free month. Then ₹${MONTHLY_PRICE_INR}/month to keep liking and messaging.`
              : active
                ? `Renews or ends in ${left} ${left === 1 ? 'day' : 'days'}.`
                : `Subscribe for ₹${MONTHLY_PRICE_INR}/month to like profiles and send messages.`}
          </Text>
          <Text style={styles.memberCta}>{active ? 'Manage membership ›' : 'Subscribe now ›'}</Text>
        </TouchableOpacity>
      )}

      {/* Referral */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>👥 Invite friends</Text>
        <Text style={styles.memberText}>Share your code. You both get bonus coins when they sign up.</Text>
        <View style={styles.referralRow}>
          <Text style={styles.referralCode}>{user?.referralCode || '······'}</Text>
          <TouchableOpacity style={styles.shareBtn} onPress={shareReferral} disabled={!user?.referralCode}>
            <Text style={styles.shareBtnText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.list}>
        <Row icon="✏️" title="Edit profile" desc="Details, passions, work and more" onPress={() => navigation.navigate('EditProfile')} />
        <Row icon="📷" title="Manage photos" desc={`${photos.length}/6 photos`} onPress={() => navigation.navigate('Stage2')} />
        <Row
          icon={user?.isVerified ? '✅' : '🪪'}
          title={user?.isVerified ? 'Photo verified' : 'Verify your photo'}
          desc={user?.isVerified ? 'Re-verify if your photos changed' : 'Get a verified badge and more trust'}
          onPress={() => navigation.navigate('PhotoVerification')}
          accent={!user?.isVerified}
        />
        <Row icon="🪙" title="Coins" desc={typeof user?.coins === 'number' ? `Balance: ${user.coins}` : 'Extra super likes and messages'}
          onPress={() => navigation.navigate('Coins')} />
        <Row icon="⚙️" title="Settings & privacy" desc="Hide profile, blocked members, account" onPress={() => navigation.navigate('AccountSettings')} />
        {user?.isAdmin ? (
          <Row icon="🛡️" title={`Admin panel${user.isSuperAdmin ? ' (Super Admin)' : ''}`} desc="Reports, members, bans, push"
            onPress={() => navigation.navigate('AdminPanel')} />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: { alignItems: 'center', paddingBottom: Spacing.lg, paddingHorizontal: Spacing.lg },
  avatar: { width: 104, height: 104, borderRadius: 52, borderWidth: 3, borderColor: Colors.primary },
  avatarFallback: { backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 40, fontWeight: '800', color: Colors.primary },
  name: { marginTop: Spacing.sm, fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  meta: { marginTop: 2, fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  preview: { marginTop: Spacing.sm, color: Colors.primary, fontWeight: '700' },
  card: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md, padding: Spacing.md,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textPrimary },
  percent: { fontSize: FontSize.lg, fontWeight: '900', color: Colors.primary },
  meterTrack: { height: 8, borderRadius: 4, backgroundColor: Colors.primarySoft, marginTop: Spacing.sm, overflow: 'hidden' },
  meterFill: { height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  nextStep: { marginTop: Spacing.sm, color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  memberCard: { backgroundColor: Colors.primarySoft, borderColor: Colors.primaryLight },
  expiredCard: { backgroundColor: Colors.secondarySoft, borderColor: Colors.secondary },
  memberText: { marginTop: 4, color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
  memberCta: { marginTop: Spacing.sm, color: Colors.primary, fontWeight: '800' },
  referralRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm, gap: Spacing.md },
  referralCode: { flex: 1, fontSize: FontSize.xxl, fontWeight: '900', letterSpacing: 4, color: Colors.primaryDark },
  shareBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.lg, paddingVertical: 10 },
  shareBtnText: { color: '#fff', fontWeight: '800' },
  list: { marginHorizontal: Spacing.lg, gap: Spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md,
    borderRadius: BorderRadius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  rowAccent: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  rowIcon: { fontSize: 22 },
  rowTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  rowDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  chevron: { fontSize: 22, color: Colors.textMuted },
});
