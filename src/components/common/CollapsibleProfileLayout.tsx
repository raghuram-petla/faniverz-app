import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import type {
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
  RefreshControlProps,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useSnapScroll } from '@/hooks/useSnapScroll';
import { HomeButton } from './HomeButton';
import {
  createStyles,
  NAV_BAR_HEIGHT,
  IMAGE_EXPANDED,
  IMAGE_COLLAPSED,
  COLLAPSE_SCROLL_DISTANCE,
} from '@/styles/collapsibleProfile.styles';

/**
 * @contract Scroll-driven collapsible hero: avatar + name float and shrink into the nav bar as user scrolls.
 * @coupling collapsibleProfile.styles — imports layout constants (NAV_BAR_HEIGHT, IMAGE_EXPANDED, etc.).
 * @sync scrollOffset is a SharedValue updated from onScroll for 60fps worklet-driven interpolation.
 */
export interface CollapsibleProfileLayoutProps {
  /** Name shown in hero and collapsed bar */
  name: string;
  /** Renders the profile image at the given pixel size */
  renderImage: (size: number) => React.ReactNode;
  /** Back button handler */
  onBack: () => void;
  /** Wraps the hero image in a pressable (e.g., open photo modal) */
  onImagePress?: () => void;
  /** Right side of nav bar (e.g., FollowButton) */
  rightContent?: React.ReactNode;
  /** Content below name in hero (e.g., badges) */
  heroContent?: React.ReactNode;
  /** Main scrollable content */
  children?: React.ReactNode;
  /** Forwarded scroll handler (for pull-to-refresh) */
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Forwarded scroll-begin handler (for pull-to-refresh) */
  onScrollBeginDrag?: () => void;
  /** Forwarded scroll-end handler (for pull-to-refresh) */
  onScrollEndDrag?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Content at the very top of the scroll area (e.g., PullToRefreshIndicator) */
  scrollHeader?: React.ReactNode;
  /** Native RefreshControl for Android pull-to-refresh (from usePullToRefresh) */
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

export function CollapsibleProfileLayout({
  name,
  renderImage,
  onBack,
  onImagePress,
  rightContent,
  heroContent,
  children,
  onScroll,
  onScrollBeginDrag,
  onScrollEndDrag,
  scrollHeader,
  refreshControl,
}: CollapsibleProfileLayoutProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme);
  const { width: screenWidth } = useWindowDimensions();
  const scrollOffset = useSharedValue(0);
  const {
    scrollRef,
    contentMinHeight,
    handleLayout: onScrollViewLayout,
    handleScroll: onSnapScroll,
    handleScrollEndDrag: onSnapScrollEndDrag,
    handleMomentumEnd: onSnapMomentumEnd,
  } = useSnapScroll({ scrollOffset, snapThreshold: COLLAPSE_SCROLL_DISTANCE });
  // @edge nameWidth/nameHeight initialize to estimated values; corrected on first onLayout
  const nameWidth = useSharedValue(200);
  const nameHeight = useSharedValue(30);

  const onNameLayout = useCallback(
    (e: LayoutChangeEvent) => {
      nameWidth.value = e.nativeEvent.layout.width;
      nameHeight.value = e.nativeEvent.layout.height;
    },
    [nameWidth, nameHeight],
  );

  // @assumes insets.top is stable after initial render; orientation change would break layout math
  // @coupling scrollViewTop must equal the actual paddingTop of the ScrollView for animations to align
  // @invariant scrollViewTop must match actual ScrollView paddingTop for animation alignment
  const scrollViewTop = insets.top + NAV_BAR_HEIGHT;
  const heroAvatarCY = scrollViewTop + 16 + IMAGE_EXPANDED / 2;
  const collapsedCY = insets.top + NAV_BAR_HEIGHT / 2;
  // @invariant NAME_SCALE = collapsed font size / hero font size (14px / 24px)
  const NAME_SCALE = 14 / 24;
  const COLLAPSED_GAP = 10;

  // @boundary p interpolates [0,1] over COLLAPSE_SCROLL_DISTANCE; clamped so over-scroll has no effect
  const animatedAvatarStyle = useAnimatedStyle(() => {
    const s = scrollOffset.value;
    const p = interpolate(s, [0, COLLAPSE_SCROLL_DISTANCE], [0, 1], Extrapolation.CLAMP);

    // Group width = avatar + gap + visual name width, centered on screen
    const nameVisualW = nameWidth.value * NAME_SCALE;
    const groupW = IMAGE_COLLAPSED + COLLAPSED_GAP + nameVisualW;
    const groupLeft = (screenWidth - groupW) / 2;
    const collapsedAvatarCX = groupLeft + IMAGE_COLLAPSED / 2;

    const cy = (heroAvatarCY - s) * (1 - p) + collapsedCY * p;
    const cx = (screenWidth / 2) * (1 - p) + collapsedAvatarCX * p;
    const scale = interpolate(p, [0, 1], [1, IMAGE_COLLAPSED / IMAGE_EXPANDED]);

    return {
      transform: [
        { translateX: cx - IMAGE_EXPANDED / 2 },
        { translateY: cy - IMAGE_EXPANDED / 2 },
        { scale },
      ],
    };
  });

  // --- Floating name: below avatar (hero) → right of avatar, same row (collapsed) ---
  const animatedNameStyle = useAnimatedStyle(() => {
    const s = scrollOffset.value;
    const p = interpolate(s, [0, COLLAPSE_SCROLL_DISTANCE], [0, 1], Extrapolation.CLAMP);

    const W = nameWidth.value;
    const H = nameHeight.value;
    const scale = interpolate(p, [0, 1], [1, NAME_SCALE]);

    // Collapsed: name visual center X (side-by-side pair centered on screen)
    const nameVisualW = W * NAME_SCALE;
    const groupW = IMAGE_COLLAPSED + COLLAPSED_GAP + nameVisualW;
    const groupLeft = (screenWidth - groupW) / 2;
    const collapsedNameCX = groupLeft + IMAGE_COLLAPSED + COLLAPSED_GAP + nameVisualW / 2;

    // Y: below avatar in hero → same row in collapsed
    const heroNameCY = heroAvatarCY + IMAGE_EXPANDED / 2 + 12 + H / 2;
    const cy = (heroNameCY - s) * (1 - p) + collapsedCY * p;

    // X: centered in hero → right of avatar in collapsed
    const heroTX = screenWidth / 2 - W / 2;
    const collapsedTX = collapsedNameCX - W / 2;

    return {
      transform: [
        { translateX: heroTX * (1 - p) + collapsedTX * p },
        { translateY: cy - H / 2 },
        { scale },
      ],
    };
  });

  /** @sideeffect Writes to scrollOffset shared value AND forwards event to parent onScroll */
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    onSnapScroll(e);
    onScroll?.(e);
  };

  const handleScrollEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    onSnapScrollEndDrag(e);
    onScrollEndDrag?.(e);
  };

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    onSnapMomentumEnd(e);
  };

  return (
    <View style={styles.root}>
      {/* Safe area cover */}
      <View style={[styles.safeArea, { height: insets.top }]} />

      {/* Fixed nav bar */}
      <View style={styles.navBar}>
        <View style={styles.navLeft}>
          <TouchableOpacity style={styles.navButton} onPress={onBack} accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <HomeButton />
        </View>
        {rightContent ?? <View style={styles.navPlaceholder} />}
      </View>

      {/* @invariant pointerEvents="none" ensures floating layers don't steal taps from scroll content */}
      <Animated.View
        style={[styles.floatingAvatar, animatedAvatarStyle]}
        pointerEvents="none"
        testID="floating-avatar"
      >
        {renderImage(IMAGE_EXPANDED)}
      </Animated.View>

      {/* Floating animated name */}
      <Animated.View
        style={[styles.floatingName, animatedNameStyle]}
        pointerEvents="none"
        testID="floating-name"
      >
        <Text style={styles.floatingNameText} numberOfLines={1} onLayout={onNameLayout}>
          {name}
        </Text>
      </Animated.View>

      {/* Scrollable content */}
      <Animated.ScrollView
        ref={scrollRef as React.RefObject<Animated.ScrollView>}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40, minHeight: contentMinHeight }}
        showsVerticalScrollIndicator={false}
        onLayout={onScrollViewLayout}
        onScroll={handleScroll}
        onScrollBeginDrag={onScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumEnd}
        scrollEventThrottle={16}
        refreshControl={refreshControl}
      >
        {scrollHeader}

        {/* Hero section — placeholders for the floating avatar + name */}
        <View style={styles.hero}>
          {onImagePress ? (
            <TouchableOpacity
              onPress={onImagePress}
              activeOpacity={0.8}
              testID="hero-image-tap"
              style={{ width: IMAGE_EXPANDED, height: IMAGE_EXPANDED }}
            />
          ) : (
            <View style={{ width: IMAGE_EXPANDED, height: IMAGE_EXPANDED }} />
          )}
          <View style={styles.heroNamePlaceholder} />
          {heroContent}
        </View>

        {children}
      </Animated.ScrollView>
    </View>
  );
}
