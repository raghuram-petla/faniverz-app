import { useCallback, useRef, useState } from 'react';
import type {
  NativeSyntheticEvent,
  NativeScrollEvent,
  ScrollView,
  LayoutChangeEvent,
} from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

export interface SnapScrollProps {
  scrollOffset: SharedValue<number>;
  snapThreshold: number;
}

export interface SnapScrollResult {
  scrollRef: React.RefObject<ScrollView | null>;
  /** Apply as contentContainerStyle={{ minHeight }} to guarantee enough scroll room */
  contentMinHeight: number;
  handleLayout: (e: LayoutChangeEvent) => void;
  handleScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  handleScrollEndDrag: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  handleMomentumEnd: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

/**
 * @contract Provides scroll handlers that snap to 0 or snapThreshold.
 * @edge Exports contentMinHeight so the ScrollView always has enough room
 *       to scroll to snapThreshold — poster/name always reach their final position.
 */
export function useSnapScroll({ scrollOffset, snapThreshold }: SnapScrollProps): SnapScrollResult {
  const scrollRef = useRef<ScrollView>(null);
  // @edge: viewportHeight drives contentMinHeight so the scroll can always reach snapThreshold
  const [vpHeight, setVpHeight] = useState(0);

  const snapIfNeeded = useCallback(
    (y: number) => {
      if (y > 0 && y < snapThreshold) {
        const target = y < snapThreshold / 2 ? 0 : snapThreshold;
        scrollRef.current?.scrollTo({ y: target, animated: true });
      }
    },
    [snapThreshold],
  );

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setVpHeight(e.nativeEvent.layout.height);
  }, []);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffset.value = e.nativeEvent.contentOffset.y;
    },
    [scrollOffset],
  );

  const handleScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const vy = e.nativeEvent.velocity?.y ?? 0;
      if (Math.abs(vy) < 0.1) snapIfNeeded(e.nativeEvent.contentOffset.y);
    },
    [snapIfNeeded],
  );

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      snapIfNeeded(e.nativeEvent.contentOffset.y);
    },
    [snapIfNeeded],
  );

  return {
    scrollRef,
    contentMinHeight: vpHeight + snapThreshold,
    handleLayout,
    handleScroll,
    handleScrollEndDrag,
    handleMomentumEnd,
  };
}
