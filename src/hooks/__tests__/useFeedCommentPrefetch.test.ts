// Mock requestAnimationFrame to execute synchronously
global.requestAnimationFrame = (cb: FrameRequestCallback) => {
  cb(0);
  return 0;
};
global.cancelAnimationFrame = jest.fn();

jest.mock('@/features/feed/commentsApi', () => ({
  fetchComments: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: jest.fn(() => ({ user: { id: 'user-1' } })),
}));

jest.mock('@/features/feed/viewTrackingApi', () => ({
  recordFeedViews: jest.fn(),
}));

import { renderHook, act } from '@testing-library/react-native';
import { QueryClient } from '@tanstack/react-query';
import { useFeedCommentPrefetch } from '../useFeedCommentPrefetch';
import { recordFeedViews } from '@/features/feed/viewTrackingApi';
import type { SmartPaginationConfigWithPrefetch } from '@/constants/paginationConfig';

const mockRecordFeedViews = recordFeedViews as jest.MockedFunction<typeof recordFeedViews>;

const config: SmartPaginationConfigWithPrefetch = {
  initialPageSize: 5,
  expandedPageSize: 15,
  prefetchItemsRemaining: 5,
  backgroundExpand: true,
  prefetchRelated: {
    countField: 'comment_count',
    countThreshold: 10,
  },
};

const makeViewToken = (id: string, commentCount = 20) => ({
  item: { id, comment_count: commentCount },
  key: id,
  index: 0,
  isViewable: true,
});

describe('useFeedCommentPrefetch', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns viewabilityConfig with correct thresholds', () => {
    const { result } = renderHook(() => useFeedCommentPrefetch({ config, queryClient }));
    expect(result.current.viewabilityConfig).toEqual({
      itemVisiblePercentThreshold: 50,
      minimumViewTime: 300,
    });
  });

  it('composes both prefetch and view tracking on viewable items changed', () => {
    const prefetchSpy = jest
      .spyOn(queryClient, 'prefetchInfiniteQuery')
      .mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useFeedCommentPrefetch({ config, queryClient }));

    act(() => {
      result.current.onViewableItemsChanged({
        viewableItems: [makeViewToken('a')],
      });
    });

    // Prefetch should have fired (comment_count 20 > threshold 10)
    expect(prefetchSpy).toHaveBeenCalledTimes(1);

    // View tracking should have batched the item — flush via timer
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(mockRecordFeedViews).toHaveBeenCalledWith(['a']);

    prefetchSpy.mockRestore();
  });

  it('resetViewDedup clears the view tracking dedup set', () => {
    const { result } = renderHook(() => useFeedCommentPrefetch({ config, queryClient }));

    act(() => {
      result.current.onViewableItemsChanged({ viewableItems: [makeViewToken('a')] });
    });
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(mockRecordFeedViews).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.resetViewDedup();
    });

    act(() => {
      result.current.onViewableItemsChanged({ viewableItems: [makeViewToken('a')] });
    });
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(mockRecordFeedViews).toHaveBeenCalledTimes(2);
  });
});
