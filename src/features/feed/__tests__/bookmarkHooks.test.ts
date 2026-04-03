jest.mock('../bookmarkApi');

jest.mock('@/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'user-123' },
    session: {},
    isLoading: false,
  })),
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { createWrapper } from '@/__tests__/helpers/createWrapper';
import {
  useBookmarkFeedItem,
  useUnbookmarkFeedItem,
  useUserBookmarks,
  useBookmarkedFeed,
} from '../bookmarkHooks';
import {
  bookmarkFeedItem,
  unbookmarkFeedItem,
  fetchUserBookmarks,
  fetchBookmarkedFeed,
} from '../bookmarkApi';
import { useAuth } from '@/features/auth/providers/AuthProvider';

const mockBookmarkFeedItem = bookmarkFeedItem as jest.MockedFunction<typeof bookmarkFeedItem>;
const mockUnbookmarkFeedItem = unbookmarkFeedItem as jest.MockedFunction<typeof unbookmarkFeedItem>;
const mockFetchUserBookmarks = fetchUserBookmarks as jest.MockedFunction<typeof fetchUserBookmarks>;
const mockFetchBookmarkedFeed = fetchBookmarkedFeed as jest.MockedFunction<
  typeof fetchBookmarkedFeed
>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const mockItem = {
  id: 'item-1',
  feed_type: 'video' as const,
  content_type: 'trailer',
  title: 'Test',
  description: null,
  movie_id: null,
  source_table: null,
  source_id: null,
  thumbnail_url: null,
  youtube_id: 'abc',
  is_pinned: false,
  is_featured: false,
  display_order: 0,
  upvote_count: 5,
  downvote_count: 1,
  view_count: 0,
  comment_count: 0,
  bookmark_count: 2,
  published_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
};

describe('useBookmarkedFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchBookmarkedFeed.mockResolvedValue([mockItem]);
  });

  it('fetches bookmarked feed successfully', async () => {
    const { result } = renderHook(() => useBookmarkedFeed(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]).toEqual([mockItem]);
  });

  it('calls fetchBookmarkedFeed with userId', async () => {
    const { result } = renderHook(() => useBookmarkedFeed(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchBookmarkedFeed).toHaveBeenCalledWith('user-123', 0, 5);
  });

  it('handles errors', async () => {
    mockFetchBookmarkedFeed.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useBookmarkedFeed(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useBookmarkFeedItem', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls bookmarkFeedItem with correct params', async () => {
    mockBookmarkFeedItem.mockResolvedValue(undefined);
    const { result } = renderHook(() => useBookmarkFeedItem(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockBookmarkFeedItem).toHaveBeenCalledWith('item-1', 'user-123');
  });

  it('throws when not logged in', async () => {
    mockUseAuth.mockReturnValueOnce({ user: null } as ReturnType<typeof useAuth>);
    const { result } = renderHook(() => useBookmarkFeedItem(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1' });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('shows alert on error', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    mockBookmarkFeedItem.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useBookmarkFeedItem(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1' });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalledWith('common.error', 'common.failedToBookmark');
  });
});

describe('useUnbookmarkFeedItem', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls unbookmarkFeedItem with correct params', async () => {
    mockUnbookmarkFeedItem.mockResolvedValue(undefined);
    const { result } = renderHook(() => useUnbookmarkFeedItem(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUnbookmarkFeedItem).toHaveBeenCalledWith('item-1', 'user-123');
  });

  it('throws when not logged in', async () => {
    mockUseAuth.mockReturnValueOnce({ user: null } as ReturnType<typeof useAuth>);
    const { result } = renderHook(() => useUnbookmarkFeedItem(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1' });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('shows alert on error', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    mockUnbookmarkFeedItem.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useUnbookmarkFeedItem(), { wrapper: createWrapper() });
    await act(async () => {
      result.current.mutate({ feedItemId: 'item-1' });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(alertSpy).toHaveBeenCalledWith('common.error', 'common.failedToBookmark');
  });
});

describe('useUserBookmarks', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns bookmark record for visible items', async () => {
    mockFetchUserBookmarks.mockResolvedValue({ 'item-1': true, 'item-3': true });
    const { result } = renderHook(() => useUserBookmarks(['item-1', 'item-2', 'item-3']), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ 'item-1': true, 'item-3': true });
  });

  it('is disabled when userId is absent', async () => {
    mockUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);
    const { result } = renderHook(() => useUserBookmarks(['item-1']), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFetchUserBookmarks).not.toHaveBeenCalled();
  });

  it('is disabled when feedItemIds is empty', async () => {
    const { result } = renderHook(() => useUserBookmarks([]), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFetchUserBookmarks).not.toHaveBeenCalled();
  });

  it('handles fetch error', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } } as ReturnType<typeof useAuth>);
    mockFetchUserBookmarks.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useUserBookmarks(['item-1']), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
