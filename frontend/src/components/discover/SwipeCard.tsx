import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { NearbyUser } from '../../services/discover.service';
import { Colors, FontSize, Spacing } from '../../theme';
import { passionEmoji } from '../../constants/profileOptions';
import { isOnlineNow } from '../../utils/presence';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CARD_H = SCREEN_H * 0.64;
const SWIPE_THRESHOLD = SCREEN_W * 0.28;
const ROTATION_FACTOR = 12;

interface Props {
  user: NearbyUser;
  isTop: boolean;
  stackIndex: number; // 0 = top, 1 = second, 2 = third
  likesEnabled?: boolean;
  onSwipeRight: (user: NearbyUser) => void;
  onSwipeLeft: (user: NearbyUser) => void;
  onTap: (user: NearbyUser) => void;
  onLikeBlocked?: () => void;
}

export default function SwipeCard({
  user,
  isTop,
  stackIndex,
  likesEnabled = true,
  onSwipeRight,
  onSwipeLeft,
  onTap,
  onLikeBlocked,
}: Props) {
  const position = useRef(new Animated.ValueXY()).current;
  const [photoIndex, setPhotoIndex] = useState(0);

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_W, 0, SCREEN_W],
    outputRange: [`-${ROTATION_FACTOR}deg`, '0deg', `${ROTATION_FACTOR}deg`],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const cardOpacity = position.x.interpolate({
    inputRange: [-SCREEN_W, -SWIPE_THRESHOLD * 1.5, 0, SWIPE_THRESHOLD * 1.5, SCREEN_W],
    outputRange: [0, 1, 1, 1, 0],
    extrapolate: 'clamp',
  });

  const forceSwipe = useCallback((direction: 'right' | 'left') => {
    const x = direction === 'right' ? SCREEN_W * 1.5 : -SCREEN_W * 1.5;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: 280,
      useNativeDriver: false,
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      if (direction === 'right') onSwipeRight(user);
      else onSwipeLeft(user);
    });
  }, [user, onSwipeRight, onSwipeLeft]);

  const panResponder = useRef(
    PanResponder.create({
      // Let taps pass through, activate responder only when user actually drags.
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy * 0.3 });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          if (likesEnabled) {
            forceSwipe('right');
          } else {
            Animated.spring(position, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: false,
              friction: 6,
            }).start();
            onLikeBlocked?.();
          }
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          forceSwipe('left');
        } else {
          // Snap back
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            friction: 6,
          }).start();
        }
      },
    }),
  ).current;

  const photos = user.photos?.length > 0 ? user.photos : [];
  const currentPhoto = photos[photoIndex]?.url || user.primaryPhoto || undefined;

  // Stack positioning for non-top cards
  const stackScale = 1 - stackIndex * 0.04;
  const stackTranslateY = stackIndex * 10;

  if (!isTop) {
    return (
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ scale: stackScale }, { translateY: stackTranslateY }],
            zIndex: 10 - stackIndex,
          },
        ]}
      >
        {currentPhoto ? (
          <FastImage
            source={{ uri: currentPhoto }}
            style={styles.photo}
            resizeMode={FastImage.resizeMode.cover}
          />
        ) : (
          <View style={[styles.photo, styles.photoFallback]}>
            <Text style={styles.photoFallbackText}>{user.name?.charAt(0)}</Text>
          </View>
        )}
        <View style={styles.photoGradient} />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.card,
        styles.topCard,
        {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
            { rotate },
          ],
          opacity: cardOpacity,
          zIndex: 20,
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Photo */}
      <TouchableOpacity
        activeOpacity={1}
        style={StyleSheet.absoluteFill}
        onPress={() => onTap(user)}
      >
        {currentPhoto ? (
          <FastImage
            source={{ uri: currentPhoto, priority: FastImage.priority.high }}
            style={styles.photo}
            resizeMode={FastImage.resizeMode.cover}
          />
        ) : (
          <View style={[styles.photo, styles.photoFallback]}>
            <Text style={styles.photoFallbackText}>{user.name?.charAt(0)}</Text>
          </View>
        )}

        {/* Photo progress bar */}
        {photos.length > 1 && (
          <View style={styles.photoBars}>
            {photos.map((_, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.photoBar, i === photoIndex && styles.photoBarActive]}
                onPress={() => setPhotoIndex(i)}
              />
            ))}
          </View>
        )}

        {/* Gradient overlay */}
        <View style={styles.photoGradient} />

        {/* User info */}
        <View style={styles.infoOverlay}>
          {user.sameHometown && (
            <View style={styles.hometownBadge}>
              <Text style={styles.hometownBadgeText}>🏡 From your hometown</Text>
            </View>
          )}
          <View style={styles.nameRow}>
            {isOnlineNow(user.lastActiveAt) && <View style={styles.onlineDot} />}
            <Text style={styles.nameText}>{user.name}</Text>
            <Text style={styles.ageText}>{user.age}</Text>
            {user.photoVerifiedStatus === 'verified' && <Text style={styles.verified}>✅</Text>}
          </View>

          {user.jobProfile ? (
            <Text style={styles.jobText} numberOfLines={1}>💼 {user.jobProfile}</Text>
          ) : null}
          <View style={styles.metaRow}>
            <Text style={styles.distanceText} numberOfLines={1}>
              📍 {user.city}{user.distance != null ? ` · ${user.distance} km` : ''}
            </Text>
            {user.grewUpCity ? (
              <Text style={styles.cityText} numberOfLines={1}>🌱 Grew up in {user.grewUpCity}</Text>
            ) : null}
          </View>

          {user.passions?.length ? (
            <View style={styles.passionRow}>
              {user.passions.slice(0, 3).map((p) => (
                <View key={p} style={styles.passionChip}>
                  <Text style={styles.passionText}>{passionEmoji(p)} {p}</Text>
                </View>
              ))}
            </View>
          ) : user.bio ? (
            <Text style={styles.bioText} numberOfLines={2}>{user.bio}</Text>
          ) : null}
        </View>
      </TouchableOpacity>

      {/* LIKE overlay */}
      <Animated.View style={[styles.overlayBadge, styles.likeBadge, { opacity: likeOpacity }]}>
        <Text style={styles.likeBadgeText}>CONNECT</Text>
      </Animated.View>

      {/* NOPE overlay */}
      <Animated.View style={[styles.overlayBadge, styles.nopeBadge, { opacity: nopeOpacity }]}>
        <Text style={styles.nopeBadgeText}>SKIP</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: SCREEN_W - 24,
    height: CARD_H,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    alignSelf: 'center',
  },
  topCard: {},
  photo: { width: '100%', height: '100%' },
  photoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
  },
  photoFallbackText: { fontSize: 80, color: Colors.primary, fontWeight: '700' },
  photoBars: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    gap: 4,
  },
  photoBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  photoBarActive: { backgroundColor: '#fff' },
  photoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: 'transparent',
    // Simulated gradient with semi-transparent overlay
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  nameText: { fontSize: 30, fontWeight: '800', color: '#fff' },
  ageText: { fontSize: 22, fontWeight: '400', color: 'rgba(255,255,255,0.85)', marginBottom: 3 },
  verified: { fontSize: 18, marginBottom: 5 },
  onlineDot: {
    width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.success,
    borderWidth: 2, borderColor: '#fff', marginBottom: 12,
  },
  hometownBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  hometownBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  jobText: { fontSize: FontSize.sm, color: '#fff', fontWeight: '600', marginBottom: 4 },
  passionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  passionChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  passionText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 10, marginBottom: 6 },
  distanceText: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)' },
  cityText: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.65)' },
  bioText: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 18,
  },
  overlayBadge: {
    position: 'absolute',
    top: 52,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 4,
    borderRadius: 8,
  },
  likeBadge: {
    left: 24,
    borderColor: Colors.primary,
    transform: [{ rotate: '-15deg' }],
  },
  likeBadgeText: { fontSize: 28, fontWeight: '900', color: Colors.primary },
  nopeBadge: {
    right: 24,
    borderColor: Colors.error,
    transform: [{ rotate: '15deg' }],
  },
  nopeBadgeText: { fontSize: 28, fontWeight: '900', color: Colors.error },
});
