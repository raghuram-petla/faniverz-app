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
            username: 'testuser',
            avatar_url: null,
          },
          {
            id: 'c2',
            user_id: 'user-2',
            body: 'Amazing trailer',
            created_at: '2024-01-01T01:00:00Z',
            username: 'otheruser',
            avatar_url: null,
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
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

jest.mock('../CommentsList', () => ({
  CommentsList: ({ comments, onDelete, onLoadMore, hasNextPage }: any) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View>
        <Text testID="comment-count">{comments.length} comments</Text>
        {comments.map((c: any) => (
          <View key={c.id}>
            <Text>{c.body}</Text>
            {onDelete && (
              <TouchableOpacity
                onPress={() => onDelete(c.id)}
                accessibilityLabel={`Delete ${c.id}`}
              >
                <Text>Delete</Text>
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
  CommentInput: ({ isAuthenticated, onSubmit }: any) => {
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
    expect(mockMutate).toHaveBeenCalledWith('test comment');
  });

  it('deletes a comment via deleteMutation', () => {
    render(<CommentsBottomSheet visible={true} feedItemId="item-1" onClose={onClose} />);
    fireEvent.press(screen.getByLabelText('Delete c1'));
    expect(mockDeleteMutate).toHaveBeenCalledWith('c1');
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
              username: 'user',
              avatar_url: null,
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

  it('renders the sheet content area (inner Pressable that stops propagation)', () => {
    render(<CommentsBottomSheet visible={true} feedItemId="item-1" onClose={onClose} />);
    // Verify the inner sheet content area renders — it uses stopPropagation to prevent overlay dismissal
    expect(screen.getByTestId('sheet-content-area')).toBeTruthy();
  });

  it('calls onRequestClose which triggers animateClose and then onClose', () => {
    const { getByTestId } = render(
      <CommentsBottomSheet visible={true} feedItemId="item-1" onClose={onClose} />,
    );
    // Simulate Android back button (onRequestClose on Modal)
    fireEvent(getByTestId('comments-bottom-sheet'), 'requestClose');
    expect(onClose).toHaveBeenCalled();
  });

  it('renders correctly on Android (KeyboardAvoidingView behavior is undefined)', () => {
    const { Platform } = require('react-native');
    const origOS = Platform.OS;
    Platform.OS = 'android';

    render(<CommentsBottomSheet visible={true} feedItemId="item-1" onClose={onClose} />);
    expect(screen.getByTestId('comments-bottom-sheet')).toBeTruthy();

    Platform.OS = origOS;
  });
});
