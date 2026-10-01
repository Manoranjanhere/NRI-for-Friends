import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { Colors, FontSize, BorderRadius, Spacing } from '../../theme';
import { isOnlineNow } from '../../utils/presence';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_GAP = 12;
export const CARD_W = (SCREEN_W - Spacing.lg * 2 - CARD_GAP) / 2;
const CARD_H = CARD_W * 1.45;

export interface ProfileCardUser {
  id: string;
  name: string;
  age: number;
  city: string;
  primaryPhoto?: string | null;
  isSuperLike?: boolean;
  complimentMessage?: string | null;
  photoVerifiedStatus?: string;
  lastActiveAt?: string | null;
  sameHometown?: boolean;
  distance?: number | null;
}

interface Props {
  user: ProfileCardUser;
  onPress: () => void;
  /** Small caption under the city, e.g. "Viewed 2h ago" or an interest emoji. */
  caption?: string;
}

export default function ProfileCard({ user, onPress, caption }: Props) {
  const online = isOnlineNow(user.lastActiveAt);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {user.primaryPhoto ? (
        <FastImage
          source={{ uri: user.primaryPhoto, priority: FastImage.priority.normal }}
          style={styles.photo}
          resizeMode={FastImage.resizeMode.cover}
        />
      ) : (
        <View style={[styles.photo, styles.photoFallback]}>
          <Text style={styles.photoFallbackText}>
            {user.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
      )}

      {online && <View style={styles.onlineDot} />}

      <View style={styles.topBadges}>
        {user.isSuperLike ? (
          <View style={styles.badge}><Text style={styles.badgeText}>⭐</Text></View>
        ) : null}
        {user.sameHometown ? (
          <View style={[styles.badge, styles.hometownBadge]}><Text style={styles.hometownText}>🏡 Hometown</Text></View>
        ) : null}
      </View>

      <View style={styles.overlay}>
        <Text style={styles.nameText} numberOfLines={1}>
          {user.name}, {user.age}{user.photoVerifiedStatus === 'verified' ? ' ✅' : ''}
        </Text>
        <Text style={styles.cityText} numberOfLines={1}>
          📍 {user.city}{user.distance != null ? ` · ${user.distance} km` : ''}
        </Text>
        {caption ? (
          <Text style={styles.captionText} numberOfLines={1}>{caption}</Text>
        ) : user.complimentMessage ? (
          <Text style={styles.captionText} numberOfLines={1}>💝 {user.complimentMessage}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  photo: { width: '100%', height: '100%' },
  photoFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primarySoft },
  photoFallbackText: { fontSize: 42, fontWeight: '700', color: Colors.primary },
  onlineDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: '#fff',
  },
  topBadges: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', gap: 4 },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { fontSize: 12 },
  hometownBadge: { backgroundColor: Colors.primary },
  hometownText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  nameText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },
  cityText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 1 },
  captionText: { color: '#FFE0B2', fontSize: 10, marginTop: 4, lineHeight: 14 },
});
