import { useCallback, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import PagerView, { type PagerViewOnPageSelectedEvent } from 'react-native-pager-view';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useFeedStore } from '@/stores/useFeedStore';
import { FEED_PILLS } from '@/constants/feedHelpers';
import { FeedPage } from './FeedPage';
import type { FeedFilterOption } from '@/types';
import type { ImageViewerTopChrome } from '@/providers/ImageViewerProvider';
import type { ScrollToTopHandle } from './FeedPage.types';

export interface FeedPagerProps {
  totalHeaderHeight: number;
  handleScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  getImageViewerTopChrome: () => ImageViewerTopChrome | undefined;
  setCommentSheetItemId: (id: string | null) => void;
  /** @contract Parent passes ref so tab-tap can trigger scroll-to-top on active page */
  activeScrollToTopRef: React.MutableRefObject<ScrollToTopHandle>;
  /** @contract Called on page switch to sync collapsible header with new page's scroll offset */
  onPageChange: (newPageScrollY: number) => void;
}

/**
 * @contract Horizontal pager — one page per FEED_PILLS entry. Swiping left/right
 * switches tabs; tapping a pill also navigates via setPage(). Each page lazy-mounts
 * on first visit and stays mounted to preserve scroll position.
 */
export function FeedPager({
  totalHeaderHeight,
  handleScroll,
  getImageViewerTopChrome,
  setCommentSheetItemId,
  activeScrollToTopRef,
  onPageChange,
}: FeedPagerProps) {
  const { pageIndex, setPageIndex } = useFeedStore();
  const pagerRef = useRef<PagerView>(null);
  // @sync Track which pages have been visited for lazy mounting
  const [visitedPages, setVisitedPages] = useState<Set<number>>(() => new Set([0]));
  const pageScrollToTopRefs = useRef<React.MutableRefObject<ScrollToTopHandle>[]>(
    FEED_PILLS.map(() => ({ current: { scrollToTop: () => {}, getScrollOffset: () => 0 } })),
  );

  // @sync Delegate parent's scroll-to-top to the active page's ref.
  // Uses a proxy that reads through the ref chain at call time (not render time),
  // so it always picks up the latest handler even after FeedPage re-renders.
  activeScrollToTopRef.current = {
    scrollToTop: () => pageScrollToTopRefs.current[pageIndex]?.current?.scrollToTop(),
    getScrollOffset: () => pageScrollToTopRefs.current[pageIndex]?.current?.getScrollOffset() ?? 0,
  };

  const handlePageSelected = useCallback(
    (e: PagerViewOnPageSelectedEvent) => {
      const newIndex = e.nativeEvent.position;
      setPageIndex(newIndex);
      setVisitedPages((prev) => {
        if (prev.has(newIndex)) return prev;
        const next = new Set(prev);
        next.add(newIndex);
        return next;
      });
      // @sync Point parent's scroll-to-top ref at the newly active page
      activeScrollToTopRef.current = pageScrollToTopRefs.current[newIndex].current;
      // @sync Reveal/hide header based on new page's scroll position
      const scrollY = pageScrollToTopRefs.current[newIndex]?.current?.getScrollOffset() ?? 0;
      onPageChange(scrollY);
    },
    [setPageIndex, activeScrollToTopRef, onPageChange],
  );

  // @sync Pill tap navigates pager programmatically
  const prevPageIndex = useRef(pageIndex);
  if (pageIndex !== prevPageIndex.current) {
    prevPageIndex.current = pageIndex;
    pagerRef.current?.setPage(pageIndex);
    // Mark as visited when navigated via pill
    setVisitedPages((prev) => {
      if (prev.has(pageIndex)) return prev;
      const next = new Set(prev);
      next.add(pageIndex);
      return next;
    });
  }

  return (
    <PagerView
      ref={pagerRef}
      style={styles.pager}
      initialPage={0}
      onPageSelected={handlePageSelected}
      overdrag
    >
      {FEED_PILLS.map((pill, index) => (
        <View key={pill.value} style={styles.page}>
          {visitedPages.has(index) ? (
            <FeedPage
              filter={pill.value as FeedFilterOption}
              isActive={pageIndex === index}
              totalHeaderHeight={totalHeaderHeight}
              handleScroll={handleScroll}
              getImageViewerTopChrome={getImageViewerTopChrome}
              setCommentSheetItemId={setCommentSheetItemId}
              scrollToTopRef={pageScrollToTopRefs.current[index]}
            />
          ) : null}
        </View>
      ))}
    </PagerView>
  );
}

const styles = StyleSheet.create({
  pager: { flex: 1 },
  page: { flex: 1 },
});
