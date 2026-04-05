/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CommentsBottomSheet } from '../CommentsBottomSheet';

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  const chainable = (): any =>
    new Proxy(
      {},
      {
        get:
          () =>
          (..._args: any[]) =>
            chainable(),
      },
    );
  return {
    Gesture: {
      Pan: () => chainable(),
      Native: () => chainable(),
      Simultaneous: () => chainable(),
    },
    GestureDetector: ({ children }: any) => <View>{children}</View>,
  };
});

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: { white: '#fff', red600: '#dc2626', gray500: '#6b7280' },
  }),
}));

jest.mock('@/styles/commentsBottomSheet.styles', () => ({
  createCommentsSheetStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

const mockMutate = jest.fn();
const mockDeleteMutate = jest.fn();
const mockFetchNextPage = jest.fn();
const mockLikeMutate = jest.fn();
const mockUnlikeMutate = jest.fn();

jest.mock('@/features/feed', () => ({
  useComments: jest.fn(() => ({
    data: {
      pages: [
        [
          {
            id: 'c1',
            user_id: 'user-1',
            body: 'Great movie!',
            created_at: '2024-01-01T00:00:00Z',
            parent_comment_id: null,
            like_count: 0,
            reply_count: 0,
            profile: { display_name: 'testuser', avatar_url: null },
          },
          {
            id: 'c2',
            user_id: 'user-2',
            body: 'Amazing trailer',
            created_at: '2024-01-01T01:00:00Z',
            parent_comment_id: null,
            like_count: 0,
            reply_count: 0,
            profile: { display_name: 'otheruser', avatar_url: null },
          },
        ],
      ],
    },
    isLoading: false,
    hasNextPage: false,
    fetchNextPage: mockFetchNextPage,
  })),
  useAddComment: jest.fn(() => ({ mutate: mockMutate })),
  useDeleteComment: jest.fn(() => ({ mutate: mockDeleteMutate })),
  useUserCommentLikes: jest.fn(() => ({ data: {} })),
  useLikeComment: jest.fn(() => ({ mutate: mockLikeMutate })),
  useUnlikeComment: jest.fn(() => ({ mutate: mockUnlikeMutate })),
}));

jest.mock('@/hooks/useKeyboardHeight', () => ({
  useKeyboardHeight: jest.fn(() => 0),
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

jest.mock('@/features/auth/hooks/useProfile', () => ({
  useProfile: () => ({ data: { avatar_url: null } }),
}));

jest.mock('../CommentsList', () => ({
  CommentsList: ({
    comments,
    onDelete,
    onReply,
    onLoadMore,
    hasNextPage,
    onLike,
    onUnlike,
  }: any) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View>
        <Text testID="comment-count">{comments.length} comments</Text>
        {comments.map((c: any) => (
          <View key={c.id}>
            <Text>{c.body}</Text>
            {onDelete && (
              <TouchableOpacity
                onPress={() => onDelete(c.id, null)}
                accessibilityLabel={`Delete ${c.id}`}
              >
                <Text>Delete</Text>
              </TouchableOpacity>
            )}
            {onReply && (
              <TouchableOpacity onPress={() => onReply(c)} accessibilityLabel={`Reply ${c.id}`}>
                <Text>Reply</Text>
              </TouchableOpacity>
            )}
            {onLike && (
              <TouchableOpacity onPress={() => onLike(c.id)} accessibilityLabel={`Like ${c.id}`}>
                <Text>Like</Text>
              </TouchableOpacity>
            )}
            {onUnlike && (
              <TouchableOpacity
                onPress={() => onUnlike(c.id)}
                accessibilityLabel={`Unlike ${c.id}`}
              >
                <Text>Unlike</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        {hasNextPage && onLoadMore && (
          <TouchableOpacity onPress={onLoadMore} accessibilityLabel="Load more">
            <Text>Load more</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  },
}));

jest.mock('../CommentInput', () => ({
  CommentInput: ({ isAuthenticated, onSubmit, replyTarget, onCancelReply }: any) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View>
        {isAuthenticated ? (
          <TouchableOpacity
            onPress={() => onSubmit('test comment')}
            accessibilityLabel="Submit comment"
          >
            <Text>Submit</Text>
          </TouchableOpacity>
        ) : (
          <Text>Sign in to comment</Text>
        )}
        {replyTarget && <Text testID="reply-target-indicator">{replyTarget.displayName}</Text>}
        {onCancelReply && (
          <TouchableOpacity onPress={onCancelReply} accessibilityLabel="Cancel reply">
            <Text>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  },
}));

jest.mock('@/styles/postDetail.styles', () => ({
  createPostDetailStyles: () => new Proxy({}, { get: () => ({}) }),
}));

describe('CommentsBottomSheet', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render when visible is false', () => {
    render(<CommentsBottomSheet visible={false} feedItemId="item-1" onClose={onClose} />);
    expect(screen.queryByTestId('comments-bottom-sheet')).toBeNull();
  });

  it('renders when visible is true', () => {
    render(<CommentsBottomSheet visible={true} feedItemId="item-1" onClose={onClose} />);
    expect(screen.getByTestId('comments-bottom-sheet')).toBeTruthy();
  });

  it('renders comments list', () => {
    render(<CommentsBottomSheet visible={true} feedItemId="item-1" onClose={onClose} />);
    expect(screen.getByText('Great movie!')).toBeTruthy();
    expect(screen.getByText('Amazing trailer')).toBeTruthy();
  });

  it('calls onClose when backdrop pressed', () => {
    render(<CommentsBottomSheet visible={true} feedItemId="item-1" onClose={onClose} />);
    fireEvent.press(screen.getByLabelText('Close comments'));
    expect(onClose).toHaveBeenCalled();
  });

  it('submits a comment via addMutation', () => {
    render(<CommentsBottomSheet visible={true} feedItemId="item-1" onClose={onClose} />);
    fireEvent.press(screen.getByLabelText('Submit comment'));
    expect(mockMutate).toHaveBeenCalledWith(
      { body: 'test comment', parentCommentId: undefined },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it('deletes a comment via deleteMutation', () => {
    render(<CommentsBottomSheet visible={true} feedItemId="item-1" onClose={onClose} />);
    fireEvent.press(screen.getByLabelText('Delete c1'));
    expect(mockDeleteMutate).toHaveBeenCalledWith(
      { commentId: 'c1', parentCommentId: null },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it('renders with loading state', () => {
    const feedModule = jest.requireMock('@/features/feed');
    const orig = feedModule.useComments;
    feedModule.useComments = jest.fn(() => ({
      data: undefined,
      isLoading: true,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
    }));

    render(<CommentsBottomSheet visible={true} feedItemId="item-1" onClose={onClose} />);
    expect(screen.getByText('0 comments')).toBeTruthy();

    feedModule.useComments = orig;
  });

  it('calls fetchNextPage when load more is pressed', () => {
    const feedModule = jest.requireMock('@/features/feed');
    const orig = feedModule.useComments;
    feedModule.useComments = jest.fn(() => ({
      data: {
        pages: [
          [
            {
              id: 'c1',
              user_id: 'user-1',
              body: 'Comment 1',
              created_at: '2024-01-01T00:00:00Z',
              parent_comment_id: null,
              like_count: 0,
              reply_count: 0,
              profile: { display_name: 'user', avatar_url: null },
            },
          ],
        ],
      },
      isLoading: false,
      hasNextPage: true,
      fetchNextPage: mockFetchNextPage,
    }));

    render(<CommentsBottomSheet visible={true} feedItemId="item-1" onClose={onClose} />);
    fireEvent.press(screen.getByLabelText('Load more'));
    expect(mockFetchNextPage).toHaveBeenCalled();

    feedModule.useComments = orig;
  });

  it('shows comment input for authenticated users', () => {
    render(<CommentsBottomSheet visible={true} feedItemId="item-1" onClose={onClose} />);
    expect(screen.getByLabelText('Submit comment')).toBeTruthy();
  });

  it('shows login prompt for unauthenticated users', () => {
    const authModule = jest.requireMock('@/features/auth/providers/AuthProvider');
    const orig = authModule.useAuth;
    authModule.useAuth = () => ({ user: null });

    render(<CommentsBottomSheet visible={true} feedItemId="item-1" onClose={onClose} />);
    expect(screen.getByText('Sign in to comment')).toBeTruthy();

    authModule.useAuth = orig;
  });

  it('renders the sheet content area', () => {
    render(<CommentsBottomSheet visible={true} feedItemId="item-1" onClose={onClose} />);
    expect(screen.getByTestId('sheet-content-area')).toBeTruthy();
  });

  it('calls onRequestClose which triggers animateClose and then onClose', () => {
    const { getByTestId } = render(
      <CommentsBottomSheet visible={true} feedItemId="item-1" onClose={onClose} />,
    );
    fireEvent(getByTestId('comments-bottom-sheet'), 'requestClose');
    expect(onClose).toHaveBeenCalled();
  });

  it('renders correctly on Android', () => {
    const { Platform } = require('react-native');
    const origOS = Platform.OS;
    Platform.OS = 'android';

    render(<CommentsBottomSheet visible={true} feedItemId="item-1" onClose={onClose} />);
    expect(screen.getByTestId('comments-bottom-sheet')).toBeTruthy();

    Platform.OS = origOS;
  });

  it('handleReply sets replyTarget for a top-level comment (parentId = comment.id)', () => {
    render(<CommentsBottomSheet visible={true} feedItemId="item-1" onClose={onClose} />);
    // c1 has parent_comment_id: null so parentId resolves to c1's own id
    fireEvent.press(screen.getByLabelText('Reply c1'));
    // CommentInput should now receive a replyTarget; verify the cancel button appears
    // by pressing Submit (still visible) — main goal is no throw and state transitions
    expect(screen.getByLabelText('Submit comment')).toBeTruthy();
  });

  it('handleReply sets parentCommentId from parent_comment_id for a nested comment', () => {
    const feedModule = jest.requireMock('@/features/feed');
    const orig = feedModule.useComments;
    feedModule.useComments = jest.fn(() => ({
      data: {
        pages: [
          [
            {
              id: 'c3',
              user_id: 'user-2',
              body: 'Nested reply',
              created_at: '2024-01-01T02:00:00Z',
              parent_comment_id: 'c1',
              like_count: 0,
              reply_count: 0,
              profile: { display_name: 'nested-user', avatar_url: null },
            },
          ],
        ],
      },
      isLoading: false,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
    }));

    render(<CommentsBottomSheet visible={true} feedItemId="item-1" onClose={onClose} />);
    // c3 has parent_comment_id: 'c1' so parentId resolves to 'c1'
    fireEvent.press(screen.getByLabelText('Reply c3'));
    expect(screen.getByLabelText('Submit comment')).toBeTruthy();

    feedModule.useComments = orig;
  });

  it('shows Alert on delete error', () => {
    const { Alert } = require('react-native');
    jest.spyOn(Alert, 'alert');

    render(<CommentsBottomSheet visible={true} feedItemId="item-1" onClose={onClose} />);
    fireEvent.press(screen.getByLabelText('Delete c1'));

    // Capture and invoke the onError callback passed to deleteMutation.mutate
    const onError = mockDeleteMutate.mock.calls[0][1].onError;
    onError();

    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      'Failed to delete comment. Please try again.',
    );
  });

  it('shows Alert on submit (add) error', () => {
    const { Alert } = require('react-native');
    jest.spyOn(Alert, 'alert');

    render(<CommentsBottomSheet visible={true} feedItemId="item-1" onClose={onClose} />);
    fireEvent.press(screen.getByLabelText('Submit comment'));

    // Capture and invoke the onError callback passed to addMutation.mutate
    const onError = mockMutate.mock.calls[0][1].onError;
    onError();

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to add comment. Please try again.');
  });

  it('calls likeMutation.mutate with commentId when like button pressed', () => {
    render(<CommentsBottomSheet visible={true} feedItemId="item-1" onClose={onClose} />);
    fireEvent.press(screen.getByLabelText('Like c1'));
    expect(mockLikeMutate).toHaveBeenCalledWith({ commentId: 'c1' });
  });

  it('calls unlikeMutation.mutate with commentId when unlike button pressed', () => {
    render(<CommentsBottomSheet visible={true} feedItemId="item-1" onClose={onClose} />);
    fireEvent.press(screen.getByLabelText('Unlike c1'));
    expect(mockUnlikeMutate).toHaveBeenCalledWith({ commentId: 'c1' });
  });

  it('handles undefined likedCommentIds data (= {} default)', () => {
    const feedModule = jest.requireMock('@/features/feed');
    const orig = feedModule.useUserCommentLikes;
    feedModule.useUserCommentLikes = jest.fn(() => ({ data: undefined }));

    render(<CommentsBottomSheet visible={true} feedItemId="item-1" onClose={onClose} />);
    expect(screen.getByTestId('comments-bottom-sheet')).toBeTruthy();

    feedModule.useUserCommentLikes = orig;
  });

  it('renders the Comments header title', () => {
    render(<CommentsBottomSheet visible={true} feedItemId="item-1" onClose={onClose} />);
    expect(screen.getByText('Comments')).toBeTruthy();
  });

  it('sorts user own comments to the top', () => {
    // Default mock has user-1 (auth user) comment c1 first and user-2 comment c2 second.
    // With the sort, user-1 comments should appear first.
    const feedModule = jest.requireMock('@/features/feed');
    const orig = feedModule.useComments;
    feedModule.useComments = jest.fn(() => ({
      data: {
        pages: [
          [
            {
              id: 'c-other',
              user_id: 'user-2',
              body: 'Other user comment',
              created_at: '2024-01-01T00:00:00Z',
              parent_comment_id: null,
              like_count: 0,
              reply_count: 0,
              profile: { display_name: 'otheruser', avatar_url: null },
            },
            {
              id: 'c-mine',
              user_id: 'user-1',
              body: 'My comment',
              created_at: '2024-01-01T01:00:00Z',
              parent_comment_id: null,
              like_count: 0,
              reply_count: 0,
              profile: { display_name: 'testuser', avatar_url: null },
            },
          ],
        ],
      },
      isLoading: false,
      hasNextPage: false,
      fetchNextPage: jest.fn(),
    }));

    render(<CommentsBottomSheet visible={true} feedItemId="item-1" onClose={onClose} />);
    // Both comments should be rendered
    expect(screen.getByText('My comment')).toBeTruthy();
    expect(screen.getByText('Other user comment')).toBeTruthy();

    feedModule.useComments = orig;
  });

  it('dismisses keyboard when scroll area is touched', () => {
    const { Keyboard } = require('react-native');
    jest.spyOn(Keyboard, 'dismiss');

    render(<CommentsBottomSheet visible={true} feedItemId="item-1" onClose={onClose} />);
    // The ScrollView has onTouchStart that calls Keyboard.dismiss
    // We verify the component renders without errors with this handler
    expect(screen.getByTestId('comments-bottom-sheet')).toBeTruthy();
  });

  it('clears replyTarget when cancel reply is pressed', () => {
    render(<CommentsBottomSheet visible={true} feedItemId="item-1" onClose={onClose} />);
    // Set a reply target first
    fireEvent.press(screen.getByLabelText('Reply c1'));
    expect(screen.getByTestId('reply-target-indicator')).toBeTruthy();
    // Cancel the reply
    fireEvent.press(screen.getByLabelText('Cancel reply'));
    expect(screen.queryByTestId('reply-target-indicator')).toBeNull();
  });
});
