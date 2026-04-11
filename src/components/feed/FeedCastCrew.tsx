import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  Dimensions,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { useMovieTopCredits } from '@/features/movies/hooks/useMovieTopCredits';
import { ActorAvatar } from '@/components/common/ActorAvatar';
import { createFeedCastCrewStyles } from '@/styles/tabs/feed.styles';
import type { CastMember } from '@shared/types';

interface Props {
  movieId: string;
}

// @coupling ActorAvatar, useMovieTopCredits, createFeedCastCrewStyles, react-native-reanimated
// @contract Modal with custom reanimated scale+fade for smooth open/close
// @contract Popup positioned relative to small circles; swipe carousel inside

const SWIPE_THRESHOLD = 40;
const CARD_W = 200;
const STEP = CARD_W;
const POPUP_H = 230;
const SCREEN_H = Dimensions.get('window').height;
const SPRING_CFG = { damping: 22, stiffness: 260, mass: 0.8 };
const ANIM_IN = { duration: 200, easing: Easing.out(Easing.cubic) };
const ANIM_OUT = { duration: 180, easing: Easing.in(Easing.cubic) };

function CreditCard({
  credit,
  onPress,
  styles,
}: {
  credit: CastMember;
  onPress: () => void;
  styles: ReturnType<typeof createFeedCastCrewStyles>;
}) {
  const name = credit.actor?.name ?? credit.role_name ?? 'Unknown';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityLabel={`Go to ${name}`}
      accessibilityRole="button"
      style={styles.carouselCard}
    >
      <View style={styles.avatarRing}>
        <ActorAvatar actor={credit.actor} size={140} />
      </View>
      <View style={styles.namePill}>
        <Text style={styles.popupName} numberOfLines={2}>
          {name}
        </Text>
        {credit.role_name && credit.actor?.name ? (
          <Text style={styles.popupRole} numberOfLines={1}>
            {credit.credit_type === 'crew' ? credit.role_name : `as ${credit.role_name}`}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export function FeedCastCrew({ movieId }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createFeedCastCrewStyles(theme), [theme]);
  const router = useRouter();
  const { data: credits } = useMovieTopCredits(movieId);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const allCredits = useMemo(() => credits ?? [], [credits]);
  const count = allCredits.length;
  const translateX = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);
  const overlayScale = useSharedValue(0.85);
  const circlesRef = useRef<View>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null);

  const animateIn = useCallback(() => {
    setVisible(true);
    overlayOpacity.value = withTiming(1, ANIM_IN);
    overlayScale.value = withTiming(1, ANIM_IN);
  }, [overlayOpacity, overlayScale]);

  const animateOut = useCallback(() => {
    overlayOpacity.value = withTiming(0, ANIM_OUT);
    overlayScale.value = withTiming(0.85, ANIM_OUT, () => {
      runOnJS(setVisible)(false);
      runOnJS(setSelectedIndex)(null);
      runOnJS(setPopupPos)(null);
    });
  }, [overlayOpacity, overlayScale]);

  const handleCircleTap = useCallback(
    (index: number) => {
      translateX.value = -index * STEP;
      setSelectedIndex(index);
      animateIn();
      try {
        circlesRef.current?.measureInWindow((x, y, _w, h) => {
          const bottom = y + h;
          const spaceBelow = SCREEN_H - bottom;
          if (spaceBelow >= POPUP_H + 12) {
            setPopupPos({ top: bottom + 8, left: x });
          } else {
            setPopupPos({ top: y - POPUP_H - 8, left: x });
          }
        });
      } catch {
        // fallback centering
      }
    },
    [translateX, animateIn],
  );

  const handleDismiss = useCallback(() => {
    animateOut();
  }, [animateOut]);

  const handleNavigate = useCallback(
    (actorId: string) => {
      animateOut();
      router.push(`/actor/${actorId}`);
    },
    [router, animateOut],
  );

  const snapTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, count - 1));
      translateX.value = withSpring(-clamped * STEP, SPRING_CFG);
      setSelectedIndex(clamped);
    },
    [count, translateX],
  );

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      const base = selectedIndex !== null ? -selectedIndex * STEP : 0;
      translateX.value = base + e.translationX;
    })
    .onEnd((e) => {
      const idx = selectedIndex ?? 0;
      if (e.translationX < -SWIPE_THRESHOLD && idx < count - 1) {
        runOnJS(snapTo)(idx + 1);
      } else if (e.translationX > SWIPE_THRESHOLD && idx > 0) {
        runOnJS(snapTo)(idx - 1);
      } else {
        runOnJS(snapTo)(idx);
      }
    });

  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    transform: [{ scale: overlayScale.value }],
  }));

  // @edge All hooks above — safe to early-return after this point
  if (count === 0) return null;

  const selectedCredit = selectedIndex !== null ? allCredits[selectedIndex] : null;
  const positionLabel = selectedIndex !== null ? `${selectedIndex + 1} / ${count}` : '';

  return (
    <View style={styles.container}>
      <View style={styles.circlesRow} ref={circlesRef} collapsable={false}>
        {allCredits.map((c, i) => (
          <TouchableOpacity
            key={c.id}
            onPress={() => handleCircleTap(i)}
            activeOpacity={0.7}
            accessibilityLabel={`Show ${c.actor?.name ?? 'actor'} details`}
            accessibilityRole="button"
          >
            <View style={styles.smallCircleBorder}>
              <ActorAvatar actor={c.actor} size={30} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <Modal
        visible={visible}
        animationType="none"
        transparent
        onRequestClose={handleDismiss}
        testID="cast-crew-popup"
      >
        <GestureHandlerRootView style={styles.popupGestureRoot}>
          <Animated.View style={[styles.popupBackdrop, backdropStyle]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={handleDismiss}
              accessibilityLabel="Dismiss"
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.popupOverlayContent,
              contentStyle,
              popupPos
                ? { position: 'absolute', top: popupPos.top, left: popupPos.left }
                : styles.carouselFallback,
            ]}
            pointerEvents="box-none"
          >
            <View style={styles.carouselWrapper}>
              <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.carouselStrip, stripStyle]}>
                  {allCredits.map((c) => (
                    <CreditCard
                      key={c.id}
                      credit={c}
                      onPress={() => handleNavigate(c.actor_id)}
                      styles={styles}
                    />
                  ))}
                </Animated.View>
              </GestureDetector>
              <View style={styles.hintPill}>
                <Text style={styles.popupPosition}>{positionLabel}</Text>
              </View>
            </View>
          </Animated.View>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
}
