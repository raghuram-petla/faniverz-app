import { StyleSheet } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import type { ImageViewerTopChrome } from '@/providers/ImageViewerProvider';
import { HomeFeedHeaderChrome } from './HomeFeedHeaderChrome';

export interface HomeFeedTopChromeMaskProps {
  topChrome: ImageViewerTopChrome;
  animatedStyle?: AnimatedStyle<object>;
  showHeaderChrome?: boolean;
}

// @contract Open uses a background-only occlusion; close can swap in the real header chrome so the tuck-in keeps the top panel visible.
export function HomeFeedTopChromeMask({
  topChrome,
  animatedStyle,
  showHeaderChrome = false,
}: HomeFeedTopChromeMaskProps) {
  const { theme } = useTheme();

  return (
    <>
      <Animated.View
        pointerEvents="none"
        testID="image-viewer-top-safe-area-mask"
        style={[
          styles.safeAreaMask,
          animatedStyle,
          { height: topChrome.insetTop, backgroundColor: theme.background },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        testID="image-viewer-top-chrome-mask"
        style={[
          showHeaderChrome ? styles.headerChrome : styles.headerMask,
          animatedStyle,
          showHeaderChrome
            ? { transform: [{ translateY: topChrome.headerTranslateY }] }
            : {
                top: topChrome.insetTop + topChrome.headerTranslateY,
                height: topChrome.headerContentHeight,
                backgroundColor: theme.background,
              },
        ]}
      >
        {showHeaderChrome ? (
          <HomeFeedHeaderChrome
            insetTop={topChrome.insetTop}
            headerContentHeight={topChrome.headerContentHeight}
          />
        ) : null}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  safeAreaMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 7,
  },
  headerMask: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 6,
  },
  headerChrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 6,
  },
});
