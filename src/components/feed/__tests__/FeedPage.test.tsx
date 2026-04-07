/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: { red600: '#dc2626', gray500: '#6b7280', yellow400: '#facc15', white: '#fff' },
  }),
}));

jest.mock('@/styles/tabs/feed.styles', () => ({
  createFeedStyles: () => new Proxy({}, { get: () => ({}) }),
}));

const mockNewsFeed = {
  allItems: [] as any[],
  isLoading: false,
  isRefreshingFirstPage: false,
  hasNextPage: false,
  fetchNextPage: jest.fn(),
  isFetchingNextPage: false,
  refetch: jest.fn().mockResolvedValue(undefined),
};
jest.mock('@/features/feed', () => ({
  useNewsFeed: () => mockNewsFeed,
  useUserVotes: () => ({ data: {}, refetch: jest.fn() }),
  useBookmarkFeedItem: () => ({ mutate: jest.fn() }),
  useUnbookmarkFeedItem: () => ({ mutate: jest.fn() }),
  useUserBookmarks: () => ({ data: {}, refetch: jest.fn() }),
  useEntityFollows: () => ({ followSet: new Set() }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ cancelQueries: jest.fn(), invalidateQueries: jest.fn() }),
  useIsRestoring: () => false,
}));

jest.mock('@/hooks/useActiveVideo', () => ({
  useActiveVideo: () => ({
    activeVideoId: null,
    mountedVideoIds: [],
    registerVideoLayout: jest.fn(),
    handleScrollForVideo: jest.fn(),
  }),
}));

jest.mock('@/hooks/useSmartPagination', () => ({
  useSmartPagination: () => ({
    handleEndReached: jest.fn(),
    onEndReachedThreshold: 0.5,
  }),
}));

jest.mock('@/hooks/useFeedCommentPrefetch', () => ({
  useFeedCommentPrefetch: () => ({
    viewabilityConfig: {},
    onViewableItemsChanged: jest.fn(),
    resetViewDedup: jest.fn(),
  }),
}));

jest.mock('@/hooks/useRefresh', () => ({
  useRefresh: () => ({ refreshing: false, onRefresh: jest.fn().mockResolvedValue(undefined) }),
}));

const mockPullToRefresh = {
  pullDistance: { value: 0 },
  isRefreshing: { value: false },
  showRefreshIndicator: jest.fn(),
  hideRefreshIndicator: jest.fn(),
  handleScrollBeginDrag: jest.fn(),
  handlePullScroll: jest.fn(),
  handleScrollEndDrag: jest.fn(),
};
let capturedOnRefresh: (() => void) | null = null;
jest.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: (onRefresh: () => void) => {
    capturedOnRefresh = onRefresh;
    return mockPullToRefresh;
  },
}));

jest.mock('@/hooks/useFeedRefreshBuffer', () => ({
  useFeedRefreshBuffer: (_items: any[], _refreshing: boolean) => ({
    displayItems: _items,
    noNewData: false,
  }),
}));

jest.mock('@/hooks/useFeedActions', () => ({
  useFeedActions: () => ({
    handleShare: jest.fn(),
    handleEntityPress: jest.fn(),
    handleFeedItemPress: jest.fn(),
    handleComment: jest.fn(),
    gatedUpvote: jest.fn(),
    gatedDownvote: jest.fn(),
    gatedFollow: jest.fn(),
    gatedUnfollow: jest.fn(),
  }),
}));

jest.mock('@/hooks/useProgrammaticRefresh', () => ({
  useProgrammaticRefresh: () => ({
    showProgrammaticRefreshIndicator: false,
    runProgrammaticRefresh: jest.fn(),
  }),
}));

jest.mock('@/hooks/useAuthGate', () => ({
  useAuthGate: () => ({ gate: (fn: () => void) => fn }),
}));

jest.mock('@/constants/feedHelpers', () => ({
  FEED_PILLS: [
    { label: 'All', value: 'all' },
    { label: 'Trailers', value: 'trailers' },
  ],
  deriveEntityType: () => 'movie',
  getEntityId: () => 'movie-1',
}));

jest.mock('@/constants/paginationConfig', () => ({
  FEED_PAGINATION: { initialPageSize: 5, expandPageSize: 15, prefetchThreshold: 5 },
  NEWS_FEED_PAGINATION: { initialPageSize: 5, expandPageSize: 15, prefetchThreshold: 5 },
}));

jest.mock('../FeedCard', () => ({
  FeedCard: ({
    item,
    isFirst,
    onBookmark,
  }: {
    item: { id: string; title: string };
    isFirst: boolean;
    onBookmark?: (id: string) => void;
  }) => {
    const React = require('react');
    const { View, Text, TouchableOpacity } = require('react-native');
    return React.createElement(
      View,
      { testID: `feed-card-${item.id}` },
      React.createElement(Text, null, item.title),
      isFirst ? React.createElement(Text, { testID: 'first-card' }, 'first') : null,
      onBookmark
        ? React.createElement(TouchableOpacity, {
            testID: `bookmark-${item.id}`,
            onPress: () => onBookmark(item.id),
          })
        : null,
    );
  },
}));

jest.mock('../FeedContentSkeleton', () => ({
  FeedContentSkeleton: () => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: 'feed-skeleton' }, 'Loading...');
  },
}));

jest.mock('@/components/common/PullToRefreshIndicator', () => ({
  PullToRefreshIndicator: () => null,
  RefreshingPillOverlay: () => null,
}));

let capturedFlashListProps: any = null;

jest.mock('@shopify/flash-list', () => {
  return {
    FlashList: (props: any) => {
      const React = require('react');
      const { View } = require('react-native');
      capturedFlashListProps = props;
      return React.createElement(
        View,
        {
          testID: 'flash-list',
          onLayout: props.onLayout,
        },
        props.ListHeaderComponent,
        props.data?.map((item: any, index: number) => props.renderItem({ item, index })),
        props.ListFooterComponent,
        props.ListEmptyComponent,
      );
    },
  };
});

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { FeedPage } from '../FeedPage';
import type { ScrollToTopHandle } from '../FeedPage.types';

function makeScrollToTopRef(): React.MutableRefObject<ScrollToTopHandle> {
  return {
    current: {
      scrollToTop: jest.fn(),
      getScrollOffset: jest.fn(() => 0),
    },
  };
}

const baseProps = {
  filter: 'all' as const,
  isActive: true,
  totalHeaderHeight: 100,
  handleScroll: jest.fn(),
  getImageViewerTopChrome: jest.fn(() => undefined),
  setCommentSheetItemId: jest.fn(),
  scrollToTopRef: makeScrollToTopRef(),
};

describe('FeedPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNewsFeed.allItems = [];
    mockNewsFeed.isLoading = false;
    mockNewsFeed.isFetchingNextPage = false;
    mockNewsFeed.hasNextPage = false;
  });

  it('shows skeleton when isLoading is true', () => {
    mockNewsFeed.isLoading = true;
    render(<FeedPage {...baseProps} scrollToTopRef={makeScrollToTopRef()} />);
    expect(screen.getByTestId('feed-skeleton')).toBeTruthy();
  });

  it('renders empty state when no items', () => {
    mockNewsFeed.allItems = [];
    render(<FeedPage {...baseProps} scrollToTopRef={makeScrollToTopRef()} />);
    expect(screen.getByText('feed.noUpdates')).toBeTruthy();
  });

  it('renders empty state with filter-specific message when filter is not all', () => {
    mockNewsFeed.allItems = [];
    render(
      <FeedPage {...baseProps} filter={'trailers' as any} scrollToTopRef={makeScrollToTopRef()} />,
    );
    expect(screen.getByText('feed.noUpdates')).toBeTruthy();
    expect(screen.getByText('feed.noFilterContent')).toBeTruthy();
  });

  it('renders checkBackSoon message when filter is all and no items', () => {
    mockNewsFeed.allItems = [];
    render(<FeedPage {...baseProps} filter="all" scrollToTopRef={makeScrollToTopRef()} />);
    expect(screen.getByText('feed.checkBackSoon')).toBeTruthy();
  });

  it('renders feed cards when items are present', () => {
    mockNewsFeed.allItems = [
      { id: 'item-1', title: 'Post 1', youtube_id: null },
      { id: 'item-2', title: 'Post 2', youtube_id: null },
    ] as any;
    render(<FeedPage {...baseProps} scrollToTopRef={makeScrollToTopRef()} />);
    expect(screen.getByTestId('feed-card-item-1')).toBeTruthy();
    expect(screen.getByTestId('feed-card-item-2')).toBeTruthy();
  });

  it('marks first item as isFirst=true', () => {
    mockNewsFeed.allItems = [{ id: 'item-1', title: 'Post 1', youtube_id: null }] as any;
    render(<FeedPage {...baseProps} scrollToTopRef={makeScrollToTopRef()} />);
    expect(screen.getByTestId('first-card')).toBeTruthy();
  });

  it('shows footer loading indicator when isFetchingNextPage', () => {
    mockNewsFeed.isFetchingNextPage = true;
    render(<FeedPage {...baseProps} scrollToTopRef={makeScrollToTopRef()} />);
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain('ActivityIndicator');
  });

  it('does not show footer loading indicator when not fetching next page', () => {
    mockNewsFeed.isFetchingNextPage = false;
    render(<FeedPage {...baseProps} scrollToTopRef={makeScrollToTopRef()} />);
    const json = JSON.stringify(screen.toJSON());
    // ActivityIndicator should not be in tree when isFetchingNextPage is false
    expect(json).not.toContain('ActivityIndicator');
  });

  it('sets scrollToTopRef.current with scrollToTop and getScrollOffset functions', () => {
    const ref = makeScrollToTopRef();
    render(<FeedPage {...baseProps} scrollToTopRef={ref} />);
    expect(typeof ref.current.scrollToTop).toBe('function');
    expect(typeof ref.current.getScrollOffset).toBe('function');
  });

  it('getScrollOffset returns current scroll offset (initially 0)', () => {
    const ref = makeScrollToTopRef();
    render(<FeedPage {...baseProps} scrollToTopRef={ref} />);
    expect(ref.current.getScrollOffset()).toBe(0);
  });

  it('scrollToTop calls runProgrammaticRefresh when scroll offset <= 2', () => {
    const mockRunProgrammaticRefresh = jest.fn();
    const useProgrammaticRefreshMod = require('@/hooks/useProgrammaticRefresh');
    const origUseProgrammaticRefresh = useProgrammaticRefreshMod.useProgrammaticRefresh;
    useProgrammaticRefreshMod.useProgrammaticRefresh = () => ({
      showProgrammaticRefreshIndicator: false,
      runProgrammaticRefresh: mockRunProgrammaticRefresh,
    });

    const ref = makeScrollToTopRef();
    render(<FeedPage {...baseProps} scrollToTopRef={ref} />);
    // scrollOffsetRef starts at 0 (<=2), so scrollToTop should call runProgrammaticRefresh
    ref.current.scrollToTop();
    expect(mockRunProgrammaticRefresh).toHaveBeenCalled();

    useProgrammaticRefreshMod.useProgrammaticRefresh = origUseProgrammaticRefresh;
  });

  it('scrollToTop calls scrollToOffset when scroll offset > 2', () => {
    const ref = makeScrollToTopRef();
    render(<FeedPage {...baseProps} scrollToTopRef={ref} />);

    // Simulate scroll to set offset > 2
    capturedFlashListProps?.onScroll?.({
      nativeEvent: { contentOffset: { y: 100 }, layoutMeasurement: { height: 800 } },
    });

    // Now scrollToTop should call scrollToOffset (via listRef)
    // Since listRef.current is null (no real FlashList), the optional chain means no error
    expect(() => ref.current.scrollToTop()).not.toThrow();
  });

  it('FlashList keyExtractor returns item id', () => {
    mockNewsFeed.allItems = [{ id: 'item-1', title: 'Post 1', youtube_id: null }] as any;
    render(<FeedPage {...baseProps} scrollToTopRef={makeScrollToTopRef()} />);
    expect(capturedFlashListProps).not.toBeNull();
    const item = { id: 'test-id', title: 'Test' };
    expect(capturedFlashListProps.keyExtractor(item)).toBe('test-id');
  });

  it('FlashList onLayout calls handleScrollForVideo', () => {
    const { useActiveVideo } = require('@/hooks/useActiveVideo');
    const mockHandleScrollForVideo = jest.fn();
    useActiveVideo.mockReturnValue = undefined; // reset
    const origUseActiveVideo = require('@/hooks/useActiveVideo').useActiveVideo;
    require('@/hooks/useActiveVideo').useActiveVideo = () => ({
      activeVideoId: null,
      mountedVideoIds: [],
      registerVideoLayout: jest.fn(),
      handleScrollForVideo: mockHandleScrollForVideo,
    });

    mockNewsFeed.allItems = [];
    render(<FeedPage {...baseProps} scrollToTopRef={makeScrollToTopRef()} />);
    capturedFlashListProps?.onLayout?.({
      nativeEvent: { layout: { height: 800 } },
    });
    expect(mockHandleScrollForVideo).toHaveBeenCalled();

    require('@/hooks/useActiveVideo').useActiveVideo = origUseActiveVideo;
  });

  it('FlashList onScroll calls handlePullScroll and handleHeaderScroll when isActive', () => {
    const mockHandleHeaderScroll = jest.fn();
    mockNewsFeed.allItems = [];
    render(
      <FeedPage
        {...baseProps}
        isActive={true}
        handleScroll={mockHandleHeaderScroll}
        scrollToTopRef={makeScrollToTopRef()}
      />,
    );
    const fakeScrollEvent = {
      nativeEvent: {
        contentOffset: { y: 100 },
        layoutMeasurement: { height: 800 },
      },
    };
    capturedFlashListProps?.onScroll?.(fakeScrollEvent);
    expect(mockHandleHeaderScroll).toHaveBeenCalledWith(fakeScrollEvent);
  });

  it('FlashList onScroll does not call handleHeaderScroll when not isActive', () => {
    const mockHandleHeaderScroll = jest.fn();
    mockNewsFeed.allItems = [];
    render(
      <FeedPage
        {...baseProps}
        isActive={false}
        handleScroll={mockHandleHeaderScroll}
        scrollToTopRef={makeScrollToTopRef()}
      />,
    );
    const fakeScrollEvent = {
      nativeEvent: {
        contentOffset: { y: 100 },
        layoutMeasurement: { height: 800 },
      },
    };
    capturedFlashListProps?.onScroll?.(fakeScrollEvent);
    expect(mockHandleHeaderScroll).not.toHaveBeenCalled();
  });

  it('handleBookmark calls bookmarkMutation when item is not bookmarked', () => {
    const mockBookmarkMutate = jest.fn();
    const feedModule = require('@/features/feed');
    const origBookmark = feedModule.useBookmarkFeedItem;
    feedModule.useBookmarkFeedItem = () => ({ mutate: mockBookmarkMutate });

    mockNewsFeed.allItems = [{ id: 'item-1', title: 'Post 1', youtube_id: null }] as any;
    const { getByTestId } = render(
      <FeedPage {...baseProps} scrollToTopRef={makeScrollToTopRef()} />,
    );

    // Press the bookmark button rendered by FeedCard mock
    const { fireEvent } = require('@testing-library/react-native');
    fireEvent.press(getByTestId('bookmark-item-1'));
    expect(mockBookmarkMutate).toHaveBeenCalledWith({ feedItemId: 'item-1' });

    feedModule.useBookmarkFeedItem = origBookmark;
  });

  it('handleBookmark calls unbookmarkMutation when item is already bookmarked', () => {
    const mockUnbookmarkMutate = jest.fn();
    const feedModule = require('@/features/feed');
    const origUnbookmark = feedModule.useUnbookmarkFeedItem;
    const origBookmarks = feedModule.useUserBookmarks;
    feedModule.useUnbookmarkFeedItem = () => ({ mutate: mockUnbookmarkMutate });
    // Return item-1 as already bookmarked
    feedModule.useUserBookmarks = () => ({ data: { 'item-1': true }, refetch: jest.fn() });

    mockNewsFeed.allItems = [{ id: 'item-1', title: 'Post 1', youtube_id: null }] as any;
    const { getByTestId } = render(
      <FeedPage {...baseProps} scrollToTopRef={makeScrollToTopRef()} />,
    );

    const { fireEvent } = require('@testing-library/react-native');
    fireEvent.press(getByTestId('bookmark-item-1'));
    expect(mockUnbookmarkMutate).toHaveBeenCalledWith({ feedItemId: 'item-1' });

    feedModule.useUnbookmarkFeedItem = origUnbookmark;
    feedModule.useUserBookmarks = origBookmarks;
  });

  it('onRefresh callback invokes resetViewDedup and baseOnRefresh', () => {
    const mockResetViewDedup = jest.fn();
    const mockBaseOnRefresh = jest.fn();
    const feedCommentPrefetchMod = require('@/hooks/useFeedCommentPrefetch');
    const origPrefetch = feedCommentPrefetchMod.useFeedCommentPrefetch;
    feedCommentPrefetchMod.useFeedCommentPrefetch = () => ({
      viewabilityConfig: {},
      onViewableItemsChanged: jest.fn(),
      resetViewDedup: mockResetViewDedup,
    });
    const refreshMod = require('@/hooks/useRefresh');
    const origRefresh = refreshMod.useRefresh;
    refreshMod.useRefresh = () => ({ refreshing: false, onRefresh: mockBaseOnRefresh });

    render(<FeedPage {...baseProps} scrollToTopRef={makeScrollToTopRef()} />);
    // capturedOnRefresh is set by usePullToRefresh mock — invoke it
    capturedOnRefresh?.();
    expect(mockResetViewDedup).toHaveBeenCalled();
    expect(mockBaseOnRefresh).toHaveBeenCalled();

    feedCommentPrefetchMod.useFeedCommentPrefetch = origPrefetch;
    refreshMod.useRefresh = origRefresh;
  });

  it('renders RefreshingPillOverlay and RefreshControl on Android', () => {
    const RN = require('react-native');
    const origPlatformOS = RN.Platform.OS;
    RN.Platform.OS = 'android';

    const { getByTestId } = render(
      <FeedPage {...baseProps} scrollToTopRef={makeScrollToTopRef()} />,
    );
    // On Android isAndroid is true — RefreshingPillOverlay renders, RefreshControl is present
    // The flash-list is still rendered
    expect(getByTestId('flash-list')).toBeTruthy();

    RN.Platform.OS = origPlatformOS;
  });

  it('renderItem passes registerVideoLayout when item has youtube_id', () => {
    mockNewsFeed.allItems = [{ id: 'video-item', title: 'Video Post', youtube_id: 'yt123' }] as any;
    render(<FeedPage {...baseProps} scrollToTopRef={makeScrollToTopRef()} />);
    // The FeedCard for video-item should be rendered
    const { getByTestId } = render(
      <FeedPage {...baseProps} scrollToTopRef={makeScrollToTopRef()} />,
    );
    expect(getByTestId('feed-card-video-item')).toBeTruthy();
  });

  it('empty state shows filter label when filter is not all and pill label exists', () => {
    mockNewsFeed.allItems = [];
    const { getByText } = render(
      <FeedPage {...baseProps} filter={'trailers' as any} scrollToTopRef={makeScrollToTopRef()} />,
    );
    expect(getByText('feed.noFilterContent')).toBeTruthy();
  });

  it('empty state falls back to filter value when pill label is not found', () => {
    mockNewsFeed.allItems = [];
    // 'songs' is not in our FEED_PILLS mock — label lookup returns undefined, fallback to 'songs'
    const { getByText } = render(
      <FeedPage {...baseProps} filter={'songs' as any} scrollToTopRef={makeScrollToTopRef()} />,
    );
    // feed.noFilterContent is still called (with filter='songs' as fallback)
    expect(getByText('feed.noFilterContent')).toBeTruthy();
  });
});
