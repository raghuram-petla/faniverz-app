import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// Mock dnd-kit modules
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn().mockReturnValue([]),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: vi.fn().mockReturnValue({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
  verticalListSortingStrategy: 'vertical',
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: vi.fn().mockReturnValue('') } },
}));

vi.mock('@shared/imageUrl', () => ({
  getImageUrl: vi.fn((_url: string) => null),
}));

import { SortableList } from '@/components/movie-edit/SortableCastList';
import type { MovieCast } from '@/lib/types';

function makeCastEntry(overrides: Partial<MovieCast> = {}): MovieCast {
  return {
    id: 'cast-1',
    movie_id: 'movie-1',
    actor_id: 'actor-1',
    role_name: 'Hero',
    display_order: 0,
    credit_type: 'cast',
    role_order: 1,
    actor: {
      id: 'actor-1',
      name: 'Mahesh Babu',
      photo_url: null,
      person_type: 'actor',
      birth_date: null,
      gender: null,
      biography: null,
      place_of_birth: null,
      height_cm: null,
      tmdb_person_id: null,
      imdb_id: null,
      known_for_department: null,
      also_known_as: null,
      death_date: null,
      instagram_id: null,
      twitter_id: null,
      created_by: null,
      created_at: '2025-01-01',
    },
    ...overrides,
  };
}

describe('SortableList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when items array is empty', () => {
    const { container } = render(
      <SortableList items={[]} onDragEnd={vi.fn()} onRemove={vi.fn()} pendingIds={new Set()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders cast entries with actor name', () => {
    const entry = makeCastEntry();
    render(
      <SortableList
        items={[entry]}
        onDragEnd={vi.fn()}
        onRemove={vi.fn()}
        pendingIds={new Set()}
      />,
    );
    expect(screen.getByText('Mahesh Babu')).toBeInTheDocument();
  });

  it('shows role_name when present', () => {
    const entry = makeCastEntry({ role_name: 'Villain' });
    render(
      <SortableList
        items={[entry]}
        onDragEnd={vi.fn()}
        onRemove={vi.fn()}
        pendingIds={new Set()}
      />,
    );
    expect(screen.getByText('Villain')).toBeInTheDocument();
  });

  it('does not show role_name element when role_name is null', () => {
    const entry = makeCastEntry({ role_name: null });
    render(
      <SortableList
        items={[entry]}
        onDragEnd={vi.fn()}
        onRemove={vi.fn()}
        pendingIds={new Set()}
      />,
    );
    // role_name is null so no role text besides the actor name
    expect(screen.queryByText('Hero')).not.toBeInTheDocument();
  });

  it('shows role_order badge when role_order is set', () => {
    const entry = makeCastEntry({ role_order: 3 });
    render(
      <SortableList
        items={[entry]}
        onDragEnd={vi.fn()}
        onRemove={vi.fn()}
        pendingIds={new Set()}
      />,
    );
    expect(screen.getByText('#3')).toBeInTheDocument();
  });

  it('does not show role_order badge when role_order is null', () => {
    const entry = makeCastEntry({ role_order: null });
    render(
      <SortableList
        items={[entry]}
        onDragEnd={vi.fn()}
        onRemove={vi.fn()}
        pendingIds={new Set()}
      />,
    );
    expect(screen.queryByText(/^#/)).not.toBeInTheDocument();
  });

  it('calls onRemove with isPending=false for DB items', () => {
    const onRemove = vi.fn();
    const entry = makeCastEntry({ id: 'cast-db-1' });
    render(
      <SortableList
        items={[entry]}
        onDragEnd={vi.fn()}
        onRemove={onRemove}
        pendingIds={new Set()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Remove Mahesh Babu/i }));
    expect(onRemove).toHaveBeenCalledWith('cast-db-1', false);
  });

  it('calls onRemove with isPending=true for pending items', () => {
    const onRemove = vi.fn();
    const pendingId = 'pending-uuid-cast-1';
    const entry = makeCastEntry({ id: pendingId });
    render(
      <SortableList
        items={[entry]}
        onDragEnd={vi.fn()}
        onRemove={onRemove}
        pendingIds={new Set([pendingId])}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Remove Mahesh Babu/i }));
    expect(onRemove).toHaveBeenCalledWith(pendingId, true);
  });

  it('renders actor photo when photo_url is set', () => {
    const entry = makeCastEntry({
      actor: {
        id: 'actor-1',
        name: 'Prabhas',
        photo_url: 'https://cdn.example.com/actor.jpg',
        person_type: 'actor',
        birth_date: null,
        gender: null,
        biography: null,
        place_of_birth: null,
        height_cm: null,
        tmdb_person_id: null,
        imdb_id: null,
        known_for_department: null,
        also_known_as: null,
        death_date: null,
        instagram_id: null,
        twitter_id: null,
        created_by: null,
        created_at: '2025-01-01',
      },
    });
    render(
      <SortableList
        items={[entry]}
        onDragEnd={vi.fn()}
        onRemove={vi.fn()}
        pendingIds={new Set()}
      />,
    );
    const img = screen.getByAltText('Prabhas');
    expect(img).toBeInTheDocument();
    // getImageUrl returns null, falls back to raw URL
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/actor.jpg');
  });

  it('falls back to actor_id when actor relation is null', () => {
    const entry = makeCastEntry({ actor: undefined, actor_id: 'raw-actor-id' });
    render(
      <SortableList
        items={[entry]}
        onDragEnd={vi.fn()}
        onRemove={vi.fn()}
        pendingIds={new Set()}
      />,
    );
    expect(screen.getByText('raw-actor-id')).toBeInTheDocument();
  });

  it('renders multiple cast entries', () => {
    const entries = [
      makeCastEntry({ id: 'c-1', actor: { ...makeCastEntry().actor!, name: 'Actor One' } }),
      makeCastEntry({ id: 'c-2', actor: { ...makeCastEntry().actor!, name: 'Actor Two' } }),
    ];
    render(
      <SortableList
        items={entries}
        onDragEnd={vi.fn()}
        onRemove={vi.fn()}
        pendingIds={new Set()}
      />,
    );
    expect(screen.getByText('Actor One')).toBeInTheDocument();
    expect(screen.getByText('Actor Two')).toBeInTheDocument();
  });

  it('applies dragging opacity style when isDragging=true', async () => {
    const { useSortable } = await import('@dnd-kit/sortable');
    vi.mocked(useSortable).mockReturnValueOnce({
      attributes: {} as never,
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: undefined,
      isDragging: true,
    } as never);

    const entry = makeCastEntry();
    render(
      <SortableList
        items={[entry]}
        onDragEnd={vi.fn()}
        onRemove={vi.fn()}
        pendingIds={new Set()}
      />,
    );
    // The outer div for the item should have opacity:0.5 when dragging
    const itemContainer = screen.getByText('Mahesh Babu').closest('.flex.items-center')!;
    expect(itemContainer).toHaveStyle({ opacity: 0.5 });
  });
});
