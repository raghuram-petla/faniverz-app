jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: { white: '#fff', red600: '#dc2626', gray500: '#6b7280' },
  }),
}));

jest.mock('@/styles/tabs/feed.styles', () => ({
  createFeedStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@/features/feed', () => ({
  useNewsFeed: jest.fn(),
  useVoteFeedItem: jest.fn(),
  useRemoveFeedVote: jest.fn(),
  useUserVotes: jest.fn(),
  useEntityFollows: jest.fn(() => ({ followSet: new Set(), data: [], isSuccess: true })),
  useFollowEntity: jest.fn(() => ({ mutate: jest.fn() })),
  useUnfollowEntity: jest.fn(() => ({ mutate: jest.fn() })),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/hooks/useAuthGate', () => ({
  useAuthGate: () => ({ gate: <T extends Function>(fn: T) => fn, isAuthenticated: true }),
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'current-user-id' } }),
}));

jest.mock('@/stores/useFeedStore', () => ({
  useFeedStore: jest.fn(),
}));

jest.mock('@/components/feed/FeedCard', () => ({
  FeedCard: ({ item, onUpvote, onDownvote }: any) => {
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
      </View>
    );
  },
}));

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import FeedScreen from '../feed';
import { useNewsFeed, useVoteFeedItem, useRemoveFeedVote, useUserVotes } from '@/features/feed';
import { useFeedStore } from '@/stores/useFeedStore';

const mockSetFilter = jest.fn();
const mockVoteMutate = jest.fn();
const mockRemoveMutate = jest.fn();
const mockUseNewsFeed = useNewsFeed as jest.MockedFunction<typeof useNewsFeed>;
const mockUseVoteFeedItem = useVoteFeedItem as jest.MockedFunction<typeof useVoteFeedItem>;
const mockUseRemoveFeedVote = useRemoveFeedVote as jest.MockedFunction<typeof useRemoveFeedVote>;
const mockUseUserVotes = useUserVotes as jest.MockedFunction<typeof useUserVotes>;
const mockUseFeedStore = useFeedStore as jest.MockedFunction<typeof useFeedStore>;

const mockItem = {
  id: '1',
  feed_type: 'video' as const,
  content_type: 'trailer',
  title: 'Test Trailer',
  description: null,
  movie_id: null,
  source_table: null,
  source_id: null,
  thumbnail_url: null,
  youtube_id: 'abc',
  duration: null,
  is_pinned: false,
  is_featured: false,
  display_order: 0,
  upvote_count: 0,
  downvote_count: 0,
  view_count: 0,
  comment_count: 0,
  published_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
};

function setupMocks(overrides: any = {}) {
  mockUseFeedStore.mockReturnValue({
    filter: 'all',
    setFilter: mockSetFilter,
    ...overrides.store,
  });
  mockUseNewsFeed.mockReturnValue({
    data: { pages: [[mockItem]], pageParams: [0] },
    isLoading: false,
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    isFetchingNextPage: false,
    ...overrides.feed,
  } as any);
  mockUseVoteFeedItem.mockReturnValue({ mutate: mockVoteMutate } as any);
  mockUseRemoveFeedVote.mockReturnValue({ mutate: mockRemoveMutate } as any);
  mockUseUserVotes.mockReturnValue({ data: overrides.votes ?? {} } as any);
}

describe('FeedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  it('renders header with News Feed title', () => {
    const { getByText } = render(<FeedScreen />);
    expect(getByText('News Feed')).toBeTruthy();
  });

  it('renders filter pills', () => {
    const { getByText } = render(<FeedScreen />);
    expect(getByText('All')).toBeTruthy();
    expect(getByText('Trailers')).toBeTruthy();
    expect(getByText('Songs')).toBeTruthy();
    expect(getByText('Posters')).toBeTruthy();
    expect(getByText('BTS')).toBeTruthy();
    expect(getByText('Surprise')).toBeTruthy();
  });

  it('renders feed items', () => {
    const { getByText } = render(<FeedScreen />);
    expect(getByText('Test Trailer')).toBeTruthy();
  });

  it('shows loading state', () => {
    setupMocks({ feed: { data: undefined, isLoading: true } });
    render(<FeedScreen />);
  });

  it('shows empty state when no items', () => {
    setupMocks({ feed: { data: { pages: [[]], pageParams: [0] }, isLoading: false } });
    const { getByText } = render(<FeedScreen />);
    expect(getByText('No updates yet')).toBeTruthy();
  });

  it('calls setFilter when pill pressed', () => {
    const { getByLabelText } = render(<FeedScreen />);
    fireEvent.press(getByLabelText('Filter by Trailers'));
    expect(mockSetFilter).toHaveBeenCalledWith('trailers');
  });

  it('upvote triggers vote mutation when no existing vote', () => {
    setupMocks({ votes: {} });
    render(<FeedScreen />);
    fireEvent.press(screen.getByLabelText('Upvote Test Trailer'));
    expect(mockVoteMutate).toHaveBeenCalledWith({
      feedItemId: '1',
      voteType: 'up',
      previousVote: null,
    });
  });

  it('upvote triggers remove mutation when already upvoted', () => {
    setupMocks({ votes: { '1': 'up' } });
    render(<FeedScreen />);
    fireEvent.press(screen.getByLabelText('Upvote Test Trailer'));
    expect(mockRemoveMutate).toHaveBeenCalledWith({
      feedItemId: '1',
      previousVote: 'up',
    });
  });

  it('downvote triggers vote mutation when no existing vote', () => {
    setupMocks({ votes: {} });
    render(<FeedScreen />);
    fireEvent.press(screen.getByLabelText('Downvote Test Trailer'));
    expect(mockVoteMutate).toHaveBeenCalledWith({
      feedItemId: '1',
      voteType: 'down',
      previousVote: null,
    });
  });

  it('downvote triggers remove mutation when already downvoted', () => {
    setupMocks({ votes: { '1': 'down' } });
    render(<FeedScreen />);
    fireEvent.press(screen.getByLabelText('Downvote Test Trailer'));
    expect(mockRemoveMutate).toHaveBeenCalledWith({
      feedItemId: '1',
      previousVote: 'down',
    });
  });
});
