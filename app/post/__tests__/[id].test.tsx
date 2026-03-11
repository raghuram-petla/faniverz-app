const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'post-1' }),
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34 }),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: { white: '#fff', red600: '#dc2626', gray500: '#6b7280' },
  }),
}));

jest.mock('@/styles/postDetail.styles', () => ({
  createPostDetailStyles: () => new Proxy({}, { get: () => ({}) }),
}));

const mockUser = { id: 'u1' };
jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockMutate = jest.fn();
const mockDeleteMutate = jest.fn();
const mockFetchNextPage = jest.fn();

jest.mock('@/features/feed', () => ({
  useFeedItem: () => ({
    data: {
      id: 'post-1',
      title: 'Test Post',
      feed_type: 'video',
      content_type: 'trailer',
      comment_count: 3,
      description: null,
      movie_id: 'm1',
      source_table: null,
      source_id: null,
      thumbnail_url: null,
      youtube_id: null,
      duration: null,
      is_pinned: false,
      is_featured: false,
      display_order: 0,
      upvote_count: 5,
      downvote_count: 1,
      view_count: 100,
      published_at: '2026-03-10T00:00:00Z',
      created_at: '2026-03-10T00:00:00Z',
      movie: { id: 'm1', title: 'Movie', poster_url: null, release_date: null },
    },
    isLoading: false,
  }),
  useComments: () => ({
    data: {
      pages: [
        [
          {
            id: 'c1',
            feed_item_id: 'post-1',
            user_id: 'u2',
            body: 'Nice!',
            created_at: '2026-03-10T12:00:00Z',
            profile: { display_name: 'User2' },
          },
        ],
      ],
    },
    isLoading: false,
    hasNextPage: false,
    fetchNextPage: mockFetchNextPage,
  }),
  useAddComment: () => ({ mutate: mockMutate }),
  useDeleteComment: () => ({ mutate: mockDeleteMutate }),
}));

jest.mock('@/components/feed/FeedCard', () => ({
  FeedCard: ({
    item,
    onEntityPress,
  }: {
    item: { title: string };
    onEntityPress?: (type: string, id: string) => void;
  }) => {
    const { Text, TouchableOpacity } = require('react-native');
    return (
      <>
        <Text testID="feed-card">{item.title}</Text>
        {onEntityPress && (
          <TouchableOpacity
            testID="entity-press-btn"
            onPress={() => onEntityPress('movie', 'm1')}
          />
        )}
      </>
    );
  },
}));

jest.mock('@/components/feed/CommentsList', () => ({
  CommentsList: ({ comments }: { comments: { id: string }[] }) => {
    const { Text } = require('react-native');
    return <Text testID="comments-list">{comments.length} comments</Text>;
  },
}));

jest.mock('@/components/feed/CommentInput', () => ({
  CommentInput: ({
    isAuthenticated,
    onSubmit,
    onLoginPress,
  }: {
    isAuthenticated: boolean;
    onSubmit: (b: string) => void;
    onLoginPress?: () => void;
  }) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <>
        <Text testID="auth-status">{isAuthenticated ? 'auth' : 'noauth'}</Text>
        <TouchableOpacity testID="submit-btn" onPress={() => onSubmit('hello')}>
          <Text>Submit</Text>
        </TouchableOpacity>
        {onLoginPress && (
          <TouchableOpacity testID="login-btn" onPress={onLoginPress}>
            <Text>Login</Text>
          </TouchableOpacity>
        )}
      </>
    );
  },
}));

jest.mock('@/components/common/SafeAreaCover', () => ({
  SafeAreaCover: () => null,
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PostDetailScreen from '../[id]';

describe('PostDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders post via FeedCard', () => {
    render(<PostDetailScreen />);
    expect(screen.getByTestId('feed-card')).toBeTruthy();
    expect(screen.getByText('Test Post')).toBeTruthy();
  });

  it('renders comments count header', () => {
    render(<PostDetailScreen />);
    expect(screen.getByText('Comments (3)')).toBeTruthy();
  });

  it('renders comments list', () => {
    render(<PostDetailScreen />);
    expect(screen.getByTestId('comments-list')).toBeTruthy();
    expect(screen.getByText('1 comments')).toBeTruthy();
  });

  it('shows auth status as authenticated', () => {
    render(<PostDetailScreen />);
    expect(screen.getByText('auth')).toBeTruthy();
  });

  it('calls router.back on back button press', () => {
    render(<PostDetailScreen />);
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('calls addComment mutation on submit', () => {
    render(<PostDetailScreen />);
    fireEvent.press(screen.getByTestId('submit-btn'));
    expect(mockMutate).toHaveBeenCalledWith('hello');
  });

  it('navigates to login on login press', () => {
    render(<PostDetailScreen />);
    fireEvent.press(screen.getByTestId('login-btn'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
  });

  it('renders Post title in header', () => {
    render(<PostDetailScreen />);
    expect(screen.getByText('Post')).toBeTruthy();
  });

  it('navigates to entity page when entity is pressed', () => {
    render(<PostDetailScreen />);
    fireEvent.press(screen.getByTestId('entity-press-btn'));
    expect(mockPush).toHaveBeenCalledWith('/movie/m1');
  });
});
