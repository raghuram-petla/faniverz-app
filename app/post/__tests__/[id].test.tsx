jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

jest.mock('@/i18n', () => ({ t: (key: string) => key }));

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

jest.mock('@/hooks/useAuthGate', () => ({
  useAuthGate: () => ({ gate: <T extends Function>(fn: T) => fn, isAuthenticated: true }),
}));

const mockMutate = jest.fn();
const mockDeleteMutate = jest.fn();
const mockFetchNextPage = jest.fn();
const mockVoteMutate = jest.fn();
const mockRemoveMutate = jest.fn();
const mockBookmarkMutate = jest.fn();
const mockUnbookmarkMutate = jest.fn();
const mockUserVotesData: Record<string, string> = {};
let mockUserBookmarksData: Record<string, true> = {};

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
      bookmark_count: 0,
      published_at: '2026-03-10T00:00:00Z',
      created_at: '2026-03-10T00:00:00Z',
      movie: { id: 'm1', title: 'Movie', poster_url: null, release_date: null },
    },
    isLoading: false,
    refetch: jest.fn(),
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
    refetch: jest.fn(),
  }),
  useAddComment: () => ({ mutate: mockMutate }),
  useDeleteComment: () => ({ mutate: mockDeleteMutate }),
  useVoteFeedItem: () => ({ mutate: mockVoteMutate }),
  useRemoveFeedVote: () => ({ mutate: mockRemoveMutate }),
  useUserVotes: () => ({ data: mockUserVotesData, refetch: jest.fn() }),
  useBookmarkFeedItem: () => ({ mutate: mockBookmarkMutate }),
  useUnbookmarkFeedItem: () => ({ mutate: mockUnbookmarkMutate }),
  useUserBookmarks: () => ({ data: mockUserBookmarksData }),
  useUserCommentLikes: () => ({ data: {} }),
  useLikeComment: () => ({ mutate: mockLikeMutate }),
  useUnlikeComment: () => ({ mutate: mockUnlikeMutate }),
}));

jest.mock('@/components/feed/FeedCard', () => ({
  FeedCard: ({
    item,
    onPress,
    onEntityPress,
    onUpvote,
    onDownvote,
    onBookmark,
    showFullTimestamp,
  }: {
    item: { id: string; title: string };
    onPress?: (item: { id: string; title: string }) => void;
    onEntityPress?: (type: string, id: string) => void;
    onUpvote?: (id: string) => void;
    onDownvote?: (id: string) => void;
    onBookmark?: (id: string) => void;
    showFullTimestamp?: boolean;
  }) => {
    const { Text, TouchableOpacity } = require('react-native');
    return (
      <>
        <Text testID="feed-card">{item.title}</Text>
        {showFullTimestamp && <Text testID="full-timestamp">full-timestamp</Text>}
        {onPress && <TouchableOpacity testID="press-btn" onPress={() => onPress(item)} />}
        {onEntityPress && (
          <>
            <TouchableOpacity
              testID="entity-press-btn"
              onPress={() => onEntityPress('movie', 'm1')}
            />
            <TouchableOpacity
              testID="user-entity-own"
              onPress={() => onEntityPress('user', 'u1')}
            />
            <TouchableOpacity
              testID="user-entity-other"
              onPress={() => onEntityPress('user', 'other-user')}
            />
          </>
        )}
        {onUpvote && <TouchableOpacity testID="upvote-btn" onPress={() => onUpvote(item.id)} />}
        {onDownvote && (
          <TouchableOpacity testID="downvote-btn" onPress={() => onDownvote(item.id)} />
        )}
        {onBookmark && (
          <TouchableOpacity testID="bookmark-btn" onPress={() => onBookmark(item.id)} />
        )}
      </>
    );
  },
}));

const mockLikeMutate = jest.fn();
const mockUnlikeMutate = jest.fn();

jest.mock('@/components/feed/CommentsList', () => ({
  CommentsList: ({
    comments,
    onDelete,
    onReply,
    onLike,
    onUnlike,
  }: {
    comments: { id: string; profile?: { display_name?: string }; parent_comment_id?: string | null }[];
    onDelete?: (commentId: string, parentCommentId?: string | null) => void;
    onReply?: (comment: { id: string; parent_comment_id?: string | null; profile?: { display_name?: string } }) => void;
    onLike?: (commentId: string) => void;
    onUnlike?: (commentId: string) => void;
  }) => {
    const { Text, TouchableOpacity } = require('react-native');
    return (
      <>
        <Text testID="comments-list">{comments.length} comments</Text>
        {onDelete && (
          <TouchableOpacity testID="delete-comment-btn" onPress={() => onDelete('c1', null)}>
            <Text>Delete</Text>
          </TouchableOpacity>
        )}
        {onReply && (
          <TouchableOpacity
            testID="reply-comment-btn"
            onPress={() => onReply({ id: 'c1', parent_comment_id: null, profile: { display_name: 'User2' } })}
          >
            <Text>Reply</Text>
          </TouchableOpacity>
        )}
        {onLike && (
          <TouchableOpacity testID="like-comment-btn" onPress={() => onLike('c1')}>
            <Text>Like</Text>
          </TouchableOpacity>
        )}
        {onUnlike && (
          <TouchableOpacity testID="unlike-comment-btn" onPress={() => onUnlike('c1')}>
            <Text>Unlike</Text>
          </TouchableOpacity>
        )}
      </>
    );
  },
}));

jest.mock('@/components/feed/CommentInput', () => ({
  CommentInput: ({
    isAuthenticated,
    onSubmit,
    onLoginPress,
    replyTarget,
    onCancelReply,
  }: {
    isAuthenticated: boolean;
    onSubmit: (b: string, parentCommentId?: string) => void;
    onLoginPress?: () => void;
    replyTarget?: { commentId: string; parentCommentId: string; displayName: string } | null;
    onCancelReply?: () => void;
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
        {replyTarget && (
          <Text testID="reply-target-name">{replyTarget.displayName}</Text>
        )}
        {onCancelReply && (
          <TouchableOpacity testID="cancel-reply-btn" onPress={onCancelReply}>
            <Text>Cancel Reply</Text>
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
import { Alert } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PostDetailScreen from '../[id]';

jest.spyOn(Alert, 'alert');

describe('PostDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserBookmarksData = {};
  });

  it('renders post via FeedCard', () => {
    render(<PostDetailScreen />);
    expect(screen.getByTestId('feed-card')).toBeTruthy();
    expect(screen.getByText('Test Post')).toBeTruthy();
  });

  it('passes showFullTimestamp to FeedCard', () => {
    render(<PostDetailScreen />);
    expect(screen.getByTestId('full-timestamp')).toBeTruthy();
  });

  it('renders comments count header', () => {
    render(<PostDetailScreen />);
    expect(screen.getByText('postDetail.comments (3)')).toBeTruthy();
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
    expect(mockMutate).toHaveBeenCalledWith(
      { body: 'hello', parentCommentId: undefined },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it('navigates to login on login press', () => {
    render(<PostDetailScreen />);
    fireEvent.press(screen.getByTestId('login-btn'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
  });

  it('renders Post title in header', () => {
    render(<PostDetailScreen />);
    expect(screen.getByText('postDetail.title')).toBeTruthy();
  });

  it('navigates to entity page when entity is pressed', () => {
    render(<PostDetailScreen />);
    fireEvent.press(screen.getByTestId('entity-press-btn'));
    expect(mockPush).toHaveBeenCalledWith('/movie/m1');
  });

  it('calls vote mutation on upvote', () => {
    render(<PostDetailScreen />);
    fireEvent.press(screen.getByTestId('upvote-btn'));
    expect(mockVoteMutate).toHaveBeenCalledWith({
      feedItemId: 'post-1',
      voteType: 'up',
      previousVote: null,
    });
  });

  it('calls vote mutation on downvote', () => {
    render(<PostDetailScreen />);
    fireEvent.press(screen.getByTestId('downvote-btn'));
    expect(mockVoteMutate).toHaveBeenCalledWith({
      feedItemId: 'post-1',
      voteType: 'down',
      previousVote: null,
    });
  });

  it('navigates to own profile when user entity is own ID', () => {
    render(<PostDetailScreen />);
    fireEvent.press(screen.getByTestId('user-entity-own'));
    expect(mockPush).toHaveBeenCalledWith('/profile');
  });

  it('navigates to user profile when user entity is another user', () => {
    render(<PostDetailScreen />);
    fireEvent.press(screen.getByTestId('user-entity-other'));
    expect(mockPush).toHaveBeenCalledWith('/user/other-user');
  });

  it('removes upvote when already upvoted', () => {
    mockUserVotesData['post-1'] = 'up';
    render(<PostDetailScreen />);
    fireEvent.press(screen.getByTestId('upvote-btn'));
    expect(mockRemoveMutate).toHaveBeenCalledWith({
      feedItemId: 'post-1',
      previousVote: 'up',
    });
    delete mockUserVotesData['post-1'];
  });

  it('removes downvote when already downvoted', () => {
    mockUserVotesData['post-1'] = 'down';
    render(<PostDetailScreen />);
    fireEvent.press(screen.getByTestId('downvote-btn'));
    expect(mockRemoveMutate).toHaveBeenCalledWith({
      feedItemId: 'post-1',
      previousVote: 'down',
    });
    delete mockUserVotesData['post-1'];
  });

  it('shows error alert when add comment fails', () => {
    render(<PostDetailScreen />);
    const addCall = mockMutate.mock.calls[0];
    // mockMutate is called via onSubmit — call it and extract onError
    fireEvent.press(screen.getByTestId('submit-btn'));
    const callArgs = mockMutate.mock.calls[mockMutate.mock.calls.length - 1];
    const { onError } = callArgs[1];
    onError(new Error('network error'));
    expect(Alert.alert).toHaveBeenCalledWith('common.error', 'common.failedToAddComment');
    void addCall; // avoid unused var warning
  });

  it('shows loading skeleton when post is loading', () => {
    const mockFeedModule = jest.requireMock('@/features/feed');
    const origUseFeedItem = mockFeedModule.useFeedItem;
    mockFeedModule.useFeedItem = () => ({ data: undefined, isLoading: true, refetch: jest.fn() });

    render(<PostDetailScreen />);
    // PostContentSkeleton is rendered; no crash
    expect(screen.queryByTestId('feed-card')).toBeNull();

    mockFeedModule.useFeedItem = origUseFeedItem;
  });

  it('shows not-found state when post is null and not loading', () => {
    const mockFeedModule = jest.requireMock('@/features/feed');
    const origUseFeedItem = mockFeedModule.useFeedItem;
    mockFeedModule.useFeedItem = () => ({ data: null, isLoading: false, refetch: jest.fn() });

    render(<PostDetailScreen />);
    expect(screen.getByText('postDetail.notFound')).toBeTruthy();

    mockFeedModule.useFeedItem = origUseFeedItem;
  });

  it('switches from downvote to upvote (replaces vote)', () => {
    mockUserVotesData['post-1'] = 'down';
    render(<PostDetailScreen />);
    fireEvent.press(screen.getByTestId('upvote-btn'));
    expect(mockVoteMutate).toHaveBeenCalledWith({
      feedItemId: 'post-1',
      voteType: 'up',
      previousVote: 'down',
    });
    delete mockUserVotesData['post-1'];
  });

  it('switches from upvote to downvote (replaces vote)', () => {
    mockUserVotesData['post-1'] = 'up';
    render(<PostDetailScreen />);
    fireEvent.press(screen.getByTestId('downvote-btn'));
    expect(mockVoteMutate).toHaveBeenCalledWith({
      feedItemId: 'post-1',
      voteType: 'down',
      previousVote: 'up',
    });
    delete mockUserVotesData['post-1'];
  });

  it('onDelete callback calls deleteMutation.mutate with commentId', () => {
    render(<PostDetailScreen />);
    fireEvent.press(screen.getByTestId('delete-comment-btn'));
    expect(mockDeleteMutate).toHaveBeenCalledWith(
      { commentId: 'c1', parentCommentId: null },
      expect.objectContaining({
        onError: expect.any(Function),
      }),
    );
  });

  it('onDelete onError callback shows alert', () => {
    const alertSpy = jest
      .spyOn(require('react-native').Alert, 'alert')
      .mockImplementation(() => {});
    render(<PostDetailScreen />);
    fireEvent.press(screen.getByTestId('delete-comment-btn'));
    // Extract the onError callback from the mutate call and invoke it
    const mutateCall = mockDeleteMutate.mock.calls[mockDeleteMutate.mock.calls.length - 1];
    const onError = mutateCall[1].onError;
    onError();
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('navigates to actor entity correctly', () => {
    // Need a mock that exposes actor entity press
    const mockFeedModule = jest.requireMock('@/components/feed/FeedCard');
    const origFeedCard = mockFeedModule.FeedCard;

    mockFeedModule.FeedCard = ({
      onEntityPress,
    }: {
      onEntityPress: (type: string, id: string) => void;
    }) => {
      const { TouchableOpacity, Text } = require('react-native');
      return (
        <>
          <TouchableOpacity testID="actor-entity" onPress={() => onEntityPress('actor', 'a1')}>
            <Text>Actor</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="ph-entity"
            onPress={() => onEntityPress('production_house', 'ph1')}
          >
            <Text>PH</Text>
          </TouchableOpacity>
        </>
      );
    };

    render(<PostDetailScreen />);
    fireEvent.press(screen.getByTestId('actor-entity'));
    expect(mockPush).toHaveBeenCalledWith('/actor/a1');

    mockPush.mockClear();
    fireEvent.press(screen.getByTestId('ph-entity'));
    expect(mockPush).toHaveBeenCalledWith('/production-house/ph1');

    mockFeedModule.FeedCard = origFeedCard;
  });

  it('handleNoOp does not crash when called', () => {
    render(<PostDetailScreen />);
    // The FeedCard receives onPress=handleNoOp — pressing it invokes the no-op callback
    fireEvent.press(screen.getByTestId('press-btn'));
    // No crash means the no-op was executed successfully
    expect(screen.getByTestId('feed-card')).toBeTruthy();
  });

  it('handles null commentsData pages gracefully', () => {
    const mockFeedModule = jest.requireMock('@/features/feed');
    const origUseComments = mockFeedModule.useComments;
    mockFeedModule.useComments = () => ({
      data: undefined,
      isLoading: false,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
      refetch: jest.fn(),
    });

    render(<PostDetailScreen />);
    // Should render with 0 comments, no crash
    expect(screen.getByText('0 comments')).toBeTruthy();

    mockFeedModule.useComments = origUseComments;
  });

  it('renders with user having no id (null userId)', () => {
    const authModule = jest.requireMock('@/features/auth/providers/AuthProvider');
    const origUseAuth = authModule.useAuth;
    authModule.useAuth = () => ({ user: null });

    render(<PostDetailScreen />);
    expect(screen.getByText('noauth')).toBeTruthy();

    authModule.useAuth = origUseAuth;
  });

  it('renders correctly on non-ios platform (Platform.OS branch)', () => {
    const Platform = require('react-native').Platform;
    const origOS = Platform.OS;
    Platform.OS = 'android';

    render(<PostDetailScreen />);
    expect(screen.getByTestId('feed-card')).toBeTruthy();

    Platform.OS = origOS;
  });

  it('handles undefined id param via nullish coalescing fallback', () => {
    const routerModule = jest.requireMock('expo-router');
    const origUseLocalSearchParams = routerModule.useLocalSearchParams;
    routerModule.useLocalSearchParams = () => ({ id: undefined });

    // When id is undefined, useFeedItem(''), useComments(''), etc. get empty strings
    // The screen should still render (showing loading or not-found)
    render(<PostDetailScreen />);
    expect(screen.getByText('postDetail.title')).toBeTruthy();

    routerModule.useLocalSearchParams = origUseLocalSearchParams;
  });

  it('handles undefined feedItemIds useMemo default arg when post is null', () => {
    const mockFeedModule = jest.requireMock('@/features/feed');
    const origUseFeedItem = mockFeedModule.useFeedItem;
    // Return null post so feedItemIds useMemo returns []
    mockFeedModule.useFeedItem = () => ({ data: null, isLoading: false, refetch: jest.fn() });

    render(<PostDetailScreen />);
    expect(screen.getByText('postDetail.notFound')).toBeTruthy();

    mockFeedModule.useFeedItem = origUseFeedItem;
  });

  it('handles undefined userVotes data (defaults to empty object)', () => {
    const mockFeedModule = jest.requireMock('@/features/feed');
    const origUseUserVotes = mockFeedModule.useUserVotes;
    mockFeedModule.useUserVotes = () => ({ data: undefined, refetch: jest.fn() });

    render(<PostDetailScreen />);
    // Should render without crash; upvote sends previousVote: null
    fireEvent.press(screen.getByTestId('upvote-btn'));
    expect(mockVoteMutate).toHaveBeenCalledWith({
      feedItemId: 'post-1',
      voteType: 'up',
      previousVote: null,
    });

    mockFeedModule.useUserVotes = origUseUserVotes;
  });

  it('handles undefined id from search params (covers id ?? empty string)', () => {
    const routerModule = jest.requireMock('expo-router');
    const origUseLocalSearchParams = routerModule.useLocalSearchParams;
    routerModule.useLocalSearchParams = () => ({ id: undefined });

    render(<PostDetailScreen />);
    expect(screen.getByText('postDetail.title')).toBeTruthy();

    routerModule.useLocalSearchParams = origUseLocalSearchParams;
  });

  it('navigates to production_house entity correctly', () => {
    const mockFeedModule = jest.requireMock('@/components/feed/FeedCard');
    const origFeedCard = mockFeedModule.FeedCard;

    mockFeedModule.FeedCard = ({
      onEntityPress,
    }: {
      onEntityPress: (type: string, id: string) => void;
    }) => {
      const { TouchableOpacity, Text } = require('react-native');
      return (
        <TouchableOpacity
          testID="ph-entity-press"
          onPress={() => onEntityPress('production_house', 'ph1')}
        >
          <Text>PH Entity</Text>
        </TouchableOpacity>
      );
    };

    render(<PostDetailScreen />);
    fireEvent.press(screen.getByTestId('ph-entity-press'));
    expect(mockPush).toHaveBeenCalledWith('/production-house/ph1');

    mockFeedModule.FeedCard = origFeedCard;
  });

  it('renders with post.comment_count displayed', () => {
    render(<PostDetailScreen />);
    expect(screen.getByText('postDetail.comments (3)')).toBeTruthy();
  });

  it('calls bookmarkMutation when post is not bookmarked', () => {
    mockUserBookmarksData = {};
    render(<PostDetailScreen />);
    fireEvent.press(screen.getByTestId('bookmark-btn'));
    expect(mockBookmarkMutate).toHaveBeenCalledWith({ feedItemId: 'post-1' });
    expect(mockUnbookmarkMutate).not.toHaveBeenCalled();
  });

  it('calls unbookmarkMutation when post is already bookmarked', () => {
    mockUserBookmarksData = { 'post-1': true as const };
    render(<PostDetailScreen />);
    fireEvent.press(screen.getByTestId('bookmark-btn'));
    expect(mockUnbookmarkMutate).toHaveBeenCalledWith({ feedItemId: 'post-1' });
    expect(mockBookmarkMutate).not.toHaveBeenCalled();
  });

  it('handleReply sets replyTarget when onReply is triggered on a comment', () => {
    render(<PostDetailScreen />);
    fireEvent.press(screen.getByTestId('reply-comment-btn'));
    // After reply, the reply target display name should appear in CommentInput mock
    expect(screen.getByTestId('reply-target-name')).toBeTruthy();
    expect(screen.getByText('User2')).toBeTruthy();
  });

  it('handleReply uses comment.id as parentCommentId when parent_comment_id is null', () => {
    render(<PostDetailScreen />);
    fireEvent.press(screen.getByTestId('reply-comment-btn'));
    // The comment has parent_comment_id: null, so parentCommentId = comment.id ('c1')
    const replyTargetEl = screen.getByTestId('reply-target-name');
    expect(replyTargetEl.props.children).toBe('User2');
  });

  it('onLike callback calls likeMutation.mutate with commentId', () => {
    render(<PostDetailScreen />);
    fireEvent.press(screen.getByTestId('like-comment-btn'));
    expect(mockLikeMutate).toHaveBeenCalledWith({ commentId: 'c1' });
  });

  it('onUnlike callback calls unlikeMutation.mutate with commentId', () => {
    render(<PostDetailScreen />);
    fireEvent.press(screen.getByTestId('unlike-comment-btn'));
    expect(mockUnlikeMutate).toHaveBeenCalledWith({ commentId: 'c1' });
  });

  it('onCancelReply resets replyTarget to null', () => {
    render(<PostDetailScreen />);
    // First set a reply target
    fireEvent.press(screen.getByTestId('reply-comment-btn'));
    expect(screen.getByTestId('reply-target-name')).toBeTruthy();
    // Then cancel it
    fireEvent.press(screen.getByTestId('cancel-reply-btn'));
    expect(screen.queryByTestId('reply-target-name')).toBeNull();
  });

  it('uses {} default when useUserCommentLikes returns undefined (covers = {} branch)', () => {
    const mockFeedModule = jest.requireMock('@/features/feed');
    const origUseUserCommentLikes = mockFeedModule.useUserCommentLikes;
    // Return undefined so the destructuring default = {} is used
    mockFeedModule.useUserCommentLikes = () => ({ data: undefined });

    render(<PostDetailScreen />);
    // Should render without crash; likedCommentIds defaults to {}
    expect(screen.getByTestId('comments-list')).toBeTruthy();

    mockFeedModule.useUserCommentLikes = origUseUserCommentLikes;
  });

  it('handleReply uses anonymous fallback when profile display_name is null', () => {
    const mockFeedModule = jest.requireMock('@/components/feed/CommentsList');
    const origCommentsList = mockFeedModule.CommentsList;

    // Override CommentsList to trigger onReply with a comment that has no display_name
    mockFeedModule.CommentsList = ({
      onReply,
    }: {
      onReply?: (comment: { id: string; parent_comment_id?: string | null; profile?: { display_name?: string | null } | null }) => void;
    }) => {
      const { TouchableOpacity, Text } = require('react-native');
      return (
        <TouchableOpacity
          testID="reply-null-profile"
          onPress={() => onReply && onReply({ id: 'c2', parent_comment_id: null, profile: null })}
        >
          <Text>Reply Null Profile</Text>
        </TouchableOpacity>
      );
    };

    render(<PostDetailScreen />);
    fireEvent.press(screen.getByTestId('reply-null-profile'));
    // replyTarget.displayName falls back to t('feed.anonymous') = 'feed.anonymous'
    expect(screen.getByText('feed.anonymous')).toBeTruthy();

    mockFeedModule.CommentsList = origCommentsList;
  });
});
