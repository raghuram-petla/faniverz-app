import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeedMobilePreview } from '@/components/feed/FeedMobilePreview';
import type { NewsFeedItem } from '@/lib/types';

// Mock preview components
vi.mock('@/components/preview/DeviceFrame', () => ({
  DeviceFrame: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="device-frame">{children}</div>
  ),
}));

vi.mock('@/components/preview/DeviceSelector', () => ({
  DeviceSelector: () => <div data-testid="device-selector" />,
}));

vi.mock('@shared/constants', () => ({
  DEVICES: [{ name: 'iPhone 15', width: 393, height: 852, safeAreaTop: 59, platform: 'ios' }],
}));

const makeItem = (
  id: string,
  title: string,
  overrides: Partial<NewsFeedItem> = {},
): NewsFeedItem => ({
  id,
  feed_type: 'video',
  content_type: 'trailer',
  title,
  description: null,
  movie_id: null,
  source_table: null,
  source_id: null,
  thumbnail_url: null,
  youtube_id: null,
  duration: null,
  is_pinned: false,
  is_featured: false,
  display_order: 0,
  upvote_count: 0,
  downvote_count: 0,
  published_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('FeedMobilePreview', () => {
  it('renders device frame', () => {
    render(<FeedMobilePreview items={[]} featuredItems={[]} />);
    expect(screen.getByTestId('device-frame')).toBeInTheDocument();
  });

  it('renders device selector', () => {
    render(<FeedMobilePreview items={[]} featuredItems={[]} />);
    expect(screen.getByTestId('device-selector')).toBeInTheDocument();
  });

  it('renders News Feed header', () => {
    render(<FeedMobilePreview items={[]} featuredItems={[]} />);
    expect(screen.getByText('News Feed')).toBeInTheDocument();
  });

  it('renders filter tabs', () => {
    render(<FeedMobilePreview items={[]} featuredItems={[]} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Trailers')).toBeInTheDocument();
  });

  it('renders feed items', () => {
    const items = [makeItem('1', 'Test Item')];
    render(<FeedMobilePreview items={items} featuredItems={[]} />);
    expect(screen.getByText('Test Item')).toBeInTheDocument();
  });

  it('renders featured section when featured items exist', () => {
    const featured = [makeItem('f1', 'Featured Item', { is_featured: true })];
    render(<FeedMobilePreview items={[]} featuredItems={featured} />);
    expect(screen.getByText('Featured')).toBeInTheDocument();
    expect(screen.getByText('Featured Item')).toBeInTheDocument();
  });
});
