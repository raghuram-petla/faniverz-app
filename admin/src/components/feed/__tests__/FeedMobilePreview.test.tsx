import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('@shared/constants', () => ({
  DEVICES: [
    {
      id: 'iphone-14',
      label: 'iPhone 14',
      width: 390,
      height: 844,
      safeAreaTop: 59,
      safeAreaBottom: 34,
    },
    {
      id: 'iphone-se',
      label: 'iPhone SE',
      width: 375,
      height: 667,
      safeAreaTop: 20,
      safeAreaBottom: 0,
    },
  ],
  FEED_CONTENT_TYPE_COLORS: {
    trailer: '#EF4444',
    update: '#6B7280',
    song: '#8B5CF6',
  },
  FEED_CONTENT_TYPE_LABELS: {
    trailer: 'Trailer',
    update: 'Update',
    song: 'Song',
  },
  // @contract: FEED_TAB_LABELS sourced from shared/constants; mock mirrors production values
  FEED_TAB_LABELS: ['All', 'Trailers', 'Songs', 'Posters', 'BTS', 'Updates'],
}));

vi.mock('@shared/colors', () => ({
  colors: {
    black: '#000000',
    white: '#FFFFFF',
    red600: '#DC2626',
    zinc900: '#18181B',
    zinc700: '#3F3F46',
    gray500: '#6B7280',
    yellow400: '#FBBF24',
  },
}));

vi.mock('@/components/preview/DeviceFrame', () => ({
  DeviceFrame: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="device-frame">{children}</div>
  ),
}));

vi.mock('@/components/preview/DeviceSelector', () => ({
  DeviceSelector: ({
    selected,
    onChange,
  }: {
    selected: { label: string };
    onChange: (d: unknown) => void;
  }) => (
    <div data-testid="device-selector">
      <span>{selected.label}</span>
      <button
        onClick={() =>
          onChange({
            id: 'iphone-se',
            label: 'iPhone SE',
            width: 375,
            height: 667,
            safeAreaTop: 20,
            safeAreaBottom: 0,
          })
        }
      >
        Switch Device
      </button>
    </div>
  ),
}));

import { FeedMobilePreview } from '@/components/feed/FeedMobilePreview';
import type { NewsFeedItem } from '@/lib/types';

function makeItem(overrides: Partial<NewsFeedItem> = {}): NewsFeedItem {
  return {
    id: `item-${Math.random()}`,
    feed_type: 'video',
    content_type: 'trailer',
    title: 'Test Trailer',
    description: null,
    youtube_id: 'abc123',
    thumbnail_url: null,
    is_pinned: false,
    is_featured: false,
    upvote_count: 0,
    downvote_count: 0,
    view_count: 0,
    comment_count: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    movie: null,
    ...overrides,
  } as NewsFeedItem;
}

describe('FeedMobilePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders device selector', () => {
    render(<FeedMobilePreview items={[]} />);
    expect(screen.getByTestId('device-selector')).toBeInTheDocument();
  });

  it('renders device frame', () => {
    render(<FeedMobilePreview items={[]} />);
    expect(screen.getByTestId('device-frame')).toBeInTheDocument();
  });

  it('renders feed header with "Faniverz" text', () => {
    render(<FeedMobilePreview items={[]} />);
    expect(screen.getByText('Faniverz')).toBeInTheDocument();
  });

  it('renders feed tab pills', () => {
    render(<FeedMobilePreview items={[]} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Trailers')).toBeInTheDocument();
    expect(screen.getByText('Songs')).toBeInTheDocument();
  });

  it('renders feed items', () => {
    render(<FeedMobilePreview items={[makeItem({ title: 'My Trailer' })]} />);
    expect(screen.getByText('My Trailer')).toBeInTheDocument();
  });

  it('caps display at 10 items', () => {
    const items = Array.from({ length: 15 }, (_, i) =>
      makeItem({ id: `item-${i}`, title: `Movie ${i}` }),
    );
    render(<FeedMobilePreview items={items} />);
    // Items 0-9 should appear (10 items max)
    expect(screen.getByText('Movie 0')).toBeInTheDocument();
    expect(screen.getByText('Movie 9')).toBeInTheDocument();
    expect(screen.queryByText('Movie 10')).not.toBeInTheDocument();
  });

  it('shows content type label from FEED_CONTENT_TYPE_LABELS', () => {
    render(<FeedMobilePreview items={[makeItem({ content_type: 'trailer' })]} />);
    expect(screen.getByText('Trailer')).toBeInTheDocument();
  });

  it('shows raw content_type when label is not in FEED_CONTENT_TYPE_LABELS', () => {
    render(<FeedMobilePreview items={[makeItem({ content_type: 'unknown-type' as never })]} />);
    expect(screen.getByText('unknown-type')).toBeInTheDocument();
  });

  it('shows "📌 Pinned" label for pinned items', () => {
    render(<FeedMobilePreview items={[makeItem({ is_pinned: true })]} />);
    expect(screen.getByText('📌 Pinned')).toBeInTheDocument();
  });

  it('shows "⭐ Featured" label for featured items (not pinned)', () => {
    render(<FeedMobilePreview items={[makeItem({ is_featured: true })]} />);
    expect(screen.getByText('⭐ Featured')).toBeInTheDocument();
  });

  it('does not show pinned/featured label when neither is set', () => {
    render(<FeedMobilePreview items={[makeItem({ is_pinned: false, is_featured: false })]} />);
    expect(screen.queryByText('📌 Pinned')).not.toBeInTheDocument();
    expect(screen.queryByText('⭐ Featured')).not.toBeInTheDocument();
  });

  it('prioritizes pinned over featured', () => {
    render(<FeedMobilePreview items={[makeItem({ is_pinned: true, is_featured: true })]} />);
    expect(screen.getByText('📌 Pinned')).toBeInTheDocument();
    expect(screen.queryByText('⭐ Featured')).not.toBeInTheDocument();
  });

  it('shows movie name when movie relation is present', () => {
    render(
      <FeedMobilePreview
        items={[makeItem({ movie: { id: 'movie-1', title: 'Baahubali' } as never })]}
      />,
    );
    expect(screen.getByText('Baahubali')).toBeInTheDocument();
  });

  it('does not show movie name when movie is null', () => {
    render(<FeedMobilePreview items={[makeItem({ movie: undefined })]} />);
    // Should still render the card without a movie name
    expect(screen.getByText('Test Trailer')).toBeInTheDocument();
  });

  it('renders thumbnail image when thumbnail_url is set', () => {
    const { container } = render(
      <FeedMobilePreview items={[makeItem({ thumbnail_url: 'https://example.com/thumb.jpg' })]} />,
    );
    expect(container.querySelector('img')).toBeInTheDocument();
  });

  it('uses 16:9 aspect ratio for youtube videos', () => {
    const { container } = render(
      <FeedMobilePreview
        items={[makeItem({ thumbnail_url: 'https://example.com/thumb.jpg', youtube_id: 'abc123' })]}
      />,
    );
    const img = container.querySelector('img');
    const wrapper = img?.parentElement;
    expect(wrapper?.style.aspectRatio).toBe('16/9');
  });

  it('uses 40:51 aspect ratio for non-youtube thumbnails (poster)', () => {
    const { container } = render(
      <FeedMobilePreview
        items={[makeItem({ thumbnail_url: 'https://example.com/thumb.jpg', youtube_id: null })]}
      />,
    );
    const img = container.querySelector('img');
    const wrapper = img?.parentElement;
    expect(wrapper?.style.aspectRatio).toBe('40/51');
  });

  it('shows upvote/downvote/view/comment counts', () => {
    render(
      <FeedMobilePreview
        items={[
          makeItem({ upvote_count: 5, downvote_count: 2, view_count: 100, comment_count: 8 }),
        ]}
      />,
    );
    expect(screen.getByText('▲ 5')).toBeInTheDocument();
    expect(screen.getByText('▼ 2')).toBeInTheDocument();
    expect(screen.getByText('👁 100')).toBeInTheDocument();
    expect(screen.getByText('💬 8')).toBeInTheDocument();
  });

  it('shows 0 for null counts', () => {
    render(
      <FeedMobilePreview
        items={[makeItem({ upvote_count: null as never, downvote_count: null as never })]}
      />,
    );
    expect(screen.getByText('▲ 0')).toBeInTheDocument();
    expect(screen.getByText('▼ 0')).toBeInTheDocument();
  });

  it('shows 0 for null view_count and comment_count', () => {
    render(
      <FeedMobilePreview
        items={[makeItem({ view_count: null as never, comment_count: null as never })]}
      />,
    );
    expect(screen.getByText('👁 0')).toBeInTheDocument();
    expect(screen.getByText('💬 0')).toBeInTheDocument();
  });

  it('allows switching device via device selector', () => {
    render(<FeedMobilePreview items={[]} />);
    expect(screen.getByText('iPhone 14')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Switch Device'));
    expect(screen.getByText('iPhone SE')).toBeInTheDocument();
  });
});
