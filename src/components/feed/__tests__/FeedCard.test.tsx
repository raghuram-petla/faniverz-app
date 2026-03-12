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
    onComment?: () => void;
    onUpvote?: () => void;
    onDownvote?: () => void;
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
        {props.onComment ? (
          <TouchableOpacity testID="action-comment-btn" onPress={props.onComment} />
        ) : null}
        {props.onUpvote ? (
          <TouchableOpacity testID="action-upvote-btn" onPress={props.onUpvote} />
        ) : null}
        {props.onDownvote ? (
          <TouchableOpacity testID="action-downvote-btn" onPress={props.onDownvote} />
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
    duration,
  }: {
    isActive: boolean;
    youtubeId: string;
    duration: string | null;
  }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="feed-video-player">
        <Text>{isActive ? 'Playing' : 'Paused'}</Text>
        <Text>{youtubeId}</Text>
        {duration ? <Text>{duration}</Text> : null}
      </View>
    );
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
  duration: '2:30',
  is_pinned: false,
  is_featured: false,
  display_order: 0,
  upvote_count: 5,
  downvote_count: 1,
  view_count: 100,
  comment_count: 3,
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

  it('renders duration when present', () => {
    render(<FeedCard item={makeItem({ duration: '3:45' })} onPress={jest.fn()} />);
    expect(screen.getByText('3:45')).toBeTruthy();
  });

  it('does not render duration when null', () => {
    render(<FeedCard item={makeItem({ duration: null })} onPress={jest.fn()} />);
    expect(screen.queryByText('2:30')).toBeNull();
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

  // Poster viewer tests
  it('tapping poster calls openImage on context with source callbacks', () => {
    const item = makeItem({ youtube_id: null, content_type: 'poster', feed_type: 'poster' });
    render(<FeedCard item={item} onPress={jest.fn()} />);
    fireEvent.press(screen.getByLabelText('View Test Trailer poster'));
    expect(mockOpenImage).toHaveBeenCalledWith(
      expect.objectContaining({
        fullUrl: 'https://example.com/thumb.jpg',
        borderRadius: 12,
        sourceLayout: expect.objectContaining({ width: 200, height: 255 }),
        onSourceHide: expect.any(Function),
        onSourceShow: expect.any(Function),
      }),
    );
  });

  it('hides poster when onSourceHide is called and shows on onSourceShow', () => {
    const item = makeItem({ youtube_id: null, content_type: 'poster', feed_type: 'poster' });
    const { rerender } = render(<FeedCard item={item} onPress={jest.fn()} />);
    fireEvent.press(screen.getByLabelText('View Test Trailer poster'));
    const { onSourceHide, onSourceShow } = mockOpenImage.mock.calls[0][0];
    const { act } = require('@testing-library/react-native');
    // Hide poster
    act(() => onSourceHide());
    rerender(<FeedCard item={item} onPress={jest.fn()} />);
    // Show poster
    act(() => onSourceShow());
    rerender(<FeedCard item={item} onPress={jest.fn()} />);
  });

  it('uses movie poster_url as fallback when thumbnail_url is null', () => {
    const item = makeItem({
      youtube_id: null,
      thumbnail_url: null,
      movie: {
        id: 'm1',
        title: 'Movie',
        poster_url: 'https://example.com/poster.jpg',
        release_date: '2024-01-01',
      },
    });
    render(<FeedCard item={item} onPress={jest.fn()} />);
    fireEvent.press(screen.getByLabelText('View Test Trailer poster'));
    expect(mockOpenImage).toHaveBeenCalledWith(
      expect.objectContaining({ fullUrl: 'https://example.com/poster.jpg' }),
    );
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

  it('opens post when avatar column is tapped', () => {
    const onPress = jest.fn();
    const item = makeItem();
    render(<FeedCard item={item} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText(`Open ${item.title}`));
    expect(onPress).toHaveBeenCalledWith(item);
  });

  it('makes entity name tappable when onEntityPress is provided', () => {
    const onEntityPress = jest.fn();
    render(<FeedCard item={makeItem()} onPress={jest.fn()} onEntityPress={onEntityPress} />);
    fireEvent.press(screen.getByLabelText('Go to Test Movie'));
    expect(onEntityPress).toHaveBeenCalledWith('movie', 'm1');
  });
});
