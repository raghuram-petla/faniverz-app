import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdminFeedCard } from '@/components/feed/AdminFeedCard';
import type { NewsFeedItem } from '@/lib/types';

// Mock @dnd-kit/sortable
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => '' } },
}));

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
  youtube_id: 'abc',
  duration: '2:30',
  is_pinned: false,
  is_featured: false,
  display_order: 0,
  published_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  movie: { id: 'm1', title: 'Test Movie', poster_url: null, release_date: '2024-03-01' },
  ...overrides,
});

describe('AdminFeedCard', () => {
  const defaultProps = {
    onTogglePin: vi.fn(),
    onToggleFeature: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  it('renders item title', () => {
    render(<AdminFeedCard item={makeItem()} {...defaultProps} />);
    expect(screen.getByText('Test Trailer')).toBeInTheDocument();
  });

  it('renders content type badge', () => {
    render(<AdminFeedCard item={makeItem()} {...defaultProps} />);
    expect(screen.getByText('TRAILER')).toBeInTheDocument();
  });

  it('renders movie title', () => {
    render(<AdminFeedCard item={makeItem()} {...defaultProps} />);
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    render(<AdminFeedCard item={makeItem()} {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Edit'));
    expect(defaultProps.onEdit).toHaveBeenCalledWith('1');
  });

  it('calls onDelete when delete button is clicked', () => {
    render(<AdminFeedCard item={makeItem()} {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Delete'));
    expect(defaultProps.onDelete).toHaveBeenCalledWith('1');
  });

  it('calls onTogglePin when pin button is clicked', () => {
    render(<AdminFeedCard item={makeItem()} {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Pin to top'));
    expect(defaultProps.onTogglePin).toHaveBeenCalledWith('1', true);
  });

  it('calls onToggleFeature when feature button is clicked', () => {
    render(<AdminFeedCard item={makeItem()} {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Feature'));
    expect(defaultProps.onToggleFeature).toHaveBeenCalledWith('1', true);
  });

  it('shows unpin title for pinned items', () => {
    render(<AdminFeedCard item={makeItem({ is_pinned: true })} {...defaultProps} />);
    expect(screen.getByTitle('Unpin')).toBeInTheDocument();
  });

  it('shows unfeature title for featured items', () => {
    render(<AdminFeedCard item={makeItem({ is_featured: true })} {...defaultProps} />);
    expect(screen.getByTitle('Unfeature')).toBeInTheDocument();
  });
});
