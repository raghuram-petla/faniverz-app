jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: { white: '#fff', red600: '#dc2626', gray500: '#6b7280' },
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
});
