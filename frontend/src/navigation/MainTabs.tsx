import React, { useEffect } from 'react';
import { AppState, Text, View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MainTabParamList } from './types';
import { Colors } from '../theme';
import { useBadgesStore } from '../store/badges.store';
import { useFeatureFlagsStore } from '../store/featureFlags.store';

import FeedScreen from '../screens/feed/FeedScreen';
import DiscoverScreen from '../screens/discover/DiscoverScreen';
import PeopleScreen from '../screens/people/PeopleScreen';
import InterestsScreen from '../screens/people/InterestsScreen';
import InboxScreen from '../screens/messages/InboxScreen';
import MyProfileScreen from '../screens/profile/MyProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const BADGE_REFRESH_MS = 45_000;

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
      <Text style={[styles.icon, !focused && styles.iconDim]}>{emoji}</Text>
    </View>
  );
}

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const { unreadMessages, pendingInterests, unseenLikes, refresh } = useBadgesStore();
  const feedEnabled = useFeatureFlagsStore((s) => s.feedEnabled);

  useEffect(() => {
    refresh().catch(() => {});
    const timer = setInterval(() => refresh().catch(() => {}), BADGE_REFRESH_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refresh().catch(() => {});
        useFeatureFlagsStore.getState().fetchFlags().catch(() => {});
      }
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [refresh]);

  const badge = (n: number) => (n > 0 ? (n > 99 ? '99+' : n) : undefined);

  return (
    <Tab.Navigator
      initialRouteName="DiscoverTab"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarBadgeStyle: { backgroundColor: Colors.primary, color: '#fff', fontSize: 10 },
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopColor: Colors.border,
          height: 58 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 4,
        },
      }}
    >
      {feedEnabled ? (
        <Tab.Screen
          name="FeedTab"
          component={FeedScreen}
          options={{ title: 'Feed', tabBarIcon: ({ focused }) => <TabIcon emoji="📰" focused={focused} /> }}
        />
      ) : null}
      <Tab.Screen
        name="DiscoverTab"
        component={DiscoverScreen}
        options={{ title: 'Discover', tabBarIcon: ({ focused }) => <TabIcon emoji="🧭" focused={focused} /> }}
      />
      <Tab.Screen
        name="PeopleTab"
        component={PeopleScreen}
        options={{
          title: 'People',
          tabBarBadge: badge(unseenLikes),
          tabBarIcon: ({ focused }) => <TabIcon emoji="👥" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="InterestsTab"
        component={InterestsScreen}
        options={{
          title: 'Interests',
          tabBarBadge: badge(pendingInterests),
          tabBarIcon: ({ focused }) => <TabIcon emoji="💌" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="InboxTab"
        component={InboxScreen}
        options={{
          title: 'Messages',
          tabBarBadge: badge(unreadMessages),
          tabBarIcon: ({ focused }) => <TabIcon emoji="💬" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={MyProfileScreen}
        options={{ title: 'Profile', tabBarIcon: ({ focused }) => <TabIcon emoji="🙂" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconWrap: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  iconWrapFocused: { backgroundColor: Colors.primarySoft },
  icon: { fontSize: 20 },
  iconDim: { opacity: 0.55 },
});
