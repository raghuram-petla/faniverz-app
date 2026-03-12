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

vi.mock('@shared/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@shared/constants')>();
  return {
    ...actual,
    DEVICES: [{ name: 'iPhone 15', width: 393, height: 852, safeAreaTop: 59, platform: 'ios' }],
  };
});

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
  view_count: 0,
  comment_count: 0,
  published_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('FeedMobilePreview', () => {
  it('renders device frame', () => {
    render(<FeedMobilePreview items={[]} />);
    expect(screen.getByTestId('device-frame')).toBeInTheDocument();
  });

  it('renders device selector', () => {
    render(<FeedMobilePreview items={[]} />);
    expect(screen.getByTestId('device-selector')).toBeInTheDocument();
  });

  it('renders Faniverz header', () => {
    render(<FeedMobilePreview items={[]} />);
    expect(screen.getByText('Faniverz')).toBeInTheDocument();
  });

  it('renders filter tabs', () => {
    render(<FeedMobilePreview items={[]} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Trailers')).toBeInTheDocument();
    expect(screen.getByText('Updates')).toBeInTheDocument();
  });

  it('renders feed items in single column', () => {
    const items = [makeItem('1', 'Test Item')];
    render(<FeedMobilePreview items={items} />);
    expect(screen.getByText('Test Item')).toBeInTheDocument();
  });

  it('renders pinned indicator for pinned items', () => {
    const items = [makeItem('p1', 'Pinned Post', { is_pinned: true })];
    render(<FeedMobilePreview items={items} />);
    expect(screen.getByText('📌 Pinned')).toBeInTheDocument();
  });

  it('renders featured indicator for featured items', () => {
    const items = [makeItem('f1', 'Featured Post', { is_featured: true })];
    render(<FeedMobilePreview items={items} />);
    expect(screen.getByText('⭐ Featured')).toBeInTheDocument();
  });

  it('renders content type badge', () => {
    const items = [makeItem('1', 'Test Trailer', { content_type: 'trailer' })];
    render(<FeedMobilePreview items={items} />);
    expect(screen.getByText('Trailer')).toBeInTheDocument();
  });

  it('renders movie name when available', () => {
    const items = [
      makeItem('1', 'Test Trailer', {
        movie: { id: 'm1', title: 'Pushpa 2', poster_url: null, release_date: null },
      }),
    ];
    render(<FeedMobilePreview items={items} />);
    expect(screen.getByText('Pushpa 2')).toBeInTheDocument();
  });
});
