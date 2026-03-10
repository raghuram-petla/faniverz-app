import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SortableFeedList } from '@/components/feed/SortableFeedList';
import type { NewsFeedItem } from '@/lib/types';

// Mock dnd-kit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
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

const makeItem = (id: string, title: string): NewsFeedItem => ({
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
});

describe('SortableFeedList', () => {
  const defaultProps = {
    onDragEnd: vi.fn(),
    onTogglePin: vi.fn(),
    onToggleFeature: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  it('renders empty state when no items', () => {
    render(<SortableFeedList items={[]} {...defaultProps} />);
    expect(screen.getByText('No feed items found for this filter.')).toBeInTheDocument();
  });

  it('renders items', () => {
    const items = [makeItem('1', 'First Item'), makeItem('2', 'Second Item')];
    render(<SortableFeedList items={items} {...defaultProps} />);
    expect(screen.getByText('First Item')).toBeInTheDocument();
    expect(screen.getByText('Second Item')).toBeInTheDocument();
  });
});
