import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { InterestsScreenProps } from '../../navigation/types';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import SocialService, { type InterestItem, type InterestStatus } from '../../services/social.service';
import { timeAgo } from '../../utils/presence';
import { getErrorMessage } from '../../utils/subscription';

type Tab = 'received' | 'sent' | 'history';

const TABS: { key: Tab; label: string }[] = [
  { key: 'received', label: 'Received' },
  { key: 'sent', label: 'Sent' },
  { key: 'history', label: 'History' },
];

const STATUS_STYLE: Record<InterestStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Waiting', color: Colors.secondary, bg: Colors.secondarySoft },
  accepted: { label: 'Accepted 🤝', color: Colors.success, bg: '#E8F5E9' },
  rejected: { label: 'Declined', color: Colors.textMuted, bg: Colors.surface },
};

const EMPTY: Record<Tab, { icon: string; text: string }> = {
  received: { icon: '💌', text: 'When someone sends you a 😊 🌹 ☕ or 🧸, it shows up here.' },
  sent: { icon: '😊', text: 'Open any profile and tap an emoji to send an interest. You get 5 free every day.' },
  history: { icon: '🗂️', text: 'Every interest you send or receive is kept here.' },
};

export default function InterestsScreen({ navigation }: InterestsScreenProps) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('received');
  const [items, setItems] = useState<InterestItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const requestId = useRef(0);

  const fetchPage = (t: Tab, p: number) =>
    t === 'received' ? SocialService.getReceived(p)
      : t === 'sent' ? SocialService.getSent(p)
      : SocialService.getHistory(p);

  const load = useCallback(async (t: Tab, p: number, mode: 'initial' | 'refresh' | 'more') => {
    const id = ++requestId.current;
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    if (mode === 'more') setLoadingMore(true);
    try {
      const [res, count] = await Promise.all([
        fetchPage(t, p),
        p === 1 ? SocialService.getPendingCount() : Promise.resolve(null),
      ]);
      if (id !== requestId.current) return;
      const rows = res.items ?? [];
      setItems((prev) => (p === 1 ? rows : [...prev, ...rows]));
      setPage(p);
      setPages(res.pages);
      if (count !== null) setPendingCount(count);
    } catch {
      // keep what we have
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(tab, 1, 'initial');
    }, [tab, load]),
  );

  const respond = async (item: InterestItem, accept: boolean) => {
    setBusyId(item.id);
    try {
      if (accept) await SocialService.acceptInterest(item.id);
      else await SocialService.rejectInterest(item.id);
      const status: InterestStatus = accept ? 'accepted' : 'rejected';
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status } : i)));
      setPendingCount((c) => Math.max(0, c - 1));
      if (accept) {
        Alert.alert('Interest accepted 🤝', `We let ${item.user.name} know. Say hello!`, [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Message',
            onPress: () => navigation.navigate('ChatConversation', { userId: item.user.id, userName: item.user.name }),
          },
        ]);
      }
    } catch (err) {
      Alert.alert('Could not update', getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const renderItem = ({ item }: { item: InterestItem }) => {
    const direction = item.direction ?? (tab === 'sent' ? 'sent' : 'received');
    const status = STATUS_STYLE[item.status];
    const canRespond = direction === 'received' && item.status === 'pending';
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ProfileDetail', { userId: item.user.id })}
      >
        <View>
          {item.user.primaryPhoto ? (
            <FastImage source={{ uri: item.user.primaryPhoto }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarLetter}>{item.user.name?.charAt(0)?.toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.emojiBubble}><Text style={styles.emoji}>{item.emoji}</Text></View>
        </View>

        <View style={styles.rowBody}>
          <Text style={styles.name} numberOfLines={1}>{item.user.name}, {item.user.age}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {direction === 'sent' ? 'You sent' : 'Sent you'} {item.emoji} · {timeAgo(item.createdAt)}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>📍 {item.user.city}{item.user.grewUpCity ? ` · 🌱 ${item.user.grewUpCity}` : ''}</Text>

          {canRespond ? (
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} disabled={busyId === item.id}
                onPress={() => respond(item, true)}>
                {busyId === item.id ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.acceptText}>Accept</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} disabled={busyId === item.id}
                onPress={() => respond(item, false)}>
                <Text style={styles.rejectText}>Decline</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Interests</Text>
        <Text style={styles.subtitle}>😊 🌹 ☕ 🧸 sent between you and other members</Text>
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => { if (t.key !== tab) { setItems([]); setTab(t.key); } }}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}{t.key === 'received' && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, items.length === 0 && { flex: 1 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(tab, 1, 'refresh')} tintColor={Colors.primary} />}
          onEndReached={() => { if (!loadingMore && page < pages) load(tab, page + 1, 'more'); }}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>{EMPTY[tab].icon}</Text>
              <Text style={styles.emptyText}>{EMPTY[tab].text}</Text>
            </View>
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} /> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  tabs: {
    flexDirection: 'row', marginHorizontal: Spacing.lg, backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full, padding: 4, marginBottom: Spacing.md,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: BorderRadius.full, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },
  tabTextActive: { color: '#fff' },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 32 },
  row: {
    flexDirection: 'row', gap: Spacing.md, padding: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: Colors.background, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border,
  },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: { backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 26, fontWeight: '800', color: Colors.primary },
  emojiBubble: {
    position: 'absolute', right: -4, bottom: -4, width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  emoji: { fontSize: 16 },
  rowBody: { flex: 1 },
  name: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textPrimary },
  meta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: BorderRadius.full, alignItems: 'center' },
  acceptBtn: { backgroundColor: Colors.primary },
  acceptText: { color: '#fff', fontWeight: '700' },
  rejectBtn: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  rejectText: { color: Colors.textSecondary, fontWeight: '700' },
  statusPill: { alignSelf: 'flex-start', marginTop: Spacing.sm, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusText: { fontSize: FontSize.xs, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 56 },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
