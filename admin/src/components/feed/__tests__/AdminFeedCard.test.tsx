import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockUseSortable = vi.fn().mockReturnValue({
  attributes: {},
  listeners: {},
  setNodeRef: vi.fn(),
  transform: null,
  transition: undefined,
  isDragging: false,
});

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: (...args: unknown[]) => mockUseSortable(...args),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: (t: unknown) => (t ? 'transform(...)' : ''),
    },
  },
}));

import { AdminFeedCard } from '@/components/feed/AdminFeedCard';
import type { NewsFeedItem } from '@/lib/types';

function makeItem(overrides: Partial<NewsFeedItem> = {}): NewsFeedItem {
  return {
    id: 'feed-1',
    feed_type: 'video',
    title: 'Pushpa 2 Trailer',
    content_type: 'trailer',
    description: null,
    source_table: null,
    source_id: null,
    youtube_id: null,
    view_count: 0,
    comment_count: 0,
    bookmark_count: 0,
    thumbnail_url: 'https://cdn/thumb.jpg',
    movie_id: 'movie-1',
    movie: { id: 'movie-1', title: 'Pushpa 2', poster_url: null, release_date: null },
    is_pinned: false,
    is_featured: false,
    display_order: 0,
    upvote_count: 100,
    downvote_count: 5,
    created_at: '2025-01-01T00:00:00Z',
    published_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

const defaultHandlers = {
  onTogglePin: vi.fn(),
  onToggleFeature: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
};

describe('AdminFeedCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the item title', () => {
    render(<AdminFeedCard item={makeItem()} {...defaultHandlers} />);
    expect(screen.getByText('Pushpa 2 Trailer')).toBeInTheDocument();
  });

  it('renders content_type badge in uppercase', () => {
    render(<AdminFeedCard item={makeItem()} {...defaultHandlers} />);
    expect(screen.getByText('TRAILER')).toBeInTheDocument();
  });

  it('renders movie title when movie is set', () => {
    render(<AdminFeedCard item={makeItem()} {...defaultHandlers} />);
    expect(screen.getByText('Pushpa 2')).toBeInTheDocument();
  });

  it('does not render movie title when movie is null', () => {
    render(<AdminFeedCard item={makeItem({ movie: null as never })} {...defaultHandlers} />);
    expect(screen.queryByText('Pushpa 2')).not.toBeInTheDocument();
  });

  it('renders thumbnail when thumbnail_url is set', () => {
    const { container } = render(<AdminFeedCard item={makeItem()} {...defaultHandlers} />);
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://cdn/thumb.jpg');
  });

  it('renders fallback div when thumbnail_url is null', () => {
    const { container } = render(
      <AdminFeedCard
        item={makeItem({ thumbnail_url: null as unknown as string })}
        {...defaultHandlers}
      />,
    );
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('renders upvote count', () => {
    render(<AdminFeedCard item={makeItem({ upvote_count: 42 })} {...defaultHandlers} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders downvote count', () => {
    render(<AdminFeedCard item={makeItem({ downvote_count: 7 })} {...defaultHandlers} />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('uses correct badge color for known content_type (trailer = bg-blue-600)', () => {
    const { container } = render(
      <AdminFeedCard item={makeItem({ content_type: 'trailer' })} {...defaultHandlers} />,
    );
    expect(container.querySelector('.bg-blue-600')).toBeInTheDocument();
  });

  it('uses correct badge color for song (bg-purple-600)', () => {
    const { container } = render(
      <AdminFeedCard item={makeItem({ content_type: 'song' })} {...defaultHandlers} />,
    );
    expect(container.querySelector('.bg-purple-600')).toBeInTheDocument();
  });

  it('uses fallback gray badge for unknown content_type', () => {
    const { container } = render(
      <AdminFeedCard item={makeItem({ content_type: 'unknown-type' })} {...defaultHandlers} />,
    );
    expect(container.querySelector('.bg-gray-600')).toBeInTheDocument();
  });

  it('calls onTogglePin with flipped is_pinned when pin button is clicked', () => {
    const onTogglePin = vi.fn();
    render(
      <AdminFeedCard
        item={makeItem({ is_pinned: false })}
        {...defaultHandlers}
        onTogglePin={onTogglePin}
      />,
    );
    fireEvent.click(screen.getByTitle('Pin to top'));
    expect(onTogglePin).toHaveBeenCalledWith('feed-1', true);
  });

  it('shows "Unpin" title when item is pinned', () => {
    render(<AdminFeedCard item={makeItem({ is_pinned: true })} {...defaultHandlers} />);
    expect(screen.getByTitle('Unpin')).toBeInTheDocument();
  });

  it('calls onTogglePin with false when unpinning', () => {
    const onTogglePin = vi.fn();
    render(
      <AdminFeedCard
        item={makeItem({ is_pinned: true })}
        {...defaultHandlers}
        onTogglePin={onTogglePin}
      />,
    );
    fireEvent.click(screen.getByTitle('Unpin'));
    expect(onTogglePin).toHaveBeenCalledWith('feed-1', false);
  });

  it('calls onToggleFeature when feature button is clicked', () => {
    const onToggleFeature = vi.fn();
    render(
      <AdminFeedCard
        item={makeItem({ is_featured: false })}
        {...defaultHandlers}
        onToggleFeature={onToggleFeature}
      />,
    );
    fireEvent.click(screen.getByTitle('Feature'));
    expect(onToggleFeature).toHaveBeenCalledWith('feed-1', true);
  });

  it('shows "Unfeature" title when item is featured', () => {
    render(<AdminFeedCard item={makeItem({ is_featured: true })} {...defaultHandlers} />);
    expect(screen.getByTitle('Unfeature')).toBeInTheDocument();
  });

  it('calls onEdit with item id when Edit is clicked', () => {
    const onEdit = vi.fn();
    render(<AdminFeedCard item={makeItem()} {...defaultHandlers} onEdit={onEdit} />);
    fireEvent.click(screen.getByTitle('Edit'));
    expect(onEdit).toHaveBeenCalledWith('feed-1');
  });

  it('calls onDelete with item id when Delete is clicked', () => {
    const onDelete = vi.fn();
    render(<AdminFeedCard item={makeItem()} {...defaultHandlers} onDelete={onDelete} />);
    fireEvent.click(screen.getByTitle('Delete'));
    expect(onDelete).toHaveBeenCalledWith('feed-1');
  });

  it('applies pinned styles when is_pinned is true', () => {
    const { container } = render(
      <AdminFeedCard item={makeItem({ is_pinned: true })} {...defaultHandlers} />,
    );
    // Pin button should have active color class
    const pinBtn = container.querySelector('[title="Unpin"]');
    expect(pinBtn?.className).toContain('text-status-red');
  });

  it('applies featured styles when is_featured is true', () => {
    const { container } = render(
      <AdminFeedCard item={makeItem({ is_featured: true })} {...defaultHandlers} />,
    );
    const featBtn = container.querySelector('[title="Unfeature"]');
    expect(featBtn?.className).toContain('text-status-yellow');
  });

  it('applies dragging styles (opacity and z-index) when isDragging is true', () => {
    mockUseSortable.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: undefined,
      isDragging: true,
    });

    const { container } = render(<AdminFeedCard item={makeItem()} {...defaultHandlers} />);
    const card = container.firstElementChild as HTMLElement;
    expect(card.style.opacity).toBe('0.5');
    expect(card.style.zIndex).toBe('10');
  });
});
