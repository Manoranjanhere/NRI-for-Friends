import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  StatusBar,
  Animated,
  TextInput,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ProfileDetailScreenProps } from '../../navigation/types';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import ProfileService, { type ProfileUser } from '../../services/profile.service';
import SocialService from '../../services/social.service';
import { useAuthStore } from '../../store/auth.store';
import { useBadgesStore } from '../../store/badges.store';
import { useInteractionAccess } from '../../hooks/useInteractionAccess';
import { showSubscribeRequiredAlert, showPaymentOrCoinError, getErrorMessage } from '../../utils/subscription';
import { lastSeenLabel, isOnlineNow, timeAgo } from '../../utils/presence';
import {
  RELATIONSHIP_STATUSES,
  LOOKING_FOR_OPTIONS,
  INTERESTED_IN_OPTIONS,
  INTEREST_EMOJIS,
  labelFor,
  formatHeight,
  passionEmoji,
  type InterestType,
} from '../../constants/profileOptions';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PHOTO_HEIGHT = SCREEN_H * 0.58;

const REPORT_REASONS = [
  { label: 'Fake profile', value: 'fake_profile' },
  { label: 'Inappropriate photo', value: 'inappropriate_photo' },
  { label: 'Spam or scam', value: 'spam' },
  { label: 'Harassment', value: 'harassment' },
  { label: 'Underage', value: 'underage' },
  { label: 'Other', value: 'other' },
];

const emojiFor = (type?: string) => INTEREST_EMOJIS.find((e) => e.type === type)?.emoji ?? '💌';

export default function ProfileDetailScreen({ navigation, route }: ProfileDetailScreenProps) {
  const { userId } = route.params;
  const insets = useSafeAreaInsets();
  const authUser = useAuthStore((s) => s.user);
  const access = useInteractionAccess(authUser);

  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [reportModal, setReportModal] = useState(false);
  const [reportPhotoId, setReportPhotoId] = useState<string | null>(null);
  const [complimentModal, setComplimentModal] = useState(false);
  const [complimentText, setComplimentText] = useState('');
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      setProfile(await ProfileService.getFullProfile(userId));
    } catch {
      Alert.alert('Profile unavailable', 'This member is no longer available.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [userId, navigation]);

  useEffect(() => { loadProfile(); }, [loadProfile]);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const showToast = (title: string, message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ title, message });
    toastAnim.setValue(0);
    Animated.timing(toastAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setToast(null));
    }, 2600);
  };

  const patch = (p: Partial<ProfileUser>) => setProfile((prev) => (prev ? { ...prev, ...p } : prev));

  const requireMembership = (feature: string) => {
    if (access === 'allowed') return true;
    showSubscribeRequiredAlert(navigation, feature);
    return false;
  };

  // ─── Actions ────────────────────────────────────────────────────────────

  const handleLike = async () => {
    if (!profile || busy || !requireMembership('connect with members')) return;
    setBusy('like');
    try {
      const res = await ProfileService.toggleLike(userId);
      patch({ hasLiked: res.liked, isFriend: res.liked && profile.likedMe });
      if (res.isMatch) showToast("You're friends! 🤝", `You and ${profile.name} both want to connect. Say hello!`);
      else if (res.liked) showToast('Request sent 🤝', `${profile.name} will see that you want to connect.`);
    } catch (err) {
      showPaymentOrCoinError(navigation, err, 'connect');
    } finally {
      setBusy(null);
    }
  };

  const handleSuperLike = async () => {
    if (!profile || busy || !requireMembership('send super likes')) return;
    setBusy('super');
    try {
      const res = await ProfileService.superLike(userId);
      patch({ hasLiked: res.liked, isSuperLike: true, isFriend: res.liked && profile.likedMe });
      showToast(res.isMatch ? "You're friends! 🤝" : 'Super like sent ⭐', res.isMatch
        ? `You and ${profile.name} both want to connect.`
        : `${profile.name} will see you at the top of their requests.`);
    } catch (err) {
      showPaymentOrCoinError(navigation, err, 'send a super like');
    } finally {
      setBusy(null);
    }
  };

  const handleFavorite = async () => {
    if (!profile || busy) return;
    setBusy('favorite');
    const next = !profile.isFavorite;
    patch({ isFavorite: next });
    try {
      const res = await SocialService.toggleFavorite(userId);
      patch({ isFavorite: res.favorited });
      showToast(res.favorited ? 'Added to favorites ⭐' : 'Removed from favorites', res.favorited
        ? 'Find them any time under People → My favorites.'
        : '');
    } catch (err) {
      patch({ isFavorite: !next });
      Alert.alert('Could not update favorites', getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const handleSendInterest = async (type: InterestType) => {
    if (!profile || busy) return;
    setBusy(`interest_${type}`);
    try {
      const res = await SocialService.sendInterest(userId, type);
      if (res.autoAccepted) {
        showToast('Interest accepted 🤝', `${profile.name} had already sent you one — you're connected!`);
      } else {
        const left = res.remainingToday;
        showToast(`${emojiFor(type)} Interest sent`, left != null
          ? `Delivered to ${profile.name}'s inbox. ${left} free ${left === 1 ? 'interest' : 'interests'} left today.`
          : `Delivered to ${profile.name}'s inbox.`);
      }
      await loadProfile();
    } catch (err) {
      Alert.alert('Could not send interest', getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const handleRespond = async (accept: boolean) => {
    const interest = profile?.interestReceived;
    if (!profile || !interest || busy) return;
    setBusy(accept ? 'accept' : 'reject');
    try {
      if (accept) await SocialService.acceptInterest(interest.id);
      else await SocialService.rejectInterest(interest.id);
      useBadgesStore.getState().refresh().catch(() => {});
      if (accept) showToast('Interest accepted 🤝', `We let ${profile.name} know. Say hello!`);
      await loadProfile();
    } catch (err) {
      Alert.alert('Could not update', getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const handleSendCompliment = async () => {
    const message = complimentText.trim();
    if (!message) {
      Alert.alert('Write something nice', 'Please add a message before sending.');
      return;
    }
    if (busy || !requireMembership('send compliments')) return;
    setBusy('compliment');
    try {
      await ProfileService.sendCompliment(userId, message);
      setComplimentModal(false);
      setComplimentText('');
      showToast('Compliment sent 💝', `Delivered to ${profile?.name}'s inbox.`);
    } catch (err) {
      showPaymentOrCoinError(navigation, err, 'send a compliment');
    } finally {
      setBusy(null);
    }
  };

  const handleMessage = () => {
    if (!profile || !requireMembership('send messages')) return;
    navigation.navigate('ChatConversation', { userId: profile.id, userName: profile.name });
  };

  const handleBlock = () => {
    if (!profile) return;
    const blocking = !profile.blockedByMe;
    Alert.alert(
      blocking ? `Block ${profile.name}?` : `Unblock ${profile.name}?`,
      blocking
        ? "They won't see you, message you or send you interests. Favorites and pending interests between you are removed."
        : 'They will be able to find you and contact you again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: blocking ? 'Block' : 'Unblock',
          style: blocking ? 'destructive' : 'default',
          onPress: async () => {
            setBusy('block');
            try {
              const res = await SocialService.toggleBlock(userId);
              patch({ blockedByMe: res.blocked, isFavorite: res.blocked ? false : profile.isFavorite });
              if (res.blocked) navigation.goBack();
            } catch (err) {
              Alert.alert('Could not update', getErrorMessage(err));
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  const handleReport = async (reason: string) => {
    setBusy('report');
    try {
      await ProfileService.reportUser(userId, reason, undefined, reportPhotoId || undefined);
      setReportModal(false);
      setReportPhotoId(null);
      Alert.alert('Thanks for reporting', 'Our team will review this. You can also block this member.');
    } catch {
      Alert.alert('Error', 'Could not submit report');
    } finally {
      setBusy(null);
    }
  };

  const onPhotoScroll = useCallback((e: any) => {
    setActivePhotoIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
  }, []);

  if (loading) {
    return <View style={styles.loader}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }
  if (!profile) return null;

  const own = profile.isOwnProfile;
  const photos = profile.photos?.length ? profile.photos : [{ id: 'placeholder', url: '', order: 0 }];
  const sent = profile.interestSent;
  const received = profile.interestReceived;
  const online = isOnlineNow(profile.lastActiveAt);

  const facts: { icon: string; label: string; value?: string | null }[] = [
    { icon: '💍', label: 'Relationship', value: labelFor(RELATIONSHIP_STATUSES, profile.relationshipStatus) },
    { icon: '📏', label: 'Height', value: formatHeight(profile.heightCm) },
    { icon: '🗣️', label: 'Mother tongue', value: profile.motherTongue },
    { icon: '🙏', label: 'Religion', value: profile.religion },
    { icon: '👋', label: 'Wants to meet', value: labelFor(INTERESTED_IN_OPTIONS, profile.interestedIn) },
  ].filter((f) => f.value);

  const work: { icon: string; label: string; value?: string | null }[] = [
    { icon: '💼', label: 'Job', value: profile.jobProfile },
    { icon: '🏢', label: 'Profession', value: profile.profession },
    { icon: '🎓', label: 'Education', value: profile.education },
    { icon: '💰', label: 'Salary', value: profile.salaryRange },
  ].filter((f) => f.value);

  const ActionBtn = ({ icon, label, onPress, active, loadingKey, danger }: {
    icon: string; label: string; onPress: () => void; active?: boolean; loadingKey?: string; danger?: boolean;
  }) => (
    <TouchableOpacity style={styles.actionItem} onPress={onPress} disabled={!!busy} activeOpacity={0.8}>
      <View style={[styles.actionCircle, active && styles.actionCircleActive, danger && styles.actionCircleDanger]}>
        {loadingKey && busy === loadingKey
          ? <ActivityIndicator color={Colors.primary} size="small" />
          : <Text style={styles.actionIcon}>{icon}</Text>}
      </View>
      <Text style={[styles.actionLabel, active && { color: Colors.primary }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.toast, {
            top: insets.top + 14,
            opacity: toastAnim,
            transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
          }]}
        >
          <Text style={styles.toastTitle}>{toast.title}</Text>
          {toast.message ? <Text style={styles.toastText}>{toast.message}</Text> : null}
        </Animated.View>
      ) : null}

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Photos */}
        <View style={[styles.photoSection, { height: PHOTO_HEIGHT }]}>
          <FlatList
            data={photos}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onPhotoScroll}
            scrollEventThrottle={16}
            renderItem={({ item }) => (
              <View style={styles.photoSlide}>
                {item.url ? (
                  <FastImage source={{ uri: item.url, priority: FastImage.priority.high }} style={styles.photo}
                    resizeMode={FastImage.resizeMode.cover} />
                ) : (
                  <View style={[styles.photo, styles.photoPlaceholder]}>
                    <Text style={styles.photoPlaceholderText}>{profile.name?.charAt(0)}</Text>
                  </View>
                )}
                {item.url && !own ? (
                  <TouchableOpacity style={styles.photoReportBtn}
                    onPress={() => { setReportPhotoId(item.id); setReportModal(true); }}>
                    <Text style={styles.photoReportIcon}>⚑</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          />

          {photos.length > 1 && (
            <View style={styles.dotsContainer}>
              {photos.map((_, i) => <View key={i} style={[styles.dot, i === activePhotoIndex && styles.dotActive]} />)}
            </View>
          )}

          <TouchableOpacity style={[styles.backBtn, { top: insets.top + 10 }]} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.photoOverlayInfo}>
            {profile.sameHometown && (
              <View style={styles.hometownBadge}><Text style={styles.hometownText}>🏡 Same hometown as you</Text></View>
            )}
            <View style={styles.nameRow}>
              <Text style={styles.nameText}>{profile.name}</Text>
              <Text style={styles.ageText}>{profile.age}</Text>
              {profile.photoVerifiedStatus === 'verified' && <Text style={styles.verified}>✅</Text>}
            </View>
            <Text style={styles.locationText}>
              📍 Lives in {profile.city}, {profile.country}
            </Text>
            {profile.lastActiveAt ? (
              <Text style={[styles.presence, online && { color: '#B9F6CA' }]}>
                {online ? '● ' : ''}{lastSeenLabel(profile.lastActiveAt)}
              </Text>
            ) : null}
          </View>
        </View>

        {own ? (
          <View style={styles.previewBanner}>
            <Text style={styles.previewText}>👀 This is how other members see your profile</Text>
            <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
              <Text style={styles.previewLink}>Edit profile ›</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Relationship status chips */}
            {(profile.isFriend || (profile.likedMe && !profile.hasLiked) || profile.blockedByMe) && (
              <View style={styles.statusRow}>
                {profile.isFriend && <View style={styles.statusChip}><Text style={styles.statusChipText}>🤝 You're friends</Text></View>}
                {!profile.isFriend && profile.likedMe && (
                  <View style={styles.statusChip}><Text style={styles.statusChipText}>👋 Wants to connect with you</Text></View>
                )}
                {profile.blockedByMe && (
                  <View style={[styles.statusChip, styles.statusChipDanger]}><Text style={styles.statusChipDangerText}>🚫 Blocked</Text></View>
                )}
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionsRow}>
              <ActionBtn icon={profile.hasLiked ? '✅' : '🤝'} label={profile.isFriend ? 'Friends' : profile.hasLiked ? 'Requested' : 'Connect'}
                onPress={handleLike} active={profile.hasLiked} loadingKey="like" />
              <ActionBtn icon={profile.isFavorite ? '⭐' : '☆'} label={profile.isFavorite ? 'Saved' : 'Favorite'}
                onPress={handleFavorite} active={profile.isFavorite} loadingKey="favorite" />
              <ActionBtn icon="💬" label="Message" onPress={handleMessage} />
              <ActionBtn icon="🌟" label="Super like" onPress={handleSuperLike} active={profile.isSuperLike} loadingKey="super" />
              <ActionBtn icon="💝" label="Compliment" onPress={() => requireMembership('send compliments') && setComplimentModal(true)} />
            </View>

            {/* Interests */}
            <View style={styles.interestCard}>
              {received?.status === 'pending' ? (
                <>
                  <Text style={styles.interestTitle}>{emojiFor(received.type)} {profile.name} sent you an interest</Text>
                  <Text style={styles.interestSub}>{timeAgo(received.createdAt)}</Text>
                  <View style={styles.respondRow}>
                    <TouchableOpacity style={[styles.respondBtn, styles.acceptBtn]} disabled={!!busy} onPress={() => handleRespond(true)}>
                      {busy === 'accept' ? <ActivityIndicator color="#fff" /> : <Text style={styles.acceptText}>Accept</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.respondBtn, styles.rejectBtn]} disabled={!!busy} onPress={() => handleRespond(false)}>
                      <Text style={styles.rejectText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : sent?.status === 'pending' ? (
                <>
                  <Text style={styles.interestTitle}>{emojiFor(sent.type)} Interest sent</Text>
                  <Text style={styles.interestSub}>Waiting for {profile.name} to reply · {timeAgo(sent.createdAt)}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.interestTitle}>
                    {sent?.status === 'accepted' || received?.status === 'accepted'
                      ? '🤝 Interest accepted — say hello!'
                      : 'Send an interest'}
                  </Text>
                  <Text style={styles.interestSub}>
                    {sent?.status === 'rejected'
                      ? `Your last interest was declined. You can try again later.`
                      : 'Free — lands in their inbox. 5 per day.'}
                  </Text>
                  <View style={styles.emojiRow}>
                    {INTEREST_EMOJIS.map((e) => (
                      <TouchableOpacity key={e.type} style={styles.emojiBtn} disabled={!!busy}
                        onPress={() => handleSendInterest(e.type)}>
                        {busy === `interest_${e.type}`
                          ? <ActivityIndicator color={Colors.primary} />
                          : <Text style={styles.emojiIcon}>{e.emoji}</Text>}
                        <Text style={styles.emojiLabel}>{e.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </View>
          </>
        )}

        {/* Details */}
        <View style={styles.details}>
          {profile.bio ? (
            <Section title="About">
              <Text style={styles.bioText}>{profile.bio}</Text>
            </Section>
          ) : null}

          {profile.lookingFor?.length ? (
            <Section title="Looking for">
              <View style={styles.tagsRow}>
                {profile.lookingFor.map((v) => {
                  const opt = LOOKING_FOR_OPTIONS.find((o) => o.value === v);
                  return <View key={v} style={[styles.tag, styles.tagAccent]}><Text style={styles.tagText}>{opt?.emoji} {opt?.label ?? v}</Text></View>;
                })}
              </View>
            </Section>
          ) : null}

          <Section title="Roots">
            <Fact icon="🏠" label="Lives in" value={`${profile.city}, ${profile.country}`} />
            {profile.grewUpCity ? <Fact icon="🌱" label="Grew up in" value={profile.grewUpCity} /> : null}
          </Section>

          {facts.length ? (
            <Section title="Basics">
              {facts.map((f) => <Fact key={f.label} icon={f.icon} label={f.label} value={f.value!} />)}
            </Section>
          ) : null}

          {work.length ? (
            <Section title="Work & education">
              {work.map((f) => <Fact key={f.label} icon={f.icon} label={f.label} value={f.value!} />)}
            </Section>
          ) : null}

          {profile.passions?.length ? (
            <Section title="Passions">
              <View style={styles.tagsRow}>
                {profile.passions.map((p) => (
                  <View key={p} style={styles.tag}><Text style={styles.tagText}>{passionEmoji(p)} {p}</Text></View>
                ))}
              </View>
            </Section>
          ) : null}

          {!own && (
            <View style={styles.safetyRow}>
              <TouchableOpacity style={styles.safetyBtn} onPress={() => { setReportPhotoId(null); setReportModal(true); }}>
                <Text style={styles.safetyText}>🚩 Report</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.safetyBtn} onPress={handleBlock} disabled={busy === 'block'}>
                <Text style={[styles.safetyText, { color: Colors.error }]}>{profile.blockedByMe ? '🔓 Unblock' : '🚫 Block'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: insets.bottom + 32 }} />
      </ScrollView>

      {/* Compliment modal */}
      <Modal visible={complimentModal} transparent animationType="fade" onRequestClose={() => setComplimentModal(false)}>
        <View style={styles.modalCenter}>
          <View style={styles.complimentCard}>
            <Text style={styles.complimentTitle}>Send a compliment 💝</Text>
            <Text style={styles.complimentSubtitle}>It arrives in their inbox as a message.</Text>
            <TextInput
              style={styles.complimentInput}
              value={complimentText}
              onChangeText={setComplimentText}
              placeholder="Love your travel photos! Which city was that?"
              placeholderTextColor={Colors.textMuted}
              multiline
              maxLength={255}
              textAlignVertical="top"
            />
            <Text style={styles.complimentCounter}>{complimentText.length}/255</Text>
            <View style={styles.complimentActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setComplimentModal(false)} disabled={busy === 'compliment'}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sendBtn} onPress={handleSendCompliment} disabled={busy === 'compliment'}>
                {busy === 'compliment' ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendText}>Send</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Report modal */}
      <Modal visible={reportModal} transparent animationType="slide" onRequestClose={() => setReportModal(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setReportModal(false)} />
        <View style={[styles.reportSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.reportHandle} />
          <Text style={styles.reportTitle}>{reportPhotoId ? 'Report this photo' : `Report ${profile.name}`}</Text>
          <Text style={styles.reportSubtitle}>Why are you reporting?</Text>
          {REPORT_REASONS.map((r) => (
            <TouchableOpacity key={r.value} style={styles.reportOption} onPress={() => handleReport(r.value)} disabled={busy === 'report'}>
              <Text style={styles.reportOptionText}>{r.label}</Text>
              {busy === 'report' ? <ActivityIndicator color={Colors.primary} size="small" /> : <Text style={styles.reportArrow}>›</Text>}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.reportCancel} onPress={() => setReportModal(false)}>
            <Text style={styles.reportCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Fact({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factIcon}>{icon}</Text>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  toast: {
    position: 'absolute', left: Spacing.md, right: Spacing.md, zIndex: 50,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.primaryLight,
    backgroundColor: Colors.primarySoft, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  toastTitle: { color: Colors.primaryDark, fontSize: FontSize.md, fontWeight: '800', marginBottom: 2 },
  toastText: { color: Colors.textPrimary, fontSize: FontSize.sm, lineHeight: 18 },

  photoSection: { width: SCREEN_W, overflow: 'hidden' },
  photoSlide: { width: SCREEN_W, height: PHOTO_HEIGHT },
  photo: { width: SCREEN_W, height: PHOTO_HEIGHT },
  photoPlaceholder: { backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  photoPlaceholderText: { fontSize: 96, fontWeight: '800', color: Colors.primary },
  dotsContainer: { position: 'absolute', top: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive: { backgroundColor: '#fff', width: 20 },
  backBtn: {
    position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { color: '#fff', fontSize: 28, lineHeight: 34, marginTop: -2 },
  photoReportBtn: {
    position: 'absolute', top: 60, right: 16, width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
  },
  photoReportIcon: { fontSize: 16, color: '#fff' },
  photoOverlayInfo: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, paddingBottom: Spacing.lg, backgroundColor: 'rgba(0,0,0,0.4)',
  },
  hometownBadge: {
    alignSelf: 'flex-start', backgroundColor: Colors.primary, borderRadius: BorderRadius.full,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8,
  },
  hometownText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '800' },
  nameRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, marginBottom: 2 },
  nameText: { fontSize: 30, fontWeight: '800', color: '#fff' },
  ageText: { fontSize: 22, color: 'rgba(255,255,255,0.9)', marginBottom: 3 },
  verified: { fontSize: 20, marginBottom: 4 },
  locationText: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.9)' },
  presence: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.75)', marginTop: 4, fontWeight: '600' },

  previewBanner: {
    margin: Spacing.lg, padding: Spacing.md, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primarySoft, borderWidth: 1, borderColor: Colors.primaryLight,
  },
  previewText: { color: Colors.textPrimary, fontWeight: '600' },
  previewLink: { color: Colors.primary, fontWeight: '800', marginTop: 6 },

  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  statusChip: { backgroundColor: Colors.primarySoft, borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 6 },
  statusChipText: { color: Colors.primaryDark, fontWeight: '700', fontSize: FontSize.sm },
  statusChipDanger: { backgroundColor: '#FDECEA' },
  statusChipDangerText: { color: Colors.error, fontWeight: '700', fontSize: FontSize.sm },

  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg },
  actionItem: { alignItems: 'center', width: (SCREEN_W - Spacing.lg * 2) / 5 },
  actionCircle: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  actionCircleActive: { backgroundColor: Colors.primarySoft, borderColor: Colors.primary },
  actionCircleDanger: { borderColor: Colors.error },
  actionIcon: { fontSize: 22 },
  actionLabel: { marginTop: 4, fontSize: 11, fontWeight: '700', color: Colors.textSecondary },

  interestCard: {
    marginHorizontal: Spacing.lg, padding: Spacing.md, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  interestTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textPrimary },
  interestSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  emojiRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md },
  emojiBtn: {
    flex: 1, marginHorizontal: 4, alignItems: 'center', paddingVertical: 10, borderRadius: BorderRadius.md,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
  },
  emojiIcon: { fontSize: 28 },
  emojiLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '700', marginTop: 2 },
  respondRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  respondBtn: { flex: 1, paddingVertical: 12, borderRadius: BorderRadius.full, alignItems: 'center' },
  acceptBtn: { backgroundColor: Colors.primary },
  acceptText: { color: '#fff', fontWeight: '800' },
  rejectBtn: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  rejectText: { color: Colors.textSecondary, fontWeight: '700' },

  details: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: FontSize.sm, fontWeight: '800', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm,
  },
  bioText: { fontSize: FontSize.md, color: Colors.textPrimary, lineHeight: 24 },
  fact: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  factIcon: { fontSize: 18, width: 30 },
  factLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, width: 120 },
  factValue: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag: {
    borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 6,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  tagAccent: { backgroundColor: Colors.primarySoft, borderColor: Colors.primaryLight },
  tagText: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '600' },
  safetyRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  safetyBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  safetyText: { fontWeight: '700', color: Colors.textSecondary },

  modalCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  complimentCard: { width: '100%', borderRadius: BorderRadius.lg, backgroundColor: Colors.background, padding: Spacing.lg },
  complimentTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '800' },
  complimentSubtitle: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 4, marginBottom: Spacing.md },
  complimentInput: {
    minHeight: 110, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface, color: Colors.textPrimary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
  },
  complimentCounter: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 6, textAlign: 'right' },
  complimentActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.md },
  cancelBtn: { borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 10 },
  cancelText: { color: Colors.textSecondary, fontWeight: '700' },
  sendBtn: { borderRadius: BorderRadius.full, backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: 10, minWidth: 92, alignItems: 'center' },
  sendText: { color: '#fff', fontWeight: '800' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  reportSheet: {
    backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md,
  },
  reportHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.lg },
  reportTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  reportSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.lg },
  reportOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  reportOptionText: { fontSize: FontSize.md, color: Colors.textPrimary },
  reportArrow: { fontSize: 20, color: Colors.textMuted },
  reportCancel: { marginTop: Spacing.lg, alignItems: 'center', paddingVertical: 12 },
  reportCancelText: { fontSize: FontSize.md, color: Colors.primary, fontWeight: '700' },
});
