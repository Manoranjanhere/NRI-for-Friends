import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PeopleScreenProps, UserListKind } from '../../navigation/types';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import DiscoverService, { type NearbyUser } from '../../services/discover.service';
import { useBadgesStore } from '../../store/badges.store';
import { isOnlineNow } from '../../utils/presence';

const TILES: { kind: UserListKind; icon: string; title: string; desc: string }[] = [
  { kind: 'liked-by', icon: '👋', title: 'Friend requests', desc: 'People who want to connect' },
  { kind: 'friends', icon: '🤝', title: 'Friends', desc: 'You both connected' },
  { kind: 'viewers', icon: '👀', title: 'Viewed you', desc: 'Who checked your profile' },
  { kind: 'favorited-by', icon: '💛', title: 'Favorited you', desc: 'Who saved your profile' },
  { kind: 'favorites', icon: '⭐', title: 'My favorites', desc: 'Profiles you saved' },
  { kind: 'you-liked', icon: '📤', title: 'Requests sent', desc: 'Profiles you liked' },
  { kind: 'visited', icon: '🕘', title: 'Recently viewed', desc: 'Profiles you opened' },
];

export default function PeopleScreen({ navigation }: PeopleScreenProps) {
  const insets = useSafeAreaInsets();
  const unseenLikes = useBadgesStore((s) => s.unseenLikes);
  const [online, setOnline] = useState<NearbyUser[]>([]);
  const [fresh, setFresh] = useState<NearbyUser[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [o, n] = await Promise.allSettled([
      DiscoverService.getList('recently-online', {}, 1, 12),
      DiscoverService.getList('new-users', {}, 1, 12),
    ]);
    if (o.status === 'fulfilled') setOnline(o.value.users);
    if (n.status === 'fulfilled') setFresh(n.value.users);
    useBadgesStore.getState().refresh().catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openList = (kind: UserListKind) => navigation.navigate('UserList', { kind });

  const Carousel = ({ title, kind, users }: { title: string; kind: UserListKind; users: NearbyUser[] }) => (
    <View style={styles.carousel}>
      <View style={styles.carouselHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={() => openList(kind)}>
          <Text style={styles.seeAll}>See all ›</Text>
        </TouchableOpacity>
      </View>
      {users.length === 0 ? (
        <Text style={styles.emptyRow}>No one here yet — check back soon.</Text>
      ) : (
        <FlatList
          horizontal
          data={users}
          keyExtractor={(u) => u.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: Spacing.md }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.avatarItem}
              onPress={() => navigation.navigate('ProfileDetail', { userId: item.id })}>
              <View>
                {item.primaryPhoto ? (
                  <FastImage source={{ uri: item.primaryPhoto }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarLetter}>{item.name?.charAt(0)}</Text>
                  </View>
                )}
                {isOnlineNow(item.lastActiveAt) && <View style={styles.onlineDot} />}
                {item.sameHometown && <Text style={styles.hometown}>🏡</Text>}
              </View>
              <Text style={styles.avatarName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.avatarMeta} numberOfLines={1}>{item.city}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top + 8 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>People</Text>
        <Text style={styles.subtitle}>Your NRI circle, all in one place</Text>
      </View>

      <Carousel title="🟢 Recently online" kind="recently-online" users={online} />
      <Carousel title="✨ New members" kind="new-users" users={fresh} />

      <Text style={[styles.sectionTitle, { paddingHorizontal: Spacing.lg, marginTop: Spacing.md }]}>Your connections</Text>
      <View style={styles.grid}>
        {TILES.map((tile) => {
          const badge = tile.kind === 'liked-by' ? unseenLikes : 0;
          return (
            <TouchableOpacity key={tile.kind} style={styles.tile} onPress={() => openList(tile.kind)} activeOpacity={0.85}>
              <Text style={styles.tileIcon}>{tile.icon}</Text>
              <Text style={styles.tileTitle}>{tile.title}</Text>
              <Text style={styles.tileDesc}>{tile.desc}</Text>
              {badge > 0 && (
                <View style={styles.badge}><Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text></View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  carousel: { marginBottom: Spacing.lg },
  carouselHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm,
  },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  seeAll: { color: Colors.primary, fontWeight: '700' },
  emptyRow: { color: Colors.textMuted, paddingHorizontal: Spacing.lg },
  avatarItem: { width: 76, alignItems: 'center' },
  avatar: { width: 68, height: 68, borderRadius: 34, borderWidth: 2, borderColor: Colors.primaryLight },
  avatarFallback: { backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 26, fontWeight: '800', color: Colors.primary },
  onlineDot: {
    position: 'absolute', right: 2, bottom: 2, width: 14, height: 14, borderRadius: 7,
    backgroundColor: Colors.success, borderWidth: 2, borderColor: '#fff',
  },
  hometown: { position: 'absolute', left: -2, top: -4, fontSize: 16 },
  avatarName: { marginTop: 4, fontSize: FontSize.xs, fontWeight: '700', color: Colors.textPrimary },
  avatarMeta: { fontSize: 10, color: Colors.textMuted },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, marginTop: Spacing.sm, rowGap: Spacing.md,
  },
  tile: {
    width: '48%', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
  },
  tileIcon: { fontSize: 28, marginBottom: 6 },
  tileTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textPrimary },
  tileDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  badge: {
    position: 'absolute', top: 10, right: 10, minWidth: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
