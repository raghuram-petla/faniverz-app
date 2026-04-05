import type { MutableRefObject } from 'react';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import type { FeedFilterOption } from '@/types';
import type { ImageViewerTopChrome } from '@/providers/ImageViewerProvider';

export interface ScrollToTopHandle {
  scrollToTop: () => void;
  /** @contract Returns the current vertical scroll offset for this page */
  getScrollOffset: () => number;
}

export interface FeedPageProps {
  filter: FeedFilterOption;
  isActive: boolean;
  totalHeaderHeight: number;
  handleScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  getImageViewerTopChrome: () => ImageViewerTopChrome | undefined;
  setCommentSheetItemId: (id: string | null) => void;
  scrollToTopRef: MutableRefObject<ScrollToTopHandle>;
}
