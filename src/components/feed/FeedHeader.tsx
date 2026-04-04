import { useRef, useCallback } from 'react';
import { Animated, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { HomeFeedHeaderChrome, HOME_FEED_HEADER_CONTENT_HEIGHT } from './HomeFeedHeaderChrome';

export { HOME_FEED_HEADER_CONTENT_HEIGHT };

export interface CollapsibleHeaderState {
  headerTranslateY: Animated.Value;
  totalHeaderHeight: number;
  handleScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  getCurrentHeaderTranslateY: () => number;
}

/**
 * @contract returns scroll handler that collapses header on scroll-down, reveals on scroll-up
 * @sync Uses RN Animated.Value (not Reanimated) — setValue runs on JS thread, not worklet
 */
export function useCollapsibleHeader(insetTop: number): CollapsibleHeaderState {
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  /** @sync headerOffset tracks cumulative scroll diff, clamped to [0, HOME_FEED_HEADER_CONTENT_HEIGHT] */
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
      headerOffset.current = Math.min(
        Math.max(headerOffset.current + diff, 0),
        HOME_FEED_HEADER_CONTENT_HEIGHT,
      );
      headerTranslateY.setValue(-headerOffset.current);
      lastScrollY.current = currentY;
    },
    [headerTranslateY],
  );

  // @contract Feed cards read this snapshot at tap time so the image viewer can mask under the same header offset.
  // @coupling ImageViewerOverlay uses the returned value as topChrome.translateY to align its close animation with the header position.
  const getCurrentHeaderTranslateY = useCallback(() => -headerOffset.current, []);

  return { headerTranslateY, totalHeaderHeight, handleScroll, getCurrentHeaderTranslateY };
}

export interface FeedHeaderProps {
  insetTop: number;
  headerTranslateY: Animated.Value;
  totalHeaderHeight: number;
}

/** @coupling logo-full.png asset must exist at assets/logo-full.png — build fails silently if missing */
export function FeedHeader({ insetTop, headerTranslateY, totalHeaderHeight }: FeedHeaderProps) {
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
