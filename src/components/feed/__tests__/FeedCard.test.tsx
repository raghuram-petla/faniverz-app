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
  published_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  movie: { id: 'm1', title: 'Test Movie', poster_url: null, release_date: '2024-03-01' },
  ...overrides,
});

describe('FeedCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders title', () => {
    render(<FeedCard item={makeItem()} onPress={jest.fn()} />);
    expect(screen.getByText('Test Trailer')).toBeTruthy();
  });

  it('renders movie name in header row', () => {
    render(<FeedCard item={makeItem()} onPress={jest.fn()} />);
    expect(screen.getByText('Test Movie')).toBeTruthy();
  });

  it('renders without movie reference', () => {
    const item = makeItem({ movie: undefined, movie_id: null });
    render(<FeedCard item={item} onPress={jest.fn()} />);
    expect(screen.getByText('Test Trailer')).toBeTruthy();
    expect(screen.queryByText('·')).toBeNull();
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

  it('renders pinned indicator for pinned items', () => {
    render(<FeedCard item={makeItem({ is_pinned: true })} onPress={jest.fn()} />);
    expect(screen.getByText('Pinned')).toBeTruthy();
  });

  it('does not render pinned indicator for non-pinned items', () => {
    render(<FeedCard item={makeItem({ is_pinned: false })} onPress={jest.fn()} />);
    expect(screen.queryByText('Pinned')).toBeNull();
  });

  it('renders featured indicator for featured items', () => {
    render(<FeedCard item={makeItem({ is_featured: true })} onPress={jest.fn()} />);
    expect(screen.getByText('Featured')).toBeTruthy();
  });

  it('does not render featured indicator for non-featured items', () => {
    render(<FeedCard item={makeItem({ is_featured: false })} onPress={jest.fn()} />);
    expect(screen.queryByText('Featured')).toBeNull();
  });

  it('shows pinned instead of featured when both are true', () => {
    render(
      <FeedCard item={makeItem({ is_pinned: true, is_featured: true })} onPress={jest.fn()} />,
    );
    expect(screen.getByText('Pinned')).toBeTruthy();
    expect(screen.queryByText('Featured')).toBeNull();
  });

  it('renders description for text-only items without thumbnail', () => {
    const item = makeItem({ thumbnail_url: null, youtube_id: null, description: 'A text update' });
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

  // Vote button tests
  it('renders vote buttons when onUpvote and onDownvote are provided', () => {
    const item = makeItem({ upvote_count: 10, downvote_count: 3 });
    render(
      <FeedCard
        item={item}
        onPress={jest.fn()}
        userVote={null}
        onUpvote={jest.fn()}
        onDownvote={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('Upvote, 10 upvotes')).toBeTruthy();
    expect(screen.getByLabelText('Downvote, 3 downvotes')).toBeTruthy();
  });

  it('does not render vote buttons when callbacks not provided', () => {
    render(
      <FeedCard item={makeItem({ upvote_count: 10, downvote_count: 3 })} onPress={jest.fn()} />,
    );
    expect(screen.queryByLabelText('Upvote, 10 upvotes')).toBeNull();
  });

  it('shows correct vote counts', () => {
    const item = makeItem({ upvote_count: 42, downvote_count: 7 });
    render(
      <FeedCard
        item={item}
        onPress={jest.fn()}
        userVote={null}
        onUpvote={jest.fn()}
        onDownvote={jest.fn()}
      />,
    );
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
  });

  it('pressing upvote calls onUpvote with item id', () => {
    const onUpvote = jest.fn();
    const item = makeItem({ id: 'feed-99', upvote_count: 5, downvote_count: 1 });
    render(
      <FeedCard
        item={item}
        onPress={jest.fn()}
        userVote={null}
        onUpvote={onUpvote}
        onDownvote={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByLabelText('Upvote, 5 upvotes'));
    expect(onUpvote).toHaveBeenCalledWith('feed-99');
  });

  it('pressing downvote calls onDownvote with item id', () => {
    const onDownvote = jest.fn();
    const item = makeItem({ id: 'feed-99', upvote_count: 5, downvote_count: 1 });
    render(
      <FeedCard
        item={item}
        onPress={jest.fn()}
        userVote={null}
        onUpvote={jest.fn()}
        onDownvote={onDownvote}
      />,
    );
    fireEvent.press(screen.getByLabelText('Downvote, 1 downvotes'));
    expect(onDownvote).toHaveBeenCalledWith('feed-99');
  });

  it('passes userVote to VoteButtons for active state', () => {
    const item = makeItem({ upvote_count: 5, downvote_count: 1 });
    render(
      <FeedCard
        item={item}
        onPress={jest.fn()}
        userVote="up"
        onUpvote={jest.fn()}
        onDownvote={jest.fn()}
      />,
    );
    const upvoteBtn = screen.getByLabelText('Upvote, 5 upvotes');
    expect(upvoteBtn.props.style).toEqual(
      expect.objectContaining({ backgroundColor: 'rgba(22,163,74,0.2)' }),
    );
  });

  it('does not render vote buttons when only onUpvote provided', () => {
    render(
      <FeedCard item={makeItem({ upvote_count: 5 })} onPress={jest.fn()} onUpvote={jest.fn()} />,
    );
    expect(screen.queryByLabelText('Upvote, 5 upvotes')).toBeNull();
  });

  it('does not render vote buttons when only onDownvote provided', () => {
    render(
      <FeedCard
        item={makeItem({ downvote_count: 1 })}
        onPress={jest.fn()}
        onDownvote={jest.fn()}
      />,
    );
    expect(screen.queryByLabelText('Downvote, 1 downvotes')).toBeNull();
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

  // Poster viewer tests (now context-based)
  it('tapping poster calls openImage on context', () => {
    const item = makeItem({ youtube_id: null, content_type: 'poster', feed_type: 'poster' });
    render(<FeedCard item={item} onPress={jest.fn()} />);
    fireEvent.press(screen.getByLabelText('View Test Trailer poster'));
    expect(mockOpenImage).toHaveBeenCalledWith(
      expect.objectContaining({
        fullUrl: 'https://example.com/thumb.jpg',
        borderRadius: 12,
        sourceLayout: expect.objectContaining({ width: 200, height: 255 }),
      }),
    );
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
});
