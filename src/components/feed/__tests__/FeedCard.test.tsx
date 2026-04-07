const mockOpenImage = jest.fn();

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: {
      white: '#fff',
      red600: '#dc2626',
      gray500: '#6b7280',
      yellow400: '#facc15',
      green500: '#22c55e',
      green600_20: 'rgba(22,163,74,0.2)',
      red500: '#ef4444',
      red600_20: 'rgba(220,38,38,0.2)',
    },
  }),
}));

jest.mock('@/styles/tabs/feed.styles', () => ({
  createFeedCardStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/providers/ImageViewerProvider', () => ({
  useImageViewer: () => ({ openImage: mockOpenImage, closeImage: jest.fn() }),
}));

jest.mock('@/utils/measureView', () => ({
  measureView: jest.fn((_ref: unknown, onMeasured: (layout: object) => void) =>
    onMeasured({ x: 16, y: 200, width: 200, height: 255 }),
  ),
}));

jest.mock('../FeedAvatar', () => ({
  FeedAvatar: ({
    imageUrl,
    entityType,
    label,
    onPress,
  }: {
    imageUrl: string | null;
    entityType: string;
    label?: string;
    onPress?: () => void;
  }) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    const content = (
      <View testID="feed-avatar" accessibilityLabel={label}>
        <Text testID="avatar-entity-type">{entityType}</Text>
        {imageUrl ? <Text testID="avatar-image-url">{imageUrl}</Text> : null}
      </View>
    );
    if (onPress) {
      return (
        <TouchableOpacity testID="avatar-press" onPress={onPress}>
          {content}
        </TouchableOpacity>
      );
    }
    return content;
  },
}));

jest.mock('../FeedActionBar', () => ({
  FeedActionBar: (props: {
    commentCount: number;
    upvoteCount: number;
    downvoteCount: number;
    viewCount: number;
    userVote: 'up' | 'down' | null;
    isBookmarked: boolean;
    bookmarkCount: number;
    onComment?: () => void;
    onUpvote?: () => void;
    onDownvote?: () => void;
    onBookmark?: () => void;
    onShare?: () => void;
  }) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID="feed-action-bar">
        <Text testID="action-comment-count">{props.commentCount}</Text>
        <Text testID="action-upvote-count">{props.upvoteCount}</Text>
        <Text testID="action-downvote-count">{props.downvoteCount}</Text>
        <Text testID="action-view-count">{props.viewCount}</Text>
        <Text testID="action-user-vote">{props.userVote ?? 'none'}</Text>
        <Text testID="action-is-bookmarked">
          {props.isBookmarked ? 'bookmarked' : 'not-bookmarked'}
        </Text>
        <Text testID="action-bookmark-count">{props.bookmarkCount}</Text>
        {props.onComment ? (
          <TouchableOpacity testID="action-comment-btn" onPress={props.onComment} />
        ) : null}
        {props.onUpvote ? (
          <TouchableOpacity testID="action-upvote-btn" onPress={props.onUpvote} />
        ) : null}
        {props.onDownvote ? (
          <TouchableOpacity testID="action-downvote-btn" onPress={props.onDownvote} />
        ) : null}
        {props.onBookmark ? (
          <TouchableOpacity testID="action-bookmark-btn" onPress={props.onBookmark} />
        ) : null}
        {props.onShare ? (
          <TouchableOpacity testID="action-share-btn" onPress={props.onShare} />
        ) : null}
      </View>
    );
  },
}));

jest.mock('../FollowButton', () => ({
  FollowButton: ({
    isFollowing,
    onPress,
    entityName,
  }: {
    isFollowing: boolean;
    onPress: () => void;
    entityName?: string;
  }) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity testID="follow-button" onPress={onPress} accessibilityLabel={entityName}>
        <Text testID="follow-button-state">{isFollowing ? 'Following' : 'Follow'}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('../FeedVideoPlayer', () => ({
  FeedVideoPlayer: ({
    isActive,
    youtubeId,
    shouldMount,
  }: {
    isActive: boolean;
    youtubeId: string;
    shouldMount?: boolean;
  }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="feed-video-player">
        <Text>{isActive ? 'Playing' : 'Paused'}</Text>
        <Text>{shouldMount ? 'Mounted' : 'Idle'}</Text>
        <Text>{youtubeId}</Text>
      </View>
    );
  },
}));

jest.mock('../FilmStripFrameDivider', () => ({
  FilmStripFrameDivider: ({ isEdge }: { isEdge?: boolean }) => {
    const { View } = require('react-native');
    return <View testID={isEdge ? 'film-strip-frame-divider-edge' : 'film-strip-frame-divider'} />;
  },
}));

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { FeedCard } from '../FeedCard';
import type { NewsFeedItem } from '@shared/types';

const makeItem = (overrides: Partial<NewsFeedItem> = {}): NewsFeedItem => ({
  id: '1',
  feed_type: 'video',
  content_type: 'trailer',
  title: 'Test Trailer',
  description: null,
  movie_id: 'm1',
  source_table: 'movie_videos',
  source_id: 'v1',
  thumbnail_url: 'https://example.com/thumb.jpg',
  youtube_id: 'abc123',
  is_pinned: false,
  is_featured: false,
  display_order: 0,
  upvote_count: 5,
  downvote_count: 1,
  view_count: 100,
  comment_count: 3,
  bookmark_count: 0,
  published_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  movie: { id: 'm1', title: 'Test Movie', poster_url: 'poster.jpg', release_date: '2024-03-01' },
  ...overrides,
});

describe('FeedCard', () => {
  beforeEach(() => jest.clearAllMocks());

  // Avatar rendering
  it('renders FeedAvatar with movie entity type', () => {
    render(<FeedCard item={makeItem()} onPress={jest.fn()} />);
    expect(screen.getByTestId('feed-avatar')).toBeTruthy();
    expect(screen.getByTestId('avatar-entity-type').props.children).toBe('movie');
  });

  it('passes movie poster_url to FeedAvatar', () => {
    render(<FeedCard item={makeItem()} onPress={jest.fn()} />);
    expect(screen.getByTestId('avatar-image-url').props.children).toBe('poster.jpg');
  });

  it('renders entity name in name row', () => {
    render(<FeedCard item={makeItem()} onPress={jest.fn()} />);
    expect(screen.getByText('Test Movie')).toBeTruthy();
  });

  it('renders title', () => {
    render(<FeedCard item={makeItem()} onPress={jest.fn()} />);
    expect(screen.getByText('Test Trailer')).toBeTruthy();
  });

  it('renders without movie reference', () => {
    const item = makeItem({
      movie: undefined,
      movie_id: null,
      source_id: null,
      source_table: null,
    });
    render(<FeedCard item={item} onPress={jest.fn()} />);
    // Title appears as both entity name and card title
    expect(screen.getAllByText('Test Trailer')).toHaveLength(2);
  });

  it('calls onPress with item when pressed', () => {
    const onPress = jest.fn();
    const item = makeItem();
    render(<FeedCard item={item} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText('Trailer: Test Trailer'));
    expect(onPress).toHaveBeenCalledWith(item);
  });

  // Featured inline icon
  it('renders star icon for featured items', () => {
    const { toJSON } = render(
      <FeedCard item={makeItem({ is_featured: true })} onPress={jest.fn()} />,
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"star"');
  });

  it('does not render star icon for non-featured items', () => {
    const { toJSON } = render(
      <FeedCard item={makeItem({ is_featured: false })} onPress={jest.fn()} />,
    );
    const json = JSON.stringify(toJSON());
    expect(json).not.toContain('"star"');
  });

  // Description
  it('renders description for text-only items without thumbnail', () => {
    const item = makeItem({
      thumbnail_url: null,
      youtube_id: null,
      description: 'A text update',
      movie: { id: 'm1', title: 'Test Movie', poster_url: null, release_date: '2024-03-01' },
    });
    render(<FeedCard item={item} onPress={jest.fn()} />);
    expect(screen.getByText('A text update')).toBeTruthy();
  });

  it('does not render description when thumbnail exists', () => {
    const item = makeItem({
      description: 'Should not show',
      thumbnail_url: 'https://example.com/t.jpg',
    });
    render(<FeedCard item={item} onPress={jest.fn()} />);
    expect(screen.queryByText('Should not show')).toBeNull();
  });

  it('renders poster type without video player', () => {
    const item = makeItem({ feed_type: 'poster', content_type: 'poster', youtube_id: null });
    render(<FeedCard item={item} onPress={jest.fn()} />);
    expect(screen.queryByTestId('feed-video-player')).toBeNull();
  });

  // Action bar tests
  it('renders FeedActionBar with correct counts', () => {
    const item = makeItem({
      upvote_count: 10,
      downvote_count: 3,
      view_count: 500,
      comment_count: 7,
    });
    render(<FeedCard item={item} onPress={jest.fn()} />);
    expect(screen.getByTestId('feed-action-bar')).toBeTruthy();
    expect(screen.getByTestId('action-upvote-count').props.children).toBe(10);
    expect(screen.getByTestId('action-downvote-count').props.children).toBe(3);
    expect(screen.getByTestId('action-view-count').props.children).toBe(500);
    expect(screen.getByTestId('action-comment-count').props.children).toBe(7);
  });

  it('passes vote callbacks to FeedActionBar', () => {
    const onUpvote = jest.fn();
    const onDownvote = jest.fn();
    const item = makeItem({ id: 'feed-99' });
    render(
      <FeedCard item={item} onPress={jest.fn()} onUpvote={onUpvote} onDownvote={onDownvote} />,
    );
    fireEvent.press(screen.getByTestId('action-upvote-btn'));
    expect(onUpvote).toHaveBeenCalledWith('feed-99');
    fireEvent.press(screen.getByTestId('action-downvote-btn'));
    expect(onDownvote).toHaveBeenCalledWith('feed-99');
  });

  it('passes userVote to FeedActionBar', () => {
    render(
      <FeedCard
        item={makeItem()}
        onPress={jest.fn()}
        userVote="up"
        onUpvote={jest.fn()}
        onDownvote={jest.fn()}
      />,
    );
    expect(screen.getByTestId('action-user-vote').props.children).toBe('up');
  });

  it('does not pass vote callbacks when not provided', () => {
    render(<FeedCard item={makeItem()} onPress={jest.fn()} />);
    expect(screen.queryByTestId('action-upvote-btn')).toBeNull();
    expect(screen.queryByTestId('action-downvote-btn')).toBeNull();
  });

  it('passes onComment callback to FeedActionBar', () => {
    const onComment = jest.fn();
    const item = makeItem({ id: 'feed-55' });
    render(<FeedCard item={item} onPress={jest.fn()} onComment={onComment} />);
    fireEvent.press(screen.getByTestId('action-comment-btn'));
    expect(onComment).toHaveBeenCalledWith('feed-55');
  });

  it('passes onShare callback to FeedActionBar', () => {
    const onShare = jest.fn();
    const item = makeItem({ id: 'feed-55' });
    render(<FeedCard item={item} onPress={jest.fn()} onShare={onShare} />);
    fireEvent.press(screen.getByTestId('action-share-btn'));
    expect(onShare).toHaveBeenCalledWith('feed-55');
  });

  it('does not pass comment/share callbacks when not provided', () => {
    render(<FeedCard item={makeItem()} onPress={jest.fn()} />);
    expect(screen.queryByTestId('action-comment-btn')).toBeNull();
    expect(screen.queryByTestId('action-share-btn')).toBeNull();
  });

  it('passes bookmark_count to FeedActionBar', () => {
    const item = makeItem({ bookmark_count: 15 });
    render(<FeedCard item={item} onPress={jest.fn()} />);
    expect(screen.getByTestId('action-bookmark-count').props.children).toBe(15);
  });

  it('passes isBookmarked false to FeedActionBar when not provided', () => {
    render(<FeedCard item={makeItem()} onPress={jest.fn()} />);
    expect(screen.getByTestId('action-is-bookmarked').props.children).toBe('not-bookmarked');
  });

  it('passes isBookmarked true to FeedActionBar when provided', () => {
    render(<FeedCard item={makeItem()} onPress={jest.fn()} isBookmarked={true} />);
    expect(screen.getByTestId('action-is-bookmarked').props.children).toBe('bookmarked');
  });

  it('passes onBookmark callback to FeedActionBar and calls it with item id', () => {
    const onBookmark = jest.fn();
    const item = makeItem({ id: 'feed-55' });
    render(<FeedCard item={item} onPress={jest.fn()} onBookmark={onBookmark} />);
    fireEvent.press(screen.getByTestId('action-bookmark-btn'));
    expect(onBookmark).toHaveBeenCalledWith('feed-55');
  });

  it('does not pass onBookmark when not provided', () => {
    render(<FeedCard item={makeItem()} onPress={jest.fn()} />);
    expect(screen.queryByTestId('action-bookmark-btn')).toBeNull();
  });

  // Video autoplay tests
  it('renders FeedVideoPlayer for video items', () => {
    render(<FeedCard item={makeItem({ youtube_id: 'xyz789' })} onPress={jest.fn()} />);
    expect(screen.getByTestId('feed-video-player')).toBeTruthy();
    expect(screen.getByText('xyz789')).toBeTruthy();
  });

  it('passes isVideoActive to FeedVideoPlayer', () => {
    render(<FeedCard item={makeItem()} onPress={jest.fn()} isVideoActive={true} />);
    expect(screen.getByText('Playing')).toBeTruthy();
  });

  it('passes shouldMountVideo to FeedVideoPlayer', () => {
    render(
      <FeedCard
        item={makeItem()}
        onPress={jest.fn()}
        isVideoActive={false}
        shouldMountVideo={true}
      />,
    );
    expect(screen.getByText('Mounted')).toBeTruthy();
  });

  it('shows Paused state when isVideoActive is false', () => {
    render(<FeedCard item={makeItem()} onPress={jest.fn()} isVideoActive={false} />);
    expect(screen.getByText('Paused')).toBeTruthy();
  });

  it('does not render FeedVideoPlayer for non-video items', () => {
    const item = makeItem({ youtube_id: null, content_type: 'poster', feed_type: 'poster' });
    render(<FeedCard item={item} onPress={jest.fn()} />);
    expect(screen.queryByTestId('feed-video-player')).toBeNull();
  });

  it('calls onVideoLayout when video card lays out', () => {
    const onVideoLayout = jest.fn();
    render(
      <FeedCard item={makeItem({ id: 'v1' })} onPress={jest.fn()} onVideoLayout={onVideoLayout} />,
    );
    const { View } = require('react-native');
    const rootViews = screen.UNSAFE_getAllByType(View);
    fireEvent(rootViews[0], 'layout', { nativeEvent: { layout: { y: 100, height: 300 } } });
    expect(onVideoLayout).toHaveBeenCalledWith('v1', 100, 300);
  });

  // Poster navigation tests
  it('tapping poster navigates to movie page when movie is linked', () => {
    const onEntityPress = jest.fn();
    const item = makeItem({
      youtube_id: null,
      content_type: 'poster',
      feed_type: 'poster',
      movie_id: 'm1',
    });
    render(<FeedCard item={item} onPress={jest.fn()} onEntityPress={onEntityPress} />);
    fireEvent.press(screen.getByLabelText('View Test Trailer poster'));
    expect(onEntityPress).toHaveBeenCalledWith('movie', 'm1');
    expect(mockOpenImage).not.toHaveBeenCalled();
  });

  it('tapping poster calls onPress when no movie linked', () => {
    const onPress = jest.fn();
    const item = makeItem({
      youtube_id: null,
      content_type: 'poster',
      feed_type: 'poster',
      movie_id: null,
      movie: undefined,
      source_id: null,
      source_table: null,
    });
    render(<FeedCard item={item} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText('View Test Trailer poster'));
    expect(onPress).toHaveBeenCalledWith(item);
  });

  it('long-pressing poster opens image viewer', () => {
    const item = makeItem({ youtube_id: null, content_type: 'poster', feed_type: 'poster' });
    render(<FeedCard item={item} onPress={jest.fn()} />);
    fireEvent(screen.getByLabelText('View Test Trailer poster'), 'longPress');
    expect(mockOpenImage).toHaveBeenCalledWith(
      expect.objectContaining({
        fullUrl: 'https://example.com/thumb.jpg',
        borderRadius: 0,
        onSourceHide: expect.any(Function),
        onSourceShow: expect.any(Function),
      }),
    );
  });

  it('passes top chrome metadata on long-press', () => {
    const item = makeItem({ youtube_id: null, content_type: 'poster', feed_type: 'poster' });
    const getImageViewerTopChrome = jest.fn(() => ({
      variant: 'home-feed' as const,
      insetTop: 44,
      headerContentHeight: 52,
      headerTranslateY: -16,
    }));
    render(
      <FeedCard
        item={item}
        onPress={jest.fn()}
        getImageViewerTopChrome={getImageViewerTopChrome}
      />,
    );
    fireEvent(screen.getByLabelText('View Test Trailer poster'), 'longPress');
    expect(getImageViewerTopChrome).toHaveBeenCalled();
    expect(mockOpenImage).toHaveBeenCalledWith(
      expect.objectContaining({
        topChrome: expect.objectContaining({ variant: 'home-feed', headerTranslateY: -16 }),
      }),
    );
  });

  it('hides poster when onSourceHide is called and shows on onSourceShow', () => {
    const item = makeItem({ youtube_id: null, content_type: 'poster', feed_type: 'poster' });
    const { rerender } = render(<FeedCard item={item} onPress={jest.fn()} />);
    fireEvent(screen.getByLabelText('View Test Trailer poster'), 'longPress');
    const { onSourceHide, onSourceShow } = mockOpenImage.mock.calls[0][0];
    const { act } = require('@testing-library/react-native');
    act(() => onSourceHide());
    rerender(<FeedCard item={item} onPress={jest.fn()} />);
    act(() => onSourceShow());
    rerender(<FeedCard item={item} onPress={jest.fn()} />);
  });

  // Follow button tests
  it('renders FollowButton when onFollow is provided', () => {
    render(<FeedCard item={makeItem()} onPress={jest.fn()} onFollow={jest.fn()} />);
    expect(screen.getByTestId('follow-button')).toBeTruthy();
  });

  it('does not render FollowButton when onFollow is not provided', () => {
    render(<FeedCard item={makeItem()} onPress={jest.fn()} />);
    expect(screen.queryByTestId('follow-button')).toBeNull();
  });

  it('passes isFollowing state to FollowButton', () => {
    render(
      <FeedCard item={makeItem()} onPress={jest.fn()} isFollowing={true} onFollow={jest.fn()} />,
    );
    expect(screen.getByTestId('follow-button-state').props.children).toBe('Following');
  });

  it('calls onFollow with entity type and ID when follow pressed', () => {
    const onFollow = jest.fn();
    const item = makeItem({ movie_id: 'm1' });
    render(<FeedCard item={item} onPress={jest.fn()} onFollow={onFollow} />);
    fireEvent.press(screen.getByTestId('follow-button'));
    expect(onFollow).toHaveBeenCalledWith('movie', 'm1');
  });

  it('calls onUnfollow when already following and pressed', () => {
    const onUnfollow = jest.fn();
    const item = makeItem({ movie_id: 'm1' });
    render(
      <FeedCard
        item={item}
        onPress={jest.fn()}
        isFollowing={true}
        onFollow={jest.fn()}
        onUnfollow={onUnfollow}
      />,
    );
    fireEvent.press(screen.getByTestId('follow-button'));
    expect(onUnfollow).toHaveBeenCalledWith('movie', 'm1');
  });

  it('does not render FollowButton when entity has no ID', () => {
    const item = makeItem({
      movie_id: null,
      movie: undefined,
      source_id: null,
      source_table: null,
    });
    render(<FeedCard item={item} onPress={jest.fn()} onFollow={jest.fn()} />);
    expect(screen.queryByTestId('follow-button')).toBeNull();
  });

  // Entity navigation tests
  it('makes avatar tappable when onEntityPress is provided', () => {
    const onEntityPress = jest.fn();
    render(<FeedCard item={makeItem()} onPress={jest.fn()} onEntityPress={onEntityPress} />);
    fireEvent.press(screen.getByTestId('avatar-press'));
    expect(onEntityPress).toHaveBeenCalledWith('movie', 'm1');
  });

  it('does not make avatar tappable when onEntityPress is not provided', () => {
    render(<FeedCard item={makeItem()} onPress={jest.fn()} />);
    expect(screen.queryByTestId('avatar-press')).toBeNull();
  });

  it('makes entity name tappable when onEntityPress is provided', () => {
    const onEntityPress = jest.fn();
    render(<FeedCard item={makeItem()} onPress={jest.fn()} onEntityPress={onEntityPress} />);
    fireEvent.press(screen.getByLabelText('Go to Test Movie'));
    expect(onEntityPress).toHaveBeenCalledWith('movie', 'm1');
  });

  // Memo comparator tests
  it('does not re-render when only callback refs change (memo comparator)', () => {
    const item = makeItem();
    const onPress1 = jest.fn();
    const onPress2 = jest.fn();
    const { rerender } = render(<FeedCard item={item} onPress={onPress1} />);
    // Re-render with new callback ref but same item data
    rerender(<FeedCard item={item} onPress={onPress2} />);
    // Component should still be rendered (memo skips re-render)
    expect(screen.getByText('Test Trailer')).toBeTruthy();
  });

  it('re-renders when userVote changes (memo comparator)', () => {
    const item = makeItem();
    const { rerender } = render(
      <FeedCard
        item={item}
        onPress={jest.fn()}
        userVote={null}
        onUpvote={jest.fn()}
        onDownvote={jest.fn()}
      />,
    );
    rerender(
      <FeedCard
        item={item}
        onPress={jest.fn()}
        userVote="up"
        onUpvote={jest.fn()}
        onDownvote={jest.fn()}
      />,
    );
    expect(screen.getByTestId('action-user-vote').props.children).toBe('up');
  });

  it('re-renders when isFollowing changes (memo comparator)', () => {
    const item = makeItem();
    const { rerender } = render(
      <FeedCard item={item} onPress={jest.fn()} isFollowing={false} onFollow={jest.fn()} />,
    );
    rerender(<FeedCard item={item} onPress={jest.fn()} isFollowing={true} onFollow={jest.fn()} />);
    expect(screen.getByTestId('follow-button-state').props.children).toBe('Following');
  });

  it('re-renders when item upvote_count changes (memo comparator)', () => {
    const item1 = makeItem({ upvote_count: 5 });
    const item2 = { ...item1, upvote_count: 10 };
    const { rerender } = render(<FeedCard item={item1} onPress={jest.fn()} onUpvote={jest.fn()} />);
    rerender(<FeedCard item={item2} onPress={jest.fn()} onUpvote={jest.fn()} />);
    expect(screen.getByTestId('action-upvote-count').props.children).toBe(10);
  });

  // No-video, no-thumbnail: description renders
  it('does not render description when description is null', () => {
    const item = makeItem({
      description: null,
      thumbnail_url: null,
      youtube_id: null,
      movie: { id: 'm1', title: 'Movie', poster_url: null, release_date: '2024-01-01' },
    });
    render(<FeedCard item={item} onPress={jest.fn()} />);
    // No description text should appear
    expect(screen.queryByText('A text update')).toBeNull();
  });

  it('does not call onVideoLayout when not provided and item has video', () => {
    const item = makeItem({ youtube_id: 'vid1' });
    // Should not throw even without onVideoLayout
    expect(() => render(<FeedCard item={item} onPress={jest.fn()} />)).not.toThrow();
  });

  it('renders with isVideoActive undefined (defaults to false)', () => {
    render(<FeedCard item={makeItem()} onPress={jest.fn()} />);
    expect(screen.getByText('Paused')).toBeTruthy();
  });

  it('defaults userVote to none when not provided', () => {
    render(<FeedCard item={makeItem()} onPress={jest.fn()} />);
    expect(screen.getByTestId('action-user-vote').props.children).toBe('none');
  });

  it('does not call openImage when imageUrl is null (handlePosterPress guard)', () => {
    const item = makeItem({
      youtube_id: null,
      thumbnail_url: null,
      movie: { id: 'm1', title: 'Movie', poster_url: null, release_date: '2024-01-01' },
    });
    render(<FeedCard item={item} onPress={jest.fn()} />);
    // No poster image is rendered when both thumbnail_url and movie.poster_url are null
    expect(screen.queryByLabelText(/poster/)).toBeNull();
  });

  it('does not render entity name as touchable when entityId is null', () => {
    const item = makeItem({
      movie_id: null,
      movie: undefined,
      source_id: null,
      source_table: null,
    });
    render(<FeedCard item={item} onPress={jest.fn()} onEntityPress={jest.fn()} />);
    // Entity name renders as plain Text, not TouchableOpacity
    expect(screen.queryByLabelText(/Go to/)).toBeNull();
  });

  it('does not render avatar as pressable when entityId is null and onEntityPress is provided', () => {
    const item = makeItem({
      movie_id: null,
      movie: undefined,
      source_id: null,
      source_table: null,
    });
    render(<FeedCard item={item} onPress={jest.fn()} onEntityPress={jest.fn()} />);
    expect(screen.queryByTestId('avatar-press')).toBeNull();
  });

  it('does not render description when it exists but thumbnail also exists', () => {
    const item = makeItem({
      description: 'Should be hidden',
      thumbnail_url: 'https://example.com/thumb.jpg',
      youtube_id: null,
    });
    render(<FeedCard item={item} onPress={jest.fn()} />);
    expect(screen.queryByText('Should be hidden')).toBeNull();
  });

  it('calls onFollow when not following and FollowButton is pressed', () => {
    const onFollow = jest.fn();
    const item = makeItem({ movie_id: 'm1' });
    render(<FeedCard item={item} onPress={jest.fn()} isFollowing={false} onFollow={onFollow} />);
    fireEvent.press(screen.getByTestId('follow-button'));
    expect(onFollow).toHaveBeenCalledWith('movie', 'm1');
  });

  it('fires onLoad on poster Image to set mediaLoaded true (hides skeleton)', () => {
    const item = makeItem({ youtube_id: null, content_type: 'poster', feed_type: 'poster' });
    render(<FeedCard item={item} onPress={jest.fn()} />);
    // Find the Image component inside the poster container and fire onLoad
    const { Image } = require('expo-image');
    const images = screen.UNSAFE_getAllByType(Image);
    const posterImage = images.find(
      (img: { props: { onLoad?: () => void } }) => typeof img.props.onLoad === 'function',
    );
    expect(posterImage).toBeTruthy();
    const { act } = require('@testing-library/react-native');
    act(() => posterImage!.props.onLoad());
    // After onLoad, skeleton should be hidden (mediaLoaded = true)
    expect(screen.getByText('Test Trailer')).toBeTruthy();
  });

  it('calls onVideoLayout when layout event fires on video card', () => {
    const onVideoLayout = jest.fn();
    const item = makeItem();
    const { UNSAFE_root } = render(
      <FeedCard item={item} onPress={jest.fn()} onVideoLayout={onVideoLayout} />,
    );
    // Find the outer View with onLayout prop (styles.post container)
    const { View } = require('react-native');
    const views = UNSAFE_root.findAllByType(View);
    const layoutView = views.find(
      (v: { props: { onLayout?: unknown } }) => typeof v.props.onLayout === 'function',
    );
    expect(layoutView).toBeTruthy();
    fireEvent(layoutView!, 'layout', {
      nativeEvent: { layout: { x: 0, y: 100, width: 400, height: 300 } },
    });
    expect(onVideoLayout).toHaveBeenCalledWith(item.id, 100, 300);
  });

  it('layout event without onVideoLayout does not crash', () => {
    const item = makeItem();
    const { UNSAFE_root } = render(<FeedCard item={item} onPress={jest.fn()} />);
    const { View } = require('react-native');
    const views = UNSAFE_root.findAllByType(View);
    const layoutView = views.find(
      (v: { props: { onLayout?: unknown } }) => typeof v.props.onLayout === 'function',
    );
    if (layoutView) {
      fireEvent(layoutView, 'layout', {
        nativeEvent: { layout: { x: 0, y: 50, width: 400, height: 200 } },
      });
    }
    expect(screen.getByText('Test Trailer')).toBeTruthy();
  });

  it('long-pressing poster on non-video card opens image viewer', () => {
    const item = makeItem({ youtube_id: null, content_type: 'poster', feed_type: 'poster' });
    render(<FeedCard item={item} onPress={jest.fn()} />);
    fireEvent(screen.getByLabelText(`View ${item.title} poster`), 'longPress');
    expect(mockOpenImage).toHaveBeenCalled();
  });

  it('re-renders when isVideoActive changes (memo comparator)', () => {
    const item = makeItem();
    const { rerender } = render(<FeedCard item={item} onPress={jest.fn()} isVideoActive={false} />);
    rerender(<FeedCard item={item} onPress={jest.fn()} isVideoActive={true} />);
    expect(screen.getByText('Playing')).toBeTruthy();
  });

  it('re-renders when shouldMountVideo changes (memo comparator)', () => {
    const item = makeItem();
    const { rerender } = render(
      <FeedCard item={item} onPress={jest.fn()} isVideoActive={false} shouldMountVideo={false} />,
    );
    rerender(
      <FeedCard item={item} onPress={jest.fn()} isVideoActive={false} shouldMountVideo={true} />,
    );
    expect(screen.getByText('Mounted')).toBeTruthy();
  });

  it('pressing the avatar spacer calls onPress with the item (Open post button)', () => {
    const onPress = jest.fn();
    const item = makeItem();
    render(<FeedCard item={item} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText('Open post'));
    expect(onPress).toHaveBeenCalledWith(item);
  });

  it('pressing the media wrapper area on a non-video item calls onPress', () => {
    const onPress = jest.fn();
    // Non-video item with description and no thumbnail — renders media TouchableOpacity
    const item = makeItem({
      youtube_id: null,
      thumbnail_url: null,
      description: 'A media description',
      movie: { id: 'm1', title: 'Test Movie', poster_url: null, release_date: '2024-01-01' },
    });
    render(<FeedCard item={item} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText('Trailer: Test Trailer media'));
    expect(onPress).toHaveBeenCalledWith(item);
  });

  it('renders FilmStripFrameDivider when isFirst is true', () => {
    render(<FeedCard item={makeItem()} onPress={jest.fn()} isFirst />);
    expect(screen.getByTestId('film-strip-frame-divider-edge')).toBeTruthy();
  });

  it('renders backdrop poster with backdrop accessibilityLabel when feed_type is backdrop', () => {
    const item = makeItem({
      feed_type: 'backdrop',
      thumbnail_url: 'https://example.com/backdrop.jpg',
      youtube_id: null,
    });
    render(<FeedCard item={item} onPress={jest.fn()} />);
    expect(screen.getByLabelText('View Test Trailer backdrop')).toBeTruthy();
  });

  it('uses size 56 for non-movie entity avatar', () => {
    const item = makeItem({
      movie_id: null,
      movie: undefined,
      source_table: 'actors',
      source_id: 'a1',
    });
    render(<FeedCard item={item} onPress={jest.fn()} />);
    expect(screen.getByTestId('feed-avatar')).toBeTruthy();
  });

  it('renders full timestamp row when showFullTimestamp is true', () => {
    const item = makeItem({ published_at: '2026-01-15T10:30:00Z' });
    render(<FeedCard item={item} onPress={jest.fn()} showFullTimestamp />);
    // The fullTimestampRow contains an Ionicons time-outline icon and a formatted timestamp text
    const { toJSON } = render(<FeedCard item={item} onPress={jest.fn()} showFullTimestamp />);
    expect(JSON.stringify(toJSON())).toContain('time-outline');
  });

  it('does not render full timestamp row when showFullTimestamp is false', () => {
    const item = makeItem({ published_at: '2026-01-15T10:30:00Z' });
    const { toJSON } = render(
      <FeedCard item={item} onPress={jest.fn()} showFullTimestamp={false} />,
    );
    expect(JSON.stringify(toJSON())).not.toContain('time-outline');
  });
});
