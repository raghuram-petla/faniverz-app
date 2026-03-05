jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: { white: '#fff', red600: '#dc2626' },
  }),
}));

jest.mock('@/styles/tabs/feed.styles', () => ({
  createFeaturedCardStyles: () => new Proxy({}, { get: () => ({}) }),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FeaturedFeedCard } from '../FeaturedFeedCard';
import type { NewsFeedItem } from '@shared/types';

const makeItem = (overrides: Partial<NewsFeedItem> = {}): NewsFeedItem => ({
  id: '1',
  feed_type: 'video',
  content_type: 'trailer',
  title: 'Featured Trailer',
  description: 'A great trailer',
  movie_id: 'm1',
  source_table: 'movie_videos',
  source_id: 'v1',
  thumbnail_url: 'https://example.com/thumb.jpg',
  youtube_id: 'abc123',
  duration: '2:30',
  is_pinned: false,
  is_featured: true,
  display_order: 0,
  published_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  movie: { id: 'm1', title: 'Featured Movie', poster_url: null, release_date: '2024-03-01' },
  ...overrides,
});

describe('FeaturedFeedCard', () => {
  it('renders title', () => {
    const { getByText } = render(<FeaturedFeedCard item={makeItem()} onPress={jest.fn()} />);
    expect(getByText('Featured Trailer')).toBeTruthy();
  });

  it('renders movie title', () => {
    const { getByText } = render(<FeaturedFeedCard item={makeItem()} onPress={jest.fn()} />);
    expect(getByText('Featured Movie')).toBeTruthy();
  });

  it('renders "Featured" badge', () => {
    const { getByText } = render(<FeaturedFeedCard item={makeItem()} onPress={jest.fn()} />);
    expect(getByText('Featured')).toBeTruthy();
  });

  it('renders duration', () => {
    const { getByText } = render(
      <FeaturedFeedCard item={makeItem({ duration: '3:00' })} onPress={jest.fn()} />,
    );
    expect(getByText('3:00')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const item = makeItem();
    const { getByLabelText } = render(<FeaturedFeedCard item={item} onPress={onPress} />);
    fireEvent.press(getByLabelText('Featured: Featured Trailer'));
    expect(onPress).toHaveBeenCalledWith(item);
  });

  it('renders poster type without play button', () => {
    const item = makeItem({ feed_type: 'poster', content_type: 'poster', youtube_id: null });
    render(<FeaturedFeedCard item={item} onPress={jest.fn()} />);
  });

  it('renders without movie', () => {
    const item = makeItem({ movie: undefined });
    const { getByText } = render(<FeaturedFeedCard item={item} onPress={jest.fn()} />);
    expect(getByText('Featured Trailer')).toBeTruthy();
  });

  it('renders without thumbnail', () => {
    const item = makeItem({ thumbnail_url: null });
    render(<FeaturedFeedCard item={item} onPress={jest.fn()} />);
  });
});
