import { useRef, useCallback } from 'react';
import { Animated, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { HomeFeedHeaderChrome, HOME_FEED_HEADER_CONTENT_HEIGHT } from './HomeFeedHeaderChrome';

export { HOME_FEED_HEADER_CONTENT_HEIGHT };

interface CollapsibleHeaderState {
  headerTranslateY: Animated.Value;
  totalHeaderHeight: number;
  handleScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  getCurrentHeaderTranslateY: () => number;
  /** @contract Called on tab switch — reveals header when new page is near top, hides when scrolled */
  onPageChange: (newPageScrollY: number) => void;
}

/**
 * @contract returns scroll handler that collapses header on scroll-down, reveals on scroll-up
 * @sync Uses RN Animated.Value (not Reanimated) — setValue runs on JS thread, not worklet
 */
export function useCollapsibleHeader(insetTop: number, extraHeight = 0): CollapsibleHeaderState {
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const collapseRange = HOME_FEED_HEADER_CONTENT_HEIGHT + extraHeight;
  /** @sync headerOffset tracks cumulative scroll diff, clamped to [0, collapseRange] */
  const headerOffset = useRef(0);
  const totalHeaderHeight = insetTop + HOME_FEED_HEADER_CONTENT_HEIGHT;

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
      headerOffset.current = Math.min(Math.max(headerOffset.current + diff, 0), collapseRange);
      headerTranslateY.setValue(-headerOffset.current);
      lastScrollY.current = currentY;
    },
    [headerTranslateY],
  );

  /**
   * @contract Called on pager tab switch — always reveals header so the user sees which tab they're on.
   * @sync Always animates header to 0 regardless of the new page's scroll position.
   */
  const onPageChange = useCallback(
    (newPageScrollY: number) => {
      lastScrollY.current = newPageScrollY;
      // @sync Always reveal header on tab switch so the user sees which tab they're on.
      // Delay by one frame so pill highlight updates before header slides in.
      headerOffset.current = 0;
      requestAnimationFrame(() => {
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    },
    [headerTranslateY],
  );

  // @contract Feed cards read this snapshot at tap time so the image viewer can mask under the same header offset.
  // @coupling ImageViewerOverlay uses the returned value as topChrome.translateY to align its close animation with the header position.
  const getCurrentHeaderTranslateY = useCallback(() => -headerOffset.current, []);

  return {
    headerTranslateY,
    totalHeaderHeight,
    handleScroll,
    getCurrentHeaderTranslateY,
    onPageChange,
  };
}

export interface FeedHeaderProps {
  insetTop: number;
  headerTranslateY: Animated.Value;
  totalHeaderHeight: number;
  /** @contract Optional slot rendered below the chrome inside the animated header */
  children?: React.ReactNode;
}

/** @coupling logo-full.png asset must exist at assets/logo-full.png — build fails silently if missing */
export function FeedHeader({
  insetTop,
  headerTranslateY,
  totalHeaderHeight,
  children,
}: FeedHeaderProps) {
  const router = useRouter();

  return (
    <Animated.View
      style={[
        styles.header,
        {
          height: totalHeaderHeight,
          transform: [{ translateY: headerTranslateY }],
        },
      ]}
    >
      <HomeFeedHeaderChrome
        insetTop={insetTop}
        interactive
        onSearchPress={() => router.push('/discover')}
        onNotificationsPress={() => router.push('/notifications')}
      />
      {children}
    </Animated.View>
  );
}

const styles = {
  header: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
};
