import { useRef, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import type { SemanticTheme } from '@shared/themes';

/** @invariant must match the visual height of the header content area (logo + buttons) */
const HEADER_CONTENT_HEIGHT = 52;

export interface CollapsibleHeaderState {
  headerTranslateY: Animated.Value;
  totalHeaderHeight: number;
  handleScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

/**
 * @contract returns scroll handler that collapses header on scroll-down, reveals on scroll-up
 * @sync Uses RN Animated.Value (not Reanimated) — setValue runs on JS thread, not worklet
 */
export function useCollapsibleHeader(insetTop: number): CollapsibleHeaderState {
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  /** @sync headerOffset tracks cumulative scroll diff, clamped to [0, HEADER_CONTENT_HEIGHT] */
  const headerOffset = useRef(0);
  const totalHeaderHeight = insetTop + HEADER_CONTENT_HEIGHT;

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const rawY = e.nativeEvent.contentOffset.y;
      const currentY = Math.max(0, rawY);

      /** @edge bounce/overscroll: reset header to fully visible when at top */
      if (currentY <= 0) {
        headerOffset.current = 0;
        headerTranslateY.setValue(0);
        lastScrollY.current = 0;
        return;
      }

      const diff = currentY - lastScrollY.current;
      headerOffset.current = Math.min(
        Math.max(headerOffset.current + diff, 0),
        HEADER_CONTENT_HEIGHT,
      );
      headerTranslateY.setValue(-headerOffset.current);
      lastScrollY.current = currentY;
    },
    [headerTranslateY],
  );

  return { headerTranslateY, totalHeaderHeight, handleScroll };
}

export interface FeedHeaderProps {
  insetTop: number;
  headerTranslateY: Animated.Value;
  totalHeaderHeight: number;
}

/** @coupling logo-full.png asset must exist at assets/logo-full.png — build fails silently if missing */
export function FeedHeader({ insetTop, headerTranslateY, totalHeaderHeight }: FeedHeaderProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const s = createHeaderStyles(theme);

  return (
    <Animated.View
      style={[
        s.header,
        {
          paddingTop: insetTop,
          height: totalHeaderHeight,
          transform: [{ translateY: headerTranslateY }],
        },
      ]}
    >
      <Image
        source={require('../../../assets/logo-full.png')}
        style={s.logoFull}
        contentFit="contain"
        accessibilityLabel="Faniverz"
      />
      <View style={s.headerButtons}>
        <TouchableOpacity
          style={s.headerButton}
          onPress={() => router.push('/discover')}
          accessibilityRole="button"
          accessibilityLabel="Search"
        >
          <Ionicons name="search" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={s.headerButton}
          onPress={() => router.push('/notifications')}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

function createHeaderStyles(t: SemanticTheme) {
  return {
    header: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      paddingHorizontal: 10,
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingBottom: 4,
      backgroundColor: t.background,
    },
    logoFull: {
      height: 52,
      width: 146,
    },
    headerButtons: {
      flexDirection: 'row' as const,
      gap: 8,
    },
    headerButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.input,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
  };
}
