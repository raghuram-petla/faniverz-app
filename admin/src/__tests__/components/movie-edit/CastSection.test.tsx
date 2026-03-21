import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CastSection } from '@/components/movie-edit/CastSection';
import type { MovieCast, Actor } from '@/lib/types';

const mockCreateMutateAsync = vi.fn();

vi.mock('@/hooks/useAdminCast', () => ({
  useCreateActor: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/components/common/FormField', () => ({
  FormInput: ({
    label,
    value,
    onValueChange,
    placeholder,
  }: {
    label: string;
    value: string;
    onValueChange: (v: string) => void;
    placeholder?: string;
    variant?: string;
    type?: string;
  }) => (
    <div>
      <label>{label}</label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onValueChange(e.target.value)}
        aria-label={label}
      />
    </div>
  ),
  FormSelect: ({
    label,
    value,
    options,
    onValueChange,
  }: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onValueChange: (v: string) => void;
    variant?: string;
    placeholder?: string;
  }) => (
    <div>
      <label>{label}</label>
      <select value={value} onChange={(e) => onValueChange(e.target.value)} aria-label={label}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  ),
}));

vi.mock('@/components/common/Button', () => ({
  Button: ({
    children,
    disabled,
    type,
    onClick,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    type?: string;
    onClick?: () => void;
    variant?: string;
    size?: string;
    icon?: React.ReactNode;
  }) => (
    <button type={type as 'submit' | 'button'} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/movie-edit/ActorSearchDropdown', () => ({
  ActorSearchDropdown: ({
    searchQuery,
    onSearchChange,
    onSelect,
  }: {
    searchQuery: string;
    onSearchChange: (q: string) => void;
    onSelect: (a: Actor) => void;
    actors: Actor[];
    selectedActorId: string;
    onQuickAdd: (n: string) => void;
    quickAddPending: boolean;
  }) => (
    <div>
      <input
        aria-label="actor-search"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <button
        onClick={() => onSelect({ id: 'actor-1', name: 'Test Actor' } as Actor)}
        data-testid="select-actor"
      >
        Select Actor
      </button>
    </div>
  ),
}));

vi.mock('@/components/movie-edit/SortableCastList', () => ({
  SortableList: ({
    items,
    onRemove,
  }: {
    items: MovieCast[];
    onRemove: (id: string, isPending: boolean) => void;
    onDragEnd: unknown;
    pendingIds: Set<string>;
  }) => (
    <div data-testid="sortable-list">
      {items.map((item) => (
        <div key={item.id}>
          <span>{item.actors?.name ?? item.role_name}</span>
          <button onClick={() => onRemove(item.id, false)} data-testid={`remove-${item.id}`}>
            Remove
          </button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: (arr: unknown[], from: number, to: number) => {
    const result = [...arr];
    const [moved] = result.splice(from, 1);
    result.splice(to, 0, moved);
    return result;
  },
}));

vi.mock('@dnd-kit/core', () => ({}));

vi.mock('lucide-react', () => ({
  Plus: () => <span data-testid="plus-icon" />,
}));

const makeCast = (overrides: Partial<MovieCast> = {}): MovieCast => ({
  id: 'cast-1',
  movie_id: 'movie-1',
  actor_id: 'actor-1',
  credit_type: 'cast',
  role_name: 'Hero',
  role_order: null,
  display_order: 0,
  actors: { id: 'actor-1', name: 'Actor One', photo_url: null },
  ...overrides,
});

const actors: Actor[] = [
  { id: 'actor-1', name: 'Actor One', photo_url: null } as Actor,
  { id: 'actor-2', name: 'Actor Two', photo_url: null } as Actor,
];

const defaultProps = {
  visibleCast: [] as MovieCast[],
  actors,
  castSearchQuery: '',
  setCastSearchQuery: vi.fn(),
  onAdd: vi.fn(),
  onRemove: vi.fn(),
  onReorder: vi.fn(),
  showAddForm: false,
  onCloseAddForm: vi.fn(),
  pendingIds: new Set<string>(),
};

beforeEach(() => vi.clearAllMocks());

describe('CastSection', () => {
  it('shows empty state when no cast or crew', () => {
    render(<CastSection {...defaultProps} />);
    expect(screen.getByText('No cast members added yet.')).toBeInTheDocument();
    expect(screen.getByText('No crew members added yet.')).toBeInTheDocument();
  });

  it('renders Cast and Crew headings', () => {
    render(<CastSection {...defaultProps} />);
    expect(screen.getByText('Cast')).toBeInTheDocument();
    expect(screen.getByText('Crew')).toBeInTheDocument();
  });

  it('renders cast items in sortable list', () => {
    const castItems = [makeCast({ id: 'c1', actors: { id: 'a1', name: 'Star', photo_url: null } })];
    render(<CastSection {...defaultProps} visibleCast={castItems} />);
    expect(screen.getByText('Star')).toBeInTheDocument();
    expect(screen.queryByText('No cast members added yet.')).not.toBeInTheDocument();
  });

  it('renders crew items separately', () => {
    const crewItems = [
      makeCast({
        id: 'c2',
        credit_type: 'crew',
        role_name: 'Director',
        actors: { id: 'a2', name: 'Director Name', photo_url: null },
      }),
    ];
    render(<CastSection {...defaultProps} visibleCast={crewItems} />);
    expect(screen.getByText('Director Name')).toBeInTheDocument();
    expect(screen.queryByText('No crew members added yet.')).not.toBeInTheDocument();
  });

  it('does not show add form when showAddForm is false', () => {
    render(<CastSection {...defaultProps} />);
    expect(screen.queryByText('Add Cast / Crew')).not.toBeInTheDocument();
  });

  it('shows add form when showAddForm is true', () => {
    render(<CastSection {...defaultProps} showAddForm />);
    expect(screen.getByText('Add Cast / Crew')).toBeInTheDocument();
    expect(screen.getByText('Add Entry')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('disables Add Entry button when no actor selected', () => {
    render(<CastSection {...defaultProps} showAddForm />);
    expect(screen.getByText('Add Entry')).toBeDisabled();
  });

  it('calls onCloseAddForm and resets form on Cancel', () => {
    render(<CastSection {...defaultProps} showAddForm />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onCloseAddForm).toHaveBeenCalled();
    expect(defaultProps.setCastSearchQuery).toHaveBeenCalledWith('');
  });

  it('shows Character Name label when type is cast', () => {
    render(<CastSection {...defaultProps} showAddForm />);
    expect(screen.getByText('Character Name')).toBeInTheDocument();
  });

  it('calls onRemove when remove button clicked on cast item', () => {
    const castItems = [makeCast({ id: 'c1' })];
    render(<CastSection {...defaultProps} visibleCast={castItems} />);
    fireEvent.click(screen.getByTestId('remove-c1'));
    expect(defaultProps.onRemove).toHaveBeenCalledWith('c1', false);
  });
});
