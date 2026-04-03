jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

jest.mock('@/i18n', () => ({ t: (key: string) => key }));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: { white: '#fff', red600: '#dc2626', gray500: '#6b7280' },
  }),
}));

jest.mock('@/styles/tabs/feed.styles', () => ({
  createFeedStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

jest.mock('@/hooks/useAuthGate', () => ({
  useAuthGate: () => ({ gate: <T extends Function>(fn: T) => fn, isAuthenticated: true }),
}));

const mockFetchNextPage = jest.fn();
const mockVoteMutate = jest.fn();
const mockRemoveMutate = jest.fn();
const mockBookmarkMutate = jest.fn();
const mockUnbookmarkMutate = jest.fn();
let mockBookmarkedItems: NewsFeedItem[] = [];
let mockUserVotesData: Record<string, string> = {};
let mockUserBookmarksData: Record<string, true> = {};

jest.mock('@/features/feed', () => ({
  useBookmarkedFeed: () => ({
    allItems: mockBookmarkedItems,
    isLoading: false,
    hasNextPage: false,
    fetchNextPage: mockFetchNextPage,
    isFetchingNextPage: false,
    refetch: jest.fn(),
  }),
  useVoteFeedItem: () => ({ mutate: mockVoteMutate }),
  useRemoveFeedVote: () => ({ mutate: mockRemoveMutate }),
  useUserVotes: () => ({ data: mockUserVotesData, refetch: jest.fn() }),
  useBookmarkFeedItem: () => ({ mutate: mockBookmarkMutate }),
  useUnbookmarkFeedItem: () => ({ mutate: mockUnbookmarkMutate }),
  useUserBookmarks: () => ({ data: mockUserBookmarksData }),
}));

jest.mock('@/hooks/useSmartPagination', () => ({
  useSmartPagination: () => ({
    handleEndReached: jest.fn(),
    onEndReachedThreshold: 0.5,
  }),
}));

jest.mock('@/hooks/useRefresh', () => ({
  useRefresh: () => ({ refreshing: false, onRefresh: jest.fn() }),
}));

jest.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pullDistance: 0,
    isRefreshing: false,
    handleScrollBeginDrag: jest.fn(),
    handlePullScroll: jest.fn(),
    handleScrollEndDrag: jest.fn(),
  }),
}));

jest.mock('@/components/common/SafeAreaCover', () => ({
  SafeAreaCover: () => null,
}));

jest.mock('@/components/common/ScreenHeader', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return function MockScreenHeader({ title }: { title: string }) {
    const mockBack = jest.requireMock('expo-router').useRouter().back;
    return (
      <>
        <Text>{title}</Text>
        <TouchableOpacity onPress={mockBack} accessibilityLabel="Go back">
          <Text>Back</Text>
        </TouchableOpacity>
      </>
    );
  };
});

jest.mock('@/components/common/PullToRefreshIndicator', () => ({
  PullToRefreshIndicator: () => null,
}));

jest.mock('@/components/feed/FeedContentSkeleton', () => ({
  FeedContentSkeleton: () => {
    const { View } = require('react-native');
    return <View testID="feed-content-skeleton" />;
  },
}));

jest.mock('@/components/feed/CommentsBottomSheet', () => ({
  CommentsBottomSheet: ({
    visible,
    feedItemId,
  }: {
    visible: boolean;
    feedItemId: string;
    onClose?: () => void;
  }) => {
    if (!visible) return null;
    const { View, Text } = require('react-native');
    return (
      <View testID="comments-sheet">
        <Text testID="comments-sheet-item-id">{feedItemId}</Text>
      </View>
    );
  },
}));

jest.mock('@/components/feed/FeedCard', () => ({
  FeedCard: ({
    item,
    onPress,
    onUpvote,
    onDownvote,
    onBookmark,
    onComment,
    onShare,
    onEntityPress,
  }: {
    item: NewsFeedItem;
    onPress?: (item: NewsFeedItem) => void;
    onUpvote?: (id: string) => void;
    onDownvote?: (id: string) => void;
    onBookmark?: (id: string) => void;
    onComment?: (id: string) => void;
    onShare?: (id: string) => void;
    onEntityPress?: (type: string, id: string) => void;
    [key: string]: unknown;
  }) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View>
        <Text>{item.title}</Text>
        {onUpvote && (
          <TouchableOpacity
            onPress={() => onUpvote(item.id)}
            accessibilityLabel={`Upvote ${item.title}`}
          >
            <Text>Upvote</Text>
          </TouchableOpacity>
        )}
        {onDownvote && (
          <TouchableOpacity
            onPress={() => onDownvote(item.id)}
            accessibilityLabel={`Downvote ${item.title}`}
          >
            <Text>Downvote</Text>
          </TouchableOpacity>
        )}
        {onBookmark && (
          <TouchableOpacity
            onPress={() => onBookmark(item.id)}
            accessibilityLabel={`Bookmark ${item.title}`}
          >
            <Text>Bookmark</Text>
          </TouchableOpacity>
        )}
        {onComment && (
          <TouchableOpacity
            onPress={() => onComment(item.id)}
            accessibilityLabel={`Comment ${item.title}`}
          >
            <Text>Comment</Text>
          </TouchableOpacity>
        )}
        {onShare && (
          <TouchableOpacity
            onPress={() => onShare(item.id)}
            accessibilityLabel={`Share ${item.title}`}
          >
            <Text>Share</Text>
          </TouchableOpacity>
        )}
        {onPress && (
          <TouchableOpacity onPress={() => onPress(item)} accessibilityLabel={`Open ${item.title}`}>
            <Text>Open</Text>
          </TouchableOpacity>
        )}
        {onEntityPress && (
          <TouchableOpacity
            onPress={() => onEntityPress('movie', item.movie_id ?? item.id)}
            accessibilityLabel={`Entity ${item.title}`}
          >
            <Text>Entity</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  },
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BookmarkedFeedScreen from '../bookmarks';
import type { NewsFeedItem } from '@shared/types';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});
function Wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}
function renderScreen() {
  return render(<BookmarkedFeedScreen />, { wrapper: Wrapper });
}

function makeItem(overrides: Partial<NewsFeedItem> = {}): NewsFeedItem {
  return {
    id: 'item-1',
    feed_type: 'video',
    content_type: 'trailer',
    title: 'Saved Item',
    description: null,
    movie_id: 'movie-1',
    source_table: 'movie_videos',
    source_id: 'src-1',
    thumbnail_url: null,
    youtube_id: null,
    is_pinned: false,
    is_featured: false,
    display_order: 0,
    upvote_count: 3,
    downvote_count: 0,
    view_count: 10,
    comment_count: 0,
    bookmark_count: 1,
    published_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    movie: { id: 'movie-1', title: 'Test Movie', poster_url: null, release_date: null },
    ...overrides,
  };
}

describe('BookmarkedFeedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBookmarkedItems = [makeItem()];
    mockUserVotesData = {};
    mockUserBookmarksData = { 'item-1': true as const };
  });

  it('renders title header', () => {
    renderScreen();
    expect(screen.getByText('bookmarks.title')).toBeTruthy();
  });

  it('renders back button and calls router.back on press', () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('renders feed items', () => {
    renderScreen();
    expect(screen.getByText('Saved Item')).toBeTruthy();
  });

  it('renders skeleton when loading', () => {
    const feedModule = jest.requireMock('@/features/feed');
    const orig = feedModule.useBookmarkedFeed;
    feedModule.useBookmarkedFeed = () => ({
      allItems: [],
      isLoading: true,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      isFetchingNextPage: false,
      refetch: jest.fn(),
    });
    renderScreen();
    expect(screen.getByTestId('feed-content-skeleton')).toBeTruthy();
    feedModule.useBookmarkedFeed = orig;
  });

  it('renders empty state when no bookmarks', () => {
    const feedModule = jest.requireMock('@/features/feed');
    const orig = feedModule.useBookmarkedFeed;
    feedModule.useBookmarkedFeed = () => ({
      allItems: [],
      isLoading: false,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      isFetchingNextPage: false,
      refetch: jest.fn(),
    });
    mockBookmarkedItems = [];
    renderScreen();
    expect(screen.getByText('bookmarks.empty')).toBeTruthy();
    expect(screen.getByText('bookmarks.emptySubtitle')).toBeTruthy();
    feedModule.useBookmarkedFeed = orig;
  });

  it('calls unbookmarkMutation when item is already bookmarked', () => {
    mockUserBookmarksData = { 'item-1': true as const };
    renderScreen();
    fireEvent.press(screen.getByLabelText('Bookmark Saved Item'));
    expect(mockUnbookmarkMutate).toHaveBeenCalledWith({ feedItemId: 'item-1' });
    expect(mockBookmarkMutate).not.toHaveBeenCalled();
  });

  it('calls bookmarkMutation when item is not bookmarked', () => {
    mockUserBookmarksData = {};
    renderScreen();
    fireEvent.press(screen.getByLabelText('Bookmark Saved Item'));
    expect(mockBookmarkMutate).toHaveBeenCalledWith({ feedItemId: 'item-1' });
    expect(mockUnbookmarkMutate).not.toHaveBeenCalled();
  });

  it('calls voteMutation with upvote when no existing vote', () => {
    mockUserVotesData = {};
    renderScreen();
    fireEvent.press(screen.getByLabelText('Upvote Saved Item'));
    expect(mockVoteMutate).toHaveBeenCalledWith({
      feedItemId: 'item-1',
      voteType: 'up',
      previousVote: null,
    });
  });

  it('calls removeMutation when already upvoted', () => {
    mockUserVotesData = { 'item-1': 'up' };
    renderScreen();
    fireEvent.press(screen.getByLabelText('Upvote Saved Item'));
    expect(mockRemoveMutate).toHaveBeenCalledWith({ feedItemId: 'item-1', previousVote: 'up' });
  });

  it('calls voteMutation with downvote when no existing vote', () => {
    mockUserVotesData = {};
    renderScreen();
    fireEvent.press(screen.getByLabelText('Downvote Saved Item'));
    expect(mockVoteMutate).toHaveBeenCalledWith({
      feedItemId: 'item-1',
      voteType: 'down',
      previousVote: null,
    });
  });

  it('calls removeMutation when already downvoted', () => {
    mockUserVotesData = { 'item-1': 'down' };
    renderScreen();
    fireEvent.press(screen.getByLabelText('Downvote Saved Item'));
    expect(mockRemoveMutate).toHaveBeenCalledWith({ feedItemId: 'item-1', previousVote: 'down' });
  });

  it('calls Share.share when share button is pressed', () => {
    const { Share } = require('react-native');
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    renderScreen();
    fireEvent.press(screen.getByLabelText('Share Saved Item'));
    expect(shareSpy).toHaveBeenCalledWith({
      message: 'Saved Item — Check it out on Faniverz!',
    });
    shareSpy.mockRestore();
  });

  it('opens comments sheet when comment button is pressed', () => {
    renderScreen();
    expect(screen.queryByTestId('comments-sheet')).toBeNull();
    fireEvent.press(screen.getByLabelText('Comment Saved Item'));
    expect(screen.getByTestId('comments-sheet')).toBeTruthy();
    expect(screen.getByTestId('comments-sheet-item-id').props.children).toBe('item-1');
  });

  it('navigates to post detail when item is pressed', () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText('Open Saved Item'));
    expect(mockPush).toHaveBeenCalledWith('/post/item-1');
  });

  it('navigates to movie entity when entity is pressed', () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText('Entity Saved Item'));
    expect(mockPush).toHaveBeenCalledWith('/movie/movie-1');
  });

  it('navigates to entity routes for non-movie types', () => {
    const FeedCardModule = jest.requireMock('@/components/feed/FeedCard');
    const origFeedCard = FeedCardModule.FeedCard;
    let capturedOnEntityPress: ((type: string, id: string) => void) | undefined;
    FeedCardModule.FeedCard = (
      props: Record<string, unknown> & { onEntityPress?: (type: string, id: string) => void },
    ) => {
      capturedOnEntityPress = props.onEntityPress;
      return origFeedCard(props);
    };
    renderScreen();
    capturedOnEntityPress?.('actor', 'a1');
    expect(mockPush).toHaveBeenCalledWith('/actor/a1');
    mockPush.mockClear();
    capturedOnEntityPress?.('production_house', 'ph1');
    expect(mockPush).toHaveBeenCalledWith('/production-house/ph1');
    mockPush.mockClear();
    capturedOnEntityPress?.('user', 'u2');
    expect(mockPush).toHaveBeenCalledWith('/user/u2');
    FeedCardModule.FeedCard = origFeedCard;
  });

  it('renders multiple items', () => {
    mockBookmarkedItems = [
      makeItem({ id: 'item-1', title: 'First Saved' }),
      makeItem({ id: 'item-2', title: 'Second Saved' }),
    ];
    renderScreen();
    expect(screen.getByText('First Saved')).toBeTruthy();
    expect(screen.getByText('Second Saved')).toBeTruthy();
  });
});
