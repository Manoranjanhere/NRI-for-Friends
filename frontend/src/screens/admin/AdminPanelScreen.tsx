import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AdminPanelProps } from '../../navigation/types';
import { Colors, FontSize, Spacing, BorderRadius } from '../../theme';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { useFeatureFlagsStore } from '../../store/featureFlags.store';
import FeedService from '../../services/feed.service';
import OptionPicker from '../../components/common/OptionPicker';
import { MOTHER_TONGUES } from '../../constants/profileOptions';

type Props = AdminPanelProps;

type Tab = 'dashboard' | 'reports' | 'users' | 'bans' | 'notifications';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  pendingReports: number;
  bannedUsers: number;
  verifiedUsers: number;
  bannedIdentities: number;
  trialUsers: number;
  payingMembers: number;
  expiredMembers: number;
  newUsersThisWeek: number;
  activeToday: number;
  interestsSent: number;
  interestsAccepted: number;
  interestsToday: number;
}

const STAT_SECTIONS = (s: Stats) => [
  {
    title: 'Members',
    items: [
      { label: 'Total users', value: s.totalUsers, emoji: '👥' },
      { label: 'Active today', value: s.activeToday, emoji: '🟢' },
      { label: 'New this week', value: s.newUsersThisWeek, emoji: '✨' },
      { label: 'Photo verified', value: s.verifiedUsers, emoji: '✅' },
    ],
  },
  {
    title: 'Membership',
    items: [
      { label: 'On free trial', value: s.trialUsers, emoji: '🎁' },
      { label: 'Paying (₹300)', value: s.payingMembers, emoji: '🧡' },
      { label: 'Expired / none', value: s.expiredMembers, emoji: '⏳' },
      { label: 'Est. monthly ₹', value: (s.payingMembers ?? 0) * 300, emoji: '💰' },
    ],
  },
  {
    title: 'Interests',
    items: [
      { label: 'Sent (all time)', value: s.interestsSent, emoji: '💌' },
      { label: 'Accepted', value: s.interestsAccepted, emoji: '🤝' },
      { label: 'Sent today', value: s.interestsToday, emoji: '📅' },
      {
        label: 'Acceptance rate',
        value: s.interestsSent ? `${Math.round((s.interestsAccepted / s.interestsSent) * 100)}%` : '—',
        emoji: '📈',
      },
    ],
  },
  {
    title: 'Safety',
    items: [
      { label: 'Pending reports', value: s.pendingReports, emoji: '🚩', alert: s.pendingReports > 0 },
      { label: 'Banned users', value: s.bannedUsers, emoji: '🚫' },
      { label: 'Identity blocks', value: s.bannedIdentities, emoji: '⛔' },
      { label: 'Active accounts', value: s.activeUsers, emoji: '👤' },
    ],
  },
];

export default function AdminPanelScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const authUser = useAuthStore((s) => s.user);
  const isSuperAdmin = !!authUser?.isSuperAdmin;

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [identities, setIdentities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifCity, setNotifCity] = useState('');
  const [notifCountry, setNotifCountry] = useState('');
  const [notifGender, setNotifGender] = useState('');
  const [notifGrewUp, setNotifGrewUp] = useState('');
  const [notifTongue, setNotifTongue] = useState('');
  const [notifMinAge, setNotifMinAge] = useState('');
  const [notifMaxAge, setNotifMaxAge] = useState('');
  const [notifSending, setNotifSending] = useState(false);

  const feedEnabled = useFeatureFlagsStore((s) => s.feedEnabled);
  const [feedSaving, setFeedSaving] = useState(false);

  const toggleFeed = async (enabled: boolean) => {
    setFeedSaving(true);
    try {
      const saved = await FeedService.setEnabled(enabled);
      useFeatureFlagsStore.getState().setFeedEnabled(saved);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Could not update the feed setting');
    } finally {
      setFeedSaving(false);
    }
  };

  const [banType, setBanType] = useState<'ip' | 'phone' | 'email'>('phone');
  const [banValue, setBanValue] = useState('');
  const [banReason, setBanReason] = useState('');

  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab]);

  const loadTab = async (tab: Tab) => {
    setLoading(true);
    try {
      if (tab === 'dashboard') {
        const { data } = await api.get('/admin/dashboard');
        setStats(data);
      } else if (tab === 'reports') {
        const { data } = await api.get('/admin/reports?status=pending&limit=30');
        setReports(data.reports || []);
      } else if (tab === 'users') {
        const { data } = await api.get(
          `/admin/users?limit=50${search ? `&search=${encodeURIComponent(search)}` : ''}`,
        );
        setUsers(data.users || []);
      } else if (tab === 'bans') {
        const { data } = await api.get('/admin/bans?limit=100');
        setBannedUsers(data.bannedUsers || []);
        setIdentities(data.identities || data.bans || []);
      }
    } catch (err: any) {
      Alert.alert('Load failed', err?.response?.data?.message || 'Could not load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleReportAction = async (reportId: string, action: string) => {
    setActionLoading(reportId + action);
    try {
      await api.patch(`/admin/reports/${reportId}/action`, { action });
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      if (action === 'ban_user') await loadTab('dashboard');
      Alert.alert('Done', `Action "${action}" applied`);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUserAction = async (userId: string, action: string, userName: string) => {
    Alert.alert(`${action} ${userName || 'user'}?`, `Apply action: ${action}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        style: action === 'ban' || action === 'delete' ? 'destructive' : 'default',
        onPress: async () => {
          setActionLoading(userId + action);
          try {
            await api.patch(`/admin/users/${userId}/action`, { action });
            if (activeTab === 'users') await loadTab('users');
            if (activeTab === 'bans' || action === 'ban' || action === 'unban') {
              const { data } = await api.get('/admin/bans?limit=100');
              setBannedUsers(data.bannedUsers || []);
              setIdentities(data.identities || data.bans || []);
            }
            const { data: dash } = await api.get('/admin/dashboard');
            setStats(dash);
            Alert.alert('Done', `${action} applied to ${userName || 'user'}`);
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed');
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const handleSendResetLink = async (userId: string, userName: string) => {
    try {
      await api.post(`/admin/users/${userId}/reset-password`);
      Alert.alert('Link Sent', `Password reset link sent to ${userName}'s email`);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'No email on file');
    }
  };

  const handleAddBan = async () => {
    if (!banValue.trim()) return;
    setActionLoading('add_ban');
    try {
      await api.post('/admin/bans', {
        type: banType,
        value: banValue.trim(),
        reason: banReason.trim() || undefined,
      });
      setBanValue('');
      setBanReason('');
      await loadTab('bans');
      Alert.alert('Banned', `${banType} "${banValue}" has been banned`);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveBan = async (banId: string) => {
    try {
      await api.delete(`/admin/bans/${banId}`);
      await loadTab('bans');
      const { data: dash } = await api.get('/admin/dashboard');
      setStats(dash);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to lift ban');
    }
  };

  const sendMarketingNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) {
      Alert.alert('Required', 'Title and body are required');
      return;
    }
    setNotifSending(true);
    try {
      const payload: any = { title: notifTitle, body: notifBody };
      if (notifCity) payload.city = notifCity;
      if (notifCountry) payload.country = notifCountry;
      if (notifGender) payload.gender = notifGender;
      if (notifGrewUp) payload.grewUpCity = notifGrewUp;
      if (notifTongue) payload.motherTongue = notifTongue;
      if (notifMinAge) payload.minAge = Number(notifMinAge);
      if (notifMaxAge) payload.maxAge = Number(notifMaxAge);
      const { data } = await api.post('/admin/notifications/push', payload);
      Alert.alert(
        data.sent > 0 ? 'Sent!' : 'No devices',
        data.message || `Notification sent to ${data.sent} devices`,
      );
      setNotifTitle('');
      setNotifBody('');
      setNotifCity('');
      setNotifCountry('');
      setNotifGender('');
      setNotifGrewUp('');
      setNotifTongue('');
      setNotifMinAge('');
      setNotifMaxAge('');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to send');
    } finally {
      setNotifSending(false);
    }
  };

  const openUserProfile = (userId?: string) => {
    if (!userId) return;
    navigation.navigate('ProfileDetail', { userId });
  };

  const identityLabel = (ban: any) => {
    if (ban.isUserMarker || (ban.type === 'device_id' && String(ban.value).startsWith('user:'))) {
      return 'USER';
    }
    return String(ban.type || '').toUpperCase();
  };

  const TABS: { key: Tab; label: string; emoji: string }[] = [
    { key: 'dashboard', label: 'Stats', emoji: '📊' },
    { key: 'reports', label: 'Reports', emoji: '🚩' },
    { key: 'users', label: 'Users', emoji: '👥' },
    { key: 'bans', label: 'Bans', emoji: '🚫' },
    { key: 'notifications', label: 'Push', emoji: '📣' },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin Control Center</Text>
          <View style={styles.adminModeBadge}>
            <Text style={styles.adminModeBadgeText}>
              {isSuperAdmin ? 'SUPER ADMIN' : 'ADMIN MODE'}
            </Text>
          </View>
        </View>

        <View style={styles.adminNotice}>
          <Text style={styles.adminNoticeTitle}>Restricted Controls</Text>
          <Text style={styles.adminNoticeText}>
            Ban a user under Users or Bans — they appear in Banned Users. Phone/email/IP blocks are listed separately.
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabBar}
          contentContainerStyle={styles.tabBarContent}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={styles.tabEmoji}>{tab.emoji}</Text>
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {activeTab === 'dashboard' && (
              <View style={styles.settingCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>📰 Feed tab</Text>
                  <Text style={styles.settingHint}>
                    Show the Feed (how-to-use guide) tab to all users. Apps pick it up on next open.
                  </Text>
                </View>
                {feedSaving ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : (
                  <Switch
                    value={feedEnabled}
                    onValueChange={toggleFeed}
                    trackColor={{ true: Colors.primary, false: Colors.border }}
                    thumbColor="#fff"
                  />
                )}
              </View>
            )}

            {activeTab === 'dashboard' && stats &&
              STAT_SECTIONS(stats).map((section) => (
                <View key={section.title}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <View style={styles.statsGrid}>
                    {section.items.map((stat) => {
                      const alert = 'alert' in stat && stat.alert;
                      return (
                        <View key={stat.label} style={[styles.statCard, alert && styles.statCardAlert]}>
                          <Text style={styles.statEmoji}>{stat.emoji}</Text>
                          <Text style={[styles.statValue, alert && styles.statValueAlert]}>
                            {stat.value ?? 0}
                          </Text>
                          <Text style={styles.statLabel}>{stat.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}

            {activeTab === 'reports' &&
              (reports.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>No pending reports 🎉</Text>
                </View>
              ) : (
                reports.map((r) => (
                  <View key={r.id} style={styles.reportCard}>
                    <Text style={styles.reportReason}>
                      Reason:{' '}
                      <Text style={styles.reportReasonValue}>{r.reason}</Text>
                    </Text>
                    <Text style={styles.reportMeta}>
                      Reporter: {r.reporter?.name} → Reported: {r.reportedUser?.name}
                    </Text>
                    {!!r.description && (
                      <Text style={styles.reportDescription}>{r.description}</Text>
                    )}
                    {r.reportedPhotoId && (
                      <Text style={styles.reportPhotoNote}>📸 Specific photo reported</Text>
                    )}
                    <View style={styles.reportProfileActions}>
                      <TouchableOpacity
                        style={styles.reportProfileBtn}
                        onPress={() => openUserProfile(r.reporter?.id)}
                      >
                        <Text style={styles.reportProfileBtnText}>View Reporter</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.reportProfileBtn, styles.reportProfileBtnPrimary]}
                        onPress={() => openUserProfile(r.reportedUser?.id)}
                      >
                        <Text style={styles.reportProfileBtnText}>View Reported Profile</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.reportActions}>
                      {['dismiss', 'warn_user', 'remove_photo', 'ban_user'].map((action) => (
                        <TouchableOpacity
                          key={action}
                          style={[
                            styles.actionChip,
                            action === 'ban_user' && styles.actionChipDanger,
                          ]}
                          onPress={() => handleReportAction(r.id, action)}
                          disabled={!!actionLoading}
                        >
                          {actionLoading === r.id + action ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <Text style={styles.actionChipText}>
                              {action.replace('_', ' ')}
                            </Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))
              ))}

            {activeTab === 'users' && (
              <>
                <View style={styles.searchRow}>
                  <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search by name, email, phone, id..."
                    placeholderTextColor={Colors.textMuted}
                    onSubmitEditing={() => loadTab('users')}
                  />
                  <TouchableOpacity style={styles.searchBtn} onPress={() => loadTab('users')}>
                    <Text style={styles.searchBtnText}>Search</Text>
                  </TouchableOpacity>
                </View>
                {users.length === 0 ? (
                  <View style={styles.empty}>
                    <Text style={styles.emptyText}>No users found</Text>
                  </View>
                ) : (
                  users.map((u) => (
                    <View key={u.id} style={styles.userCard}>
                      <TouchableOpacity
                        style={styles.userCardLeft}
                        onPress={() => openUserProfile(u.id)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.userName}>
                          {u.name || 'No name'} {u.isBanned ? '🚫' : ''}{' '}
                          {u.isAdmin ? '👑' : ''}
                        </Text>
                        <Text style={styles.userMeta}>{u.email || u.phone || '—'}</Text>
                        <Text style={styles.userMeta}>
                          {u.city || '—'}, {u.country || '—'}
                          {u.grewUpCity ? ` • from ${u.grewUpCity}` : ''}
                          {u.subscriptionPlan ? ` • ${u.subscriptionPlan === 'trial' ? '🎁 trial' : '🧡 premium'}` : ''}
                        </Text>
                        <Text style={styles.userId} numberOfLines={1}>
                          ID: {u.id}
                        </Text>
                      </TouchableOpacity>
                      <View style={styles.userActions}>
                        <TouchableOpacity
                          style={styles.userActionBtn}
                          onPress={() => handleSendResetLink(u.id, u.name)}
                        >
                          <Text style={styles.userActionBtnText}>🔑</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.userActionBtn, u.isBanned && styles.userActionBtnActive]}
                          onPress={() =>
                            handleUserAction(u.id, u.isBanned ? 'unban' : 'ban', u.name)
                          }
                        >
                          <Text style={styles.userActionBtnText}>
                            {u.isBanned ? '🔓' : '🚫'}
                          </Text>
                        </TouchableOpacity>
                        {isSuperAdmin && !u.isSuperAdmin && (
                          <TouchableOpacity
                            style={styles.userActionBtn}
                            onPress={() =>
                              handleUserAction(
                                u.id,
                                u.isAdmin ? 'remove_admin' : 'make_admin',
                                u.name,
                              )
                            }
                          >
                            <Text style={styles.userActionBtnText}>
                              {u.isAdmin ? '⬇️' : '⬆️'}
                            </Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[styles.userActionBtn, styles.userActionBtnDanger]}
                          onPress={() => handleUserAction(u.id, 'delete', u.name)}
                        >
                          <Text style={styles.userActionBtnText}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </>
            )}

            {activeTab === 'bans' && (
              <>
                <View style={styles.banAddSection}>
                  <Text style={styles.sectionTitle}>Block Phone / Email / IP</Text>
                  <View style={styles.banTypeRow}>
                    {(['phone', 'email', 'ip'] as const).map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.banTypeChip, banType === t && styles.banTypeChipActive]}
                        onPress={() => setBanType(t)}
                      >
                        <Text
                          style={[
                            styles.banTypeText,
                            banType === t && styles.banTypeTextActive,
                          ]}
                        >
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={styles.banInput}
                    value={banValue}
                    onChangeText={setBanValue}
                    placeholder={`Enter ${banType}...`}
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="none"
                  />
                  <TextInput
                    style={styles.banInput}
                    value={banReason}
                    onChangeText={setBanReason}
                    placeholder="Reason (optional)"
                    placeholderTextColor={Colors.textMuted}
                  />
                  <TouchableOpacity
                    style={styles.banAddBtn}
                    onPress={handleAddBan}
                    disabled={actionLoading === 'add_ban'}
                  >
                    {actionLoading === 'add_ban' ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.banAddBtnText}>+ Add Block</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>
                  Banned Users ({bannedUsers.length})
                </Text>
                <Text style={styles.banHint}>
                  Everyone with an account ban. Tap Unban to restore access.
                </Text>
                {bannedUsers.length === 0 ? (
                  <View style={styles.emptySmall}>
                    <Text style={styles.emptyText}>No banned users</Text>
                  </View>
                ) : (
                  bannedUsers.map((u) => (
                    <View key={u.id} style={styles.banRow}>
                      <TouchableOpacity
                        style={styles.banInfo}
                        onPress={() => openUserProfile(u.id)}
                      >
                        <Text style={styles.banType}>ACCOUNT</Text>
                        <Text style={styles.banValue}>{u.name || 'No name'}</Text>
                        <Text style={styles.banReason}>
                          {u.email || u.phone || u.id}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleUserAction(u.id, 'unban', u.name)}
                      >
                        <Text style={styles.banLiftText}>Unban</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}

                <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>
                  Identity Blocks ({identities.length})
                </Text>
                <Text style={styles.banHint}>
                  Phone, email, IP, and account markers. Lift removes that block.
                </Text>
                {identities.length === 0 ? (
                  <View style={styles.emptySmall}>
                    <Text style={styles.emptyText}>No identity blocks</Text>
                  </View>
                ) : (
                  identities.map((ban) => (
                    <View key={ban.id} style={styles.banRow}>
                      <View style={styles.banInfo}>
                        <Text style={styles.banType}>{identityLabel(ban)}</Text>
                        <Text style={styles.banValue}>
                          {ban.displayValue || ban.value}
                        </Text>
                        {!!ban.reason && (
                          <Text style={styles.banReason}>{ban.reason}</Text>
                        )}
                      </View>
                      <TouchableOpacity onPress={() => handleRemoveBan(ban.id)}>
                        <Text style={styles.banLiftText}>Lift</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </>
            )}

            {activeTab === 'notifications' && (
              <View style={styles.notifSection}>
                <Text style={styles.sectionTitle}>📣 Send Marketing Push</Text>
                <Text style={styles.sectionSubtitle}>
                  Leave filters blank to target everyone with a registered device.
                </Text>

                {[
                  {
                    label: 'Title *',
                    value: notifTitle,
                    onChange: setNotifTitle,
                    placeholder: '10 new members near you! 🔥',
                  },
                  {
                    label: 'Message *',
                    value: notifBody,
                    onChange: setNotifBody,
                    placeholder: "Check who's nearby and start chatting!",
                  },
                  {
                    label: 'City',
                    value: notifCity,
                    onChange: setNotifCity,
                    placeholder: 'e.g. Mumbai (or leave blank)',
                  },
                  {
                    label: 'Country',
                    value: notifCountry,
                    onChange: setNotifCountry,
                    placeholder: 'e.g. United Kingdom (or leave blank)',
                  },
                  {
                    label: 'Grew up in',
                    value: notifGrewUp,
                    onChange: setNotifGrewUp,
                    placeholder: 'e.g. Kolkata — reach people from one hometown',
                  },
                ].map((field) => (
                  <View key={field.label} style={styles.notifField}>
                    <Text style={styles.notifLabel}>{field.label}</Text>
                    <TextInput
                      style={styles.notifInput}
                      value={field.value}
                      onChangeText={field.onChange}
                      placeholder={field.placeholder}
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                ))}

                <View style={styles.notifField}>
                  <Text style={styles.notifLabel}>Mother tongue</Text>
                  <OptionPicker
                    title="Mother tongue"
                    options={MOTHER_TONGUES}
                    value={notifTongue || null}
                    onChange={(v) => setNotifTongue(v ?? '')}
                    placeholder="Any language"
                    clearable
                  />
                </View>

                <View style={styles.notifField}>
                  <Text style={styles.notifLabel}>Age range</Text>
                  <View style={styles.filterChipRow}>
                    <TextInput
                      style={[styles.notifInput, { flex: 1 }]}
                      value={notifMinAge}
                      onChangeText={(t) => setNotifMinAge(t.replace(/\D/g, ''))}
                      placeholder="Min (18)"
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholderTextColor={Colors.textMuted}
                    />
                    <TextInput
                      style={[styles.notifInput, { flex: 1 }]}
                      value={notifMaxAge}
                      onChangeText={(t) => setNotifMaxAge(t.replace(/\D/g, ''))}
                      placeholder="Max (80)"
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                </View>

                <View style={styles.notifField}>
                  <Text style={styles.notifLabel}>Gender Filter</Text>
                  <View style={styles.filterChipRow}>
                    {[
                      { label: 'All', value: '' },
                      { label: '👨 Men', value: 'male' },
                      { label: '👩 Women', value: 'female' },
                    ].map((g) => (
                      <TouchableOpacity
                        key={g.label}
                        style={[
                          styles.filterChip,
                          notifGender === g.value && styles.filterChipActive,
                        ]}
                        onPress={() => setNotifGender(g.value)}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            notifGender === g.value && styles.filterChipTextActive,
                          ]}
                        >
                          {g.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.sendNotifBtn, notifSending && styles.sendNotifBtnDisabled]}
                  onPress={sendMarketingNotification}
                  disabled={notifSending}
                >
                  {notifSending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.sendNotifBtnText}>Send Notification →</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: insets.bottom + 40 }} />
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primarySoft,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { fontSize: 28, color: Colors.secondary },
  headerTitle: { flex: 1, fontSize: FontSize.xl, fontWeight: '900', color: Colors.secondary },
  adminModeBadge: {
    backgroundColor: 'rgba(255,183,3,0.16)',
    borderWidth: 1,
    borderColor: Colors.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  adminModeBadgeText: {
    color: Colors.secondary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  adminNotice: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.secondarySoft,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#8A5B00',
    padding: Spacing.md,
  },
  adminNoticeTitle: {
    color: Colors.secondary,
    fontSize: FontSize.sm,
    fontWeight: '800',
    marginBottom: 2,
  },
  adminNoticeText: { color: '#8A5B00', fontSize: FontSize.xs, lineHeight: 18 },
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    maxHeight: 52,
    backgroundColor: Colors.surface,
  },
  tabBarContent: { paddingHorizontal: Spacing.sm, gap: 4 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  tabActive: {
    backgroundColor: Colors.secondarySoft,
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  tabEmoji: { fontSize: 14 },
  tabLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' },
  tabLabelActive: { color: Colors.secondary },
  content: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statCardAlert: { borderColor: Colors.error },
  statEmoji: { fontSize: 24 },
  statValue: { fontSize: 28, fontWeight: '900', color: Colors.textPrimary },
  statValueAlert: { color: Colors.error },
  statLabel: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center' },
  reportCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reportReason: { color: Colors.textSecondary, fontSize: FontSize.sm },
  reportReasonValue: { color: Colors.primary, fontWeight: '700' },
  reportMeta: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 4 },
  reportDescription: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    marginTop: 6,
    lineHeight: 18,
  },
  reportPhotoNote: { color: Colors.secondary, fontSize: FontSize.xs, marginTop: 4 },
  reportProfileActions: { flexDirection: 'row', gap: 8, marginTop: Spacing.sm },
  reportProfileBtn: {
    flex: 1,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    paddingVertical: 8,
    alignItems: 'center',
  },
  reportProfileBtnPrimary: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondarySoft,
  },
  reportProfileBtnText: {
    color: Colors.textPrimary,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  reportActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.sm },
  actionChip: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionChipDanger: { borderColor: Colors.error },
  actionChipText: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: '600' },
  searchRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: FontSize.sm,
  },
  searchBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
  userCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userCardLeft: { flex: 1 },
  userName: { color: Colors.textPrimary, fontWeight: '700', fontSize: FontSize.md },
  userMeta: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  userId: { color: Colors.textMuted, fontSize: 9, marginTop: 4, fontFamily: 'monospace' },
  userActions: { gap: 4 },
  userActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userActionBtnActive: { borderColor: Colors.primary },
  userActionBtnDanger: { borderColor: Colors.error },
  userActionBtnText: { fontSize: 14 },
  banAddSection: { marginBottom: Spacing.xl },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primarySoft,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  settingTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textPrimary },
  settingHint: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.secondary,
    marginBottom: Spacing.sm,
  },
  banHint: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  sectionSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  banTypeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  banTypeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  banTypeChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  banTypeText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  banTypeTextActive: { color: Colors.primary, fontWeight: '700' },
  banInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    fontSize: FontSize.sm,
  },
  banAddBtn: {
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.full,
    paddingVertical: 12,
    alignItems: 'center',
  },
  banAddBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
  banRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  banInfo: { flex: 1 },
  banType: {
    color: Colors.primary,
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 1,
  },
  banValue: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '600' },
  banReason: { color: Colors.textMuted, fontSize: FontSize.xs },
  banLiftText: { color: '#4CAF50', fontWeight: '700', fontSize: FontSize.sm },
  notifSection: { gap: Spacing.md },
  notifField: { gap: Spacing.xs },
  notifLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  notifInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: FontSize.sm,
  },
  filterChipRow: { flexDirection: 'row', gap: Spacing.sm },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  filterChipText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  filterChipTextActive: { color: Colors.primary, fontWeight: '700' },
  sendNotifBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  sendNotifBtnDisabled: { opacity: 0.5 },
  sendNotifBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptySmall: { alignItems: 'center', paddingVertical: Spacing.lg },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.md },
});
