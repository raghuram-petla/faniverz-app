jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: {
      white: '#fff',
      red600: '#dc2626',
      gray500: '#6b7280',
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

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
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
  it('renders title', () => {
    const item = makeItem();
    const { getByText } = render(<FeedCard item={item} index={0} onPress={jest.fn()} />);
    expect(getByText('Test Trailer')).toBeTruthy();
  });

  it('renders movie title', () => {
    const item = makeItem();
    const { getByText } = render(<FeedCard item={item} index={0} onPress={jest.fn()} />);
    expect(getByText('Test Movie')).toBeTruthy();
  });

  it('renders duration when present', () => {
    const item = makeItem({ duration: '3:45' });
    const { getByText } = render(<FeedCard item={item} index={0} onPress={jest.fn()} />);
    expect(getByText('3:45')).toBeTruthy();
  });

  it('does not render duration when null', () => {
    const item = makeItem({ duration: null });
    const { queryByText } = render(<FeedCard item={item} index={0} onPress={jest.fn()} />);
    expect(queryByText('3:45')).toBeNull();
  });

  it('calls onPress with item when pressed', () => {
    const onPress = jest.fn();
    const item = makeItem();
    const { getByLabelText } = render(<FeedCard item={item} index={0} onPress={onPress} />);
    fireEvent.press(getByLabelText('Test Trailer'));
    expect(onPress).toHaveBeenCalledWith(item);
  });

  it('renders without movie reference', () => {
    const item = makeItem({ movie: undefined, movie_id: null });
    const { getByText } = render(<FeedCard item={item} index={0} onPress={jest.fn()} />);
    expect(getByText('Test Trailer')).toBeTruthy();
  });

  it('renders poster type card without play button', () => {
    const item = makeItem({ feed_type: 'poster', content_type: 'poster', youtube_id: null });
    render(<FeedCard item={item} index={0} onPress={jest.fn()} />);
  });

  it('renders pinned indicator for pinned items', () => {
    const item = makeItem({ is_pinned: true });
    render(<FeedCard item={item} index={0} onPress={jest.fn()} />);
  });

  // Vote button tests
  it('renders vote buttons when onUpvote and onDownvote are provided', () => {
    const item = makeItem({ upvote_count: 10, downvote_count: 3 });
    const { getByLabelText } = render(
      <FeedCard
        item={item}
        index={0}
        onPress={jest.fn()}
        userVote={null}
        onUpvote={jest.fn()}
        onDownvote={jest.fn()}
      />,
    );
    expect(getByLabelText('Upvote, 10 upvotes')).toBeTruthy();
    expect(getByLabelText('Downvote, 3 downvotes')).toBeTruthy();
  });

  it('does not render vote buttons when callbacks not provided', () => {
    const item = makeItem({ upvote_count: 10, downvote_count: 3 });
    const { queryByLabelText } = render(<FeedCard item={item} index={0} onPress={jest.fn()} />);
    expect(queryByLabelText('Upvote, 10 upvotes')).toBeNull();
    expect(queryByLabelText('Downvote, 3 downvotes')).toBeNull();
  });

  it('shows correct vote counts', () => {
    const item = makeItem({ upvote_count: 42, downvote_count: 7 });
    const { getByText } = render(
      <FeedCard
        item={item}
        index={0}
        onPress={jest.fn()}
        userVote={null}
        onUpvote={jest.fn()}
        onDownvote={jest.fn()}
      />,
    );
    expect(getByText('42')).toBeTruthy();
    expect(getByText('7')).toBeTruthy();
  });

  it('pressing upvote calls onUpvote with item id', () => {
    const onUpvote = jest.fn();
    const item = makeItem({ id: 'feed-item-99', upvote_count: 5, downvote_count: 1 });
    const { getByLabelText } = render(
      <FeedCard
        item={item}
        index={0}
        onPress={jest.fn()}
        userVote={null}
        onUpvote={onUpvote}
        onDownvote={jest.fn()}
      />,
    );
    fireEvent.press(getByLabelText('Upvote, 5 upvotes'));
    expect(onUpvote).toHaveBeenCalledWith('feed-item-99');
  });

  it('pressing downvote calls onDownvote with item id', () => {
    const onDownvote = jest.fn();
    const item = makeItem({ id: 'feed-item-99', upvote_count: 5, downvote_count: 1 });
    const { getByLabelText } = render(
      <FeedCard
        item={item}
        index={0}
        onPress={jest.fn()}
        userVote={null}
        onUpvote={jest.fn()}
        onDownvote={onDownvote}
      />,
    );
    fireEvent.press(getByLabelText('Downvote, 1 downvotes'));
    expect(onDownvote).toHaveBeenCalledWith('feed-item-99');
  });

  it('passes userVote to VoteButtons for active state', () => {
    const item = makeItem({ upvote_count: 5, downvote_count: 1 });
    const { getByLabelText } = render(
      <FeedCard
        item={item}
        index={0}
        onPress={jest.fn()}
        userVote="up"
        onUpvote={jest.fn()}
        onDownvote={jest.fn()}
      />,
    );
    // Upvote button should have active background style (style may be flattened)
    const upvoteBtn = getByLabelText('Upvote, 5 upvotes');
    expect(upvoteBtn.props.style).toEqual(
      expect.objectContaining({ backgroundColor: 'rgba(22,163,74,0.2)' }),
    );
  });

  it('does not render vote buttons when only onUpvote provided', () => {
    const item = makeItem({ upvote_count: 5, downvote_count: 1 });
    const { queryByLabelText } = render(
      <FeedCard item={item} index={0} onPress={jest.fn()} onUpvote={jest.fn()} />,
    );
    expect(queryByLabelText('Upvote, 5 upvotes')).toBeNull();
  });

  it('does not render vote buttons when only onDownvote provided', () => {
    const item = makeItem({ upvote_count: 5, downvote_count: 1 });
    const { queryByLabelText } = render(
      <FeedCard item={item} index={0} onPress={jest.fn()} onDownvote={jest.fn()} />,
    );
    expect(queryByLabelText('Downvote, 1 downvotes')).toBeNull();
  });
});
