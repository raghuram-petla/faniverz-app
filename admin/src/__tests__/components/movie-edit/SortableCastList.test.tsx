import { render, screen, fireEvent } from '@testing-library/react';
import { SortableList } from '@/components/movie-edit/SortableCastList';
import type { MovieCast } from '@/lib/types';

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
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: vi.fn(),
}));

vi.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string) => url,
}));

const baseActor = {
  id: 'actor-1',
  name: 'John Doe',
  photo_url: null,
  tmdb_person_id: null,
  birth_date: null,
  death_date: null,
  person_type: 'actor' as const,
  gender: null,
  nationality: null,
  biography: null,
  height_cm: null,
  known_for_department: null,
  popularity: null,
  profile_path: null,
  also_known_as: null,
  place_of_birth: null,
  imdb_id: null,
  instagram_id: null,
  twitter_id: null,
  created_at: '',
  updated_at: '',
  created_by: null,
};

const serverItem: MovieCast = {
  id: 'db-uuid-1234',
  movie_id: 'movie-1',
  actor_id: 'actor-1',
  credit_type: 'cast',
  role_name: 'Hero',
  role_order: null,
  display_order: 0,
  actor: baseActor,
};

const pendingUuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const pendingItem: MovieCast = {
  id: pendingUuid,
  movie_id: 'movie-1',
  actor_id: 'actor-2',
  credit_type: 'cast',
  role_name: 'Villain',
  role_order: null,
  display_order: 1,
  actor: { ...baseActor, id: 'actor-2', name: 'Jane Smith' },
};

describe('SortableList', () => {
  afterEach(() => vi.clearAllMocks());

  it('calls onRemove with isPending=false for server items', () => {
    const onRemove = vi.fn();
    render(
      <SortableList
        items={[serverItem]}
        onDragEnd={vi.fn()}
        onRemove={onRemove}
        pendingIds={new Set()}
      />,
    );
    fireEvent.click(screen.getByLabelText('Remove John Doe'));
    expect(onRemove).toHaveBeenCalledWith('db-uuid-1234', false);
  });

  it('calls onRemove with isPending=true for pending items (UUID _id)', () => {
    // @sync: after _id migration, pending items carry plain UUIDs — not 'pending-cast-N' strings
    // This test ensures the Set-based lookup (not startsWith) is used
    const onRemove = vi.fn();
    render(
      <SortableList
        items={[pendingItem]}
        onDragEnd={vi.fn()}
        onRemove={onRemove}
        pendingIds={new Set([pendingUuid])}
      />,
    );
    fireEvent.click(screen.getByLabelText('Remove Jane Smith'));
    expect(onRemove).toHaveBeenCalledWith(pendingUuid, true);
  });

  it('correctly differentiates pending from server items in mixed list', () => {
    const onRemove = vi.fn();
    render(
      <SortableList
        items={[serverItem, pendingItem]}
        onDragEnd={vi.fn()}
        onRemove={onRemove}
        pendingIds={new Set([pendingUuid])}
      />,
    );
    fireEvent.click(screen.getByLabelText('Remove John Doe'));
    expect(onRemove).toHaveBeenCalledWith('db-uuid-1234', false);

    fireEvent.click(screen.getByLabelText('Remove Jane Smith'));
    expect(onRemove).toHaveBeenCalledWith(pendingUuid, true);
  });

  it('returns null when items list is empty', () => {
    const { container } = render(
      <SortableList items={[]} onDragEnd={vi.fn()} onRemove={vi.fn()} pendingIds={new Set()} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
