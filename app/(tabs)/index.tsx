import { useCallback, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useScrollToTop } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useFeedStore } from '@/stores/useFeedStore';
import {
  FeedHeader,
  HOME_FEED_HEADER_CONTENT_HEIGHT,
  useCollapsibleHeader,
} from '@/components/feed/FeedHeader';
import { FeedFilterPills, FEED_PILL_BAR_HEIGHT } from '@/components/feed/FeedFilterPills';
import { FeedPager } from '@/components/feed/FeedPager';
import { SafeAreaCover } from '@/components/common/SafeAreaCover';
import { CommentsBottomSheet } from '@/components/feed/CommentsBottomSheet';
import { createFeedStyles } from '@/styles/tabs/feed.styles';
import type { ImageViewerTopChrome } from '@/providers/ImageViewerProvider';
import type { ScrollToTopHandle } from '@/components/feed/FeedPage.types';

// @boundary Home feed tab — pager with per-pill pages, collapsible header, comments
export default function FeedScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createFeedStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { filter, setFilter } = useFeedStore();
  const {
    headerTranslateY,
    totalHeaderHeight,
    handleScroll,
    getCurrentHeaderTranslateY,
    onPageChange,
  } = useCollapsibleHeader(insets.top, FEED_PILL_BAR_HEIGHT);
  const [commentSheetItemId, setCommentSheetItemId] = useState<string | null>(null);

  // @contract Active page's scroll-to-top handle — updated by FeedPager on page switch
  const activeScrollToTopRef = useRef<ScrollToTopHandle>({
    scrollToTop: () => {},
    getScrollOffset: () => 0,
  });
  const homeTabActionRef = useRef<{ scrollToTop: () => void }>({
    scrollToTop: () => activeScrollToTopRef.current.scrollToTop(),
  });
  homeTabActionRef.current.scrollToTop = () => activeScrollToTopRef.current.scrollToTop();
  useScrollToTop(homeTabActionRef);

  const getImageViewerTopChrome = useCallback(
    (): ImageViewerTopChrome => ({
      variant: 'home-feed',
      insetTop: insets.top,
      headerContentHeight: HOME_FEED_HEADER_CONTENT_HEIGHT,
      headerTranslateY: getCurrentHeaderTranslateY(),
    }),
    [getCurrentHeaderTranslateY, insets.top],
  );

  return (
    <View style={styles.screen}>
      <SafeAreaCover />
      <FeedHeader
        insetTop={insets.top}
        headerTranslateY={headerTranslateY}
        totalHeaderHeight={totalHeaderHeight + FEED_PILL_BAR_HEIGHT}
      >
        <FeedFilterPills filter={filter} setFilter={setFilter} />
      </FeedHeader>
      <FeedPager
        totalHeaderHeight={totalHeaderHeight + FEED_PILL_BAR_HEIGHT}
        handleScroll={handleScroll}
        getImageViewerTopChrome={getImageViewerTopChrome}
        setCommentSheetItemId={setCommentSheetItemId}
        activeScrollToTopRef={activeScrollToTopRef}
        onPageChange={onPageChange}
      />
      <CommentsBottomSheet
        visible={!!commentSheetItemId}
        feedItemId={commentSheetItemId ?? ''}
        onClose={() => setCommentSheetItemId(null)}
      />
    </View>
  );
}
