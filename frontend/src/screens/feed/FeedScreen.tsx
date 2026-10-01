import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  LayoutAnimation,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FeedScreenProps } from '../../navigation/types';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import FeedService, { type FeedItem, type FeedActionTarget } from '../../services/feed.service';
import { useAuthStore } from '../../store/auth.store';
import { useFeatureFlagsStore } from '../../store/featureFlags.store';

const TAB_TARGETS: FeedActionTarget[] = ['DiscoverTab', 'PeopleTab', 'InterestsTab', 'InboxTab', 'ProfileTab'];

export default function FeedScreen({ navigation }: FeedScreenProps) {
  const insets = useSafeAreaInsets();
  const firstName = useAuthStore((s) => s.user?.name?.split(' ')[0]);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ 'complete-profile': true });

  const load = useCallback(async () => {
    try {
      const res = await FeedService.getFeed();
      setItems(res.items);
      setError(false);
      useFeatureFlagsStore.getState().setFeedEnabled(res.enabled);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openTarget = (target: FeedActionTarget) => {
    if (TAB_TARGETS.includes(target)) {
      navigation.navigate(target as 'DiscoverTab');
    } else {
      navigation.navigate(target as 'EditProfile');
    }
  };

  const renderItem = ({ item }: { item: FeedItem }) => {
    if (item.type === 'welcome') {
      return (
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeEmoji}>{item.emoji}</Text>
          <Text style={styles.welcomeTitle}>{firstName ? `Hi ${firstName}! ${item.title}` : item.title}</Text>
          <Text style={styles.welcomeBody}>{item.body}</Text>
        </View>
      );
    }

    const hasSteps = !!item.steps?.length;
    const open = !!expanded[item.id];
    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardHeader}
          activeOpacity={hasSteps ? 0.7 : 1}
          onPress={() => hasSteps && toggle(item.id)}
        >
          <View style={styles.emojiCircle}><Text style={styles.cardEmoji}>{item.emoji}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardBody}>{item.body}</Text>
          </View>
          {hasSteps ? <Text style={styles.chevron}>{open ? '▴' : '▾'}</Text> : null}
        </TouchableOpacity>

        {hasSteps && open ? (
          <View style={styles.steps}>
            {item.steps!.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <Text style={styles.stepNum}>{i + 1}</Text>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {item.action ? (
          <TouchableOpacity style={styles.actionBtn} onPress={() => openTarget(item.action!.target)}>
            <Text style={styles.actionText}>{item.action.label} ›</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Feed</Text>
        <Text style={styles.subtitle}>How NRI Friends works · tips & updates</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} tintColor={Colors.primary} colors={[Colors.primary]}
              onRefresh={() => { setRefreshing(true); load(); }} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyEmoji}>{error ? '📡' : '📰'}</Text>
              <Text style={styles.emptyText}>
                {error ? 'Could not load the feed. Pull down to try again.' : 'Nothing in the feed right now.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  title: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.textPrimary },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  list: { padding: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.md, textAlign: 'center' },

  welcomeCard: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, padding: Spacing.lg,
  },
  welcomeEmoji: { fontSize: 36 },
  welcomeTitle: { color: '#fff', fontSize: FontSize.xl, fontWeight: '900', marginTop: Spacing.xs },
  welcomeBody: { color: 'rgba(255,255,255,0.92)', fontSize: FontSize.md, lineHeight: 22, marginTop: Spacing.xs },

  card: {
    backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  emojiCircle: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  cardEmoji: { fontSize: 22 },
  cardTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textPrimary },
  cardBody: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginTop: 2 },
  chevron: { fontSize: 18, color: Colors.textMuted, paddingHorizontal: 4 },
  steps: { marginTop: Spacing.md, paddingLeft: 56, gap: Spacing.sm },
  stepRow: { flexDirection: 'row', gap: Spacing.sm },
  stepNum: {
    width: 22, height: 22, borderRadius: 11, textAlign: 'center', lineHeight: 22, overflow: 'hidden',
    backgroundColor: Colors.primarySoft, color: Colors.primaryDark, fontSize: FontSize.xs, fontWeight: '800',
  },
  stepText: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 20 },
  actionBtn: {
    alignSelf: 'flex-start', marginTop: Spacing.md, marginLeft: 56, paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.primary,
  },
  actionText: { color: Colors.primary, fontWeight: '800', fontSize: FontSize.sm },
});
