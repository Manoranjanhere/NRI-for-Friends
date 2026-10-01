import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { UserListScreenProps, UserListKind } from '../../navigation/types';
import { Colors, Spacing, FontSize } from '../../theme';
import ProfileService from '../../services/profile.service';
import SocialService, { type Paged } from '../../services/social.service';
import DiscoverService, { type DiscoverFilters } from '../../services/discover.service';
import ProfileCard, { type ProfileCardUser } from '../../components/profile/ProfileCard';
import FiltersModal, { countActiveFilters } from '../../components/discover/FiltersModal';
import { timeAgo, lastSeenLabel } from '../../utils/presence';
import { MIN_AGE, MAX_AGE } from '../../constants/profileOptions';

type ListUser = ProfileCardUser & {
  likedAt?: string;
  matchedAt?: string;
  favoritedAt?: string;
  visitedAt?: string;
  visitCount?: number;
  createdAt?: string;
  blockedAt?: string;
};

interface ListConfig {
  title: string;
  subtitle: (total: number) => string;
  emptyIcon: string;
  emptyText: string;
  filterable?: boolean;
  fetch: (page: number, filters: DiscoverFilters) => Promise<Paged<ListUser>>;
  caption?: (u: ListUser) => string | undefined;
  onOpen?: () => void;
}

const PAGE_SIZE = 20;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const LIST_CONFIG: Record<UserListKind, ListConfig> = {
  favorites: {
    title: 'Favorites ⭐',
    subtitle: (n) => (n ? `${plural(n, 'profile', 'profiles')} you saved` : 'Profiles you save show up here'),
    emptyIcon: '⭐',
    emptyText: 'Tap the star on any profile to save it here.',
    fetch: (p) => SocialService.getFavorites(p, PAGE_SIZE),
    caption: (u) => (u.favoritedAt ? `Saved ${timeAgo(u.favoritedAt)}` : undefined),
  },
  'favorited-by': {
    title: 'Favorited you 💛',
    subtitle: (n) => (n ? `${plural(n, 'person', 'people')} added you to favorites` : 'Nobody yet'),
    emptyIcon: '💛',
    emptyText: 'Complete your profile and add photos so more NRIs save you.',
    fetch: (p) => SocialService.getFavoritedBy(p, PAGE_SIZE),
    caption: (u) => (u.favoritedAt ? `Added you ${timeAgo(u.favoritedAt)}` : undefined),
  },
  viewers: {
    title: 'Viewed your profile 👀',
    subtitle: (n) => (n ? `${plural(n, 'person', 'people')} checked you out` : 'No visits yet'),
    emptyIcon: '👀',
    emptyText: 'When someone opens your profile, they appear here.',
    fetch: (p) => SocialService.getViewers(p, PAGE_SIZE),
    caption: (u) => (u.visitedAt ? `Viewed ${timeAgo(u.visitedAt)}${u.visitCount && u.visitCount > 1 ? ` · ${u.visitCount}×` : ''}` : undefined),
  },
  visited: {
    title: 'Recently viewed',
    subtitle: (n) => (n ? `${plural(n, 'profile', 'profiles')} you opened` : 'Nothing yet'),
    emptyIcon: '🕘',
    emptyText: 'Profiles you open appear here so you can find them again.',
    fetch: (p) => SocialService.getVisited(p, PAGE_SIZE),
    caption: (u) => (u.visitedAt ? `You viewed ${timeAgo(u.visitedAt)}` : undefined),
  },
  'liked-by': {
    title: 'Friend requests 👋',
    subtitle: (n) => (n ? `${plural(n, 'person wants', 'people want')} to connect` : 'No requests yet'),
    emptyIcon: '👋',
    emptyText: 'Complete your profile so more NRIs can find you.',
    fetch: (p) => ProfileService.getLikedBy(p, PAGE_SIZE),
    caption: (u) => (u.likedAt ? `Liked you ${timeAgo(u.likedAt)}` : undefined),
    onOpen: () => { ProfileService.markLikedBySeen().catch(() => {}); },
  },
  'you-liked': {
    title: 'Requests sent',
    subtitle: (n) => (n ? `You liked ${plural(n, 'profile', 'profiles')}` : 'You have not liked anyone yet'),
    emptyIcon: '🤝',
    emptyText: 'Tap 🤝 on a profile to send a friend request.',
    fetch: (p) => ProfileService.getYouLiked(p, PAGE_SIZE),
    caption: (u) => (u.likedAt ? `Liked ${timeAgo(u.likedAt)}` : undefined),
  },
  friends: {
    title: 'Friends 🤝',
    subtitle: (n) => (n ? plural(n, 'friend', 'friends') : 'No friends yet'),
    emptyIcon: '🤝',
    emptyText: 'When you and someone both connect, you become friends and can chat.',
    fetch: (p) => ProfileService.getMatches(p, PAGE_SIZE),
    caption: (u) => (u.matchedAt ? `Friends since ${timeAgo(u.matchedAt)}` : undefined),
  },
  'recently-online': {
    title: 'Recently online 🟢',
    subtitle: (n) => (n ? `${plural(n, 'member', 'members')} active in the last 3 days` : 'No one matches'),
    emptyIcon: '🟢',
    emptyText: 'Try widening your filters.',
    filterable: true,
    fetch: (p, f) => DiscoverService.getList('recently-online', f, p, PAGE_SIZE),
    caption: (u) => lastSeenLabel(u.lastActiveAt),
  },
  'new-users': {
    title: 'New members ✨',
    subtitle: (n) => (n ? `${plural(n, 'member', 'members')} joined this month` : 'No new members match'),
    emptyIcon: '✨',
    emptyText: 'Try widening your filters.',
    filterable: true,
    fetch: (p, f) => DiscoverService.getList('new-users', f, p, PAGE_SIZE),
    caption: (u) => (u.createdAt ? `Joined ${timeAgo(u.createdAt)}` : undefined),
  },
  blocked: {
    title: 'Blocked members',
    subtitle: (n) => (n ? plural(n, 'member', 'members') : 'You have not blocked anyone'),
    emptyIcon: '🚫',
    emptyText: 'Members you block appear here. Open a profile to unblock.',
    fetch: () => SocialService.getBlocked(),
    caption: (u) => (u.blockedAt ? `Blocked ${timeAgo(u.blockedAt)}` : undefined),
  },
};

export default function UserListScreen({ navigation, route }: UserListScreenProps) {
  const { kind } = route.params;
  const config = LIST_CONFIG[kind];
  const insets = useSafeAreaInsets();

  const [users, setUsers] = useState<ListUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DiscoverFilters>({ minAge: MIN_AGE, maxAge: MAX_AGE });
  const [showFilters, setShowFilters] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async (pageNum: number, f: DiscoverFilters, mode: 'initial' | 'refresh' | 'more') => {
    const id = ++requestId.current;
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    if (mode === 'more') setLoadingMore(true);
    try {
      const res = await config.fetch(pageNum, f);
      if (id !== requestId.current) return;
      const rows = res.users ?? [];
      setUsers((prev) => (pageNum === 1 ? rows : [...prev, ...rows.filter((r) => !prev.some((p) => p.id === r.id))]));
      setTotal(res.total);
      setPages(res.pages);
      setPage(pageNum);
      setError(null);
    } catch (err: any) {
      if (id === requestId.current && pageNum === 1) {
        setError(err?.response?.data?.message || 'Could not load this list');
      }
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, [config]);

  useEffect(() => {
    load(1, filters, 'initial');
    config.onOpen?.();
  }, []);

  const applyFilters = (f: DiscoverFilters) => {
    setFilters(f);
    load(1, f, 'initial');
  };

  const renderItem = useCallback(({ item }: { item: ListUser }) => (
    <ProfileCard
      user={item}
      caption={config.caption?.(item)}
      onPress={() => navigation.navigate('ProfileDetail', { userId: item.id })}
    />
  ), [navigation, config]);

  const activeFilters = countActiveFilters(filters) + (filters.maxDistance ? 1 : 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{config.title}</Text>
          {!loading && <Text style={styles.subtitle}>{config.subtitle(total)}</Text>}
        </View>
        {config.filterable && (
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(true)}>
            <Text style={styles.filterIcon}>🎛️</Text>
            {activeFilters > 0 && (
              <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeFilters}</Text></View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load(1, filters, 'initial')}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[styles.listContent, users.length === 0 && { flex: 1 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(1, filters, 'refresh')} tintColor={Colors.primary} />
          }
          onEndReached={() => { if (!loadingMore && page < pages) load(page + 1, filters, 'more'); }}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>{config.emptyIcon}</Text>
              <Text style={styles.emptyText}>{config.emptyText}</Text>
            </View>
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} /> : null}
        />
      )}

      {config.filterable && (
        <FiltersModal
          visible={showFilters}
          filters={filters}
          onApply={applyFilters}
          onClose={() => setShowFilters(false)}
          distanceOptional
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  backIcon: { fontSize: 28, color: Colors.textPrimary, lineHeight: 30 },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  filterBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  filterIcon: { fontSize: 18 },
  filterBadge: {
    position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  row: { justifyContent: 'space-between', paddingHorizontal: Spacing.lg, marginBottom: 12 },
  listContent: { paddingTop: Spacing.sm, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 56 },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  retryBtn: { marginTop: Spacing.sm, backgroundColor: Colors.primary, borderRadius: 999, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
});
