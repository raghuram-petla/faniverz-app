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
    onQuickAdd,
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
      <button onClick={() => onQuickAdd('Quick Actor')} data-testid="quick-add-btn">
        Quick Add
      </button>
    </div>
  ),
}));

vi.mock('@/components/movie-edit/SortableCastList', () => ({
  SortableList: ({
    items,
    onRemove,
    onDragEnd,
  }: {
    items: MovieCast[];
    onRemove: (id: string, isPending: boolean) => void;
    onDragEnd: (event: unknown) => void;
    pendingIds: Set<string>;
  }) => (
    <div data-testid="sortable-list">
      {items.map((item) => (
        <div key={item.id}>
          <span>{item.actor?.name ?? item.role_name}</span>
          <button onClick={() => onRemove(item.id, false)} data-testid={`remove-${item.id}`}>
            Remove
          </button>
        </div>
      ))}
      {items.length >= 2 && (
        <>
          <button
            onClick={() =>
              onDragEnd({
                active: { id: items[0].id },
                over: { id: items[1].id },
              })
            }
          >
            Drag
          </button>
          <button
            onClick={() =>
              onDragEnd({
                active: { id: items[0].id },
                over: { id: items[0].id },
              })
            }
            data-testid="drag-same"
          >
            DragSame
          </button>
          <button
            onClick={() =>
              onDragEnd({
                active: { id: items[0].id },
                over: null,
              })
            }
            data-testid="drag-no-over"
          >
            DragNoOver
          </button>
          <button
            onClick={() =>
              onDragEnd({
                active: { id: 'nonexistent' },
                over: { id: items[1].id },
              })
            }
            data-testid="drag-invalid"
          >
            DragInvalid
          </button>
        </>
      )}
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
  actor: { id: 'actor-1', name: 'Actor One', photo_url: null } as Actor,
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
    const castItems = [
      makeCast({ id: 'c1', actor: { id: 'a1', name: 'Star', photo_url: null } as Actor }),
    ];
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
        actor: { id: 'a2', name: 'Director Name', photo_url: null } as Actor,
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

  it('calls onAdd with cast entry when actor is selected and form submitted', () => {
    const onAdd = vi.fn();
    render(<CastSection {...defaultProps} showAddForm onAdd={onAdd} />);

    // Select an actor via the mock dropdown
    fireEvent.click(screen.getByTestId('select-actor'));

    // Now submit
    fireEvent.submit(screen.getByText('Add Cast / Crew').closest('form')!);

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_id: 'actor-1',
        credit_type: 'cast',
        role_order: null, // cast members always get null
      }),
    );
  });

  it('calls onAdd with crew entry when type is switched to crew', () => {
    const onAdd = vi.fn();
    render(<CastSection {...defaultProps} showAddForm onAdd={onAdd} />);

    // Switch to crew type
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'crew' } });

    // Select an actor
    fireEvent.click(screen.getByTestId('select-actor'));

    // Submit
    fireEvent.submit(screen.getByText('Add Cast / Crew').closest('form')!);

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_id: 'actor-1',
        credit_type: 'crew',
      }),
    );
  });

  it('shows Role Title label when type is crew', () => {
    render(<CastSection {...defaultProps} showAddForm />);
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'crew' } });
    expect(screen.getByText('Role Title')).toBeInTheDocument();
  });

  it('shows Role Order select when type is crew', () => {
    render(<CastSection {...defaultProps} showAddForm />);
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'crew' } });
    expect(screen.getByText('Role Order')).toBeInTheDocument();
  });

  it('does not show Role Order select when type is cast', () => {
    render(<CastSection {...defaultProps} showAddForm />);
    expect(screen.queryByText('Role Order')).not.toBeInTheDocument();
  });

  it('does not submit when actor_id is empty and no search query', () => {
    const onAdd = vi.fn();
    render(<CastSection {...defaultProps} showAddForm onAdd={onAdd} />);

    // Submit without selecting actor
    fireEvent.submit(screen.getByText('Add Cast / Crew').closest('form')!);

    expect(onAdd).not.toHaveBeenCalled();
  });

  it('shows alert when no actor selected but search query is present', () => {
    const onAdd = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<CastSection {...defaultProps} showAddForm onAdd={onAdd} castSearchQuery="John" />);

    // Submit without selecting actor (but with search query in mock)
    fireEvent.submit(screen.getByText('Add Cast / Crew').closest('form')!);

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('select an actor'));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('resets form and closes after successful add', () => {
    const onAdd = vi.fn();
    const setCastSearchQuery = vi.fn();
    const onCloseAddForm = vi.fn();

    render(
      <CastSection
        {...defaultProps}
        showAddForm
        onAdd={onAdd}
        setCastSearchQuery={setCastSearchQuery}
        onCloseAddForm={onCloseAddForm}
      />,
    );

    fireEvent.click(screen.getByTestId('select-actor'));
    fireEvent.submit(screen.getByText('Add Cast / Crew').closest('form')!);

    expect(setCastSearchQuery).toHaveBeenCalledWith('');
    expect(onCloseAddForm).toHaveBeenCalled();
  });

  it('sets actor_id when actor is selected from dropdown', () => {
    const onAdd = vi.fn();
    render(<CastSection {...defaultProps} showAddForm onAdd={onAdd} />);

    fireEvent.click(screen.getByTestId('select-actor'));

    // Add Entry should now be enabled
    expect(screen.getByText('Add Entry')).not.toBeDisabled();
  });

  it('clears actor_id when search query changes', () => {
    render(<CastSection {...defaultProps} showAddForm />);

    // First select an actor
    fireEvent.click(screen.getByTestId('select-actor'));

    // Then change the search query (simulates typing)
    fireEvent.change(screen.getByLabelText('actor-search'), { target: { value: 'New' } });

    // Add Entry should be disabled again since actor_id was cleared
    expect(screen.getByText('Add Entry')).toBeDisabled();
  });

  it('calls handleQuickAdd when quick add is triggered', async () => {
    mockCreateMutateAsync.mockResolvedValue({ id: 'new-actor-id', name: 'New Actor' });
    const setCastSearchQuery = vi.fn();

    // Override the ActorSearchDropdown mock to expose onQuickAdd
    const { unmount } = render(
      <CastSection {...defaultProps} showAddForm setCastSearchQuery={setCastSearchQuery} />,
    );
    unmount();
  });

  it('handleQuickAdd creates actor and sets form state', async () => {
    mockCreateMutateAsync.mockResolvedValue({ id: 'new-actor-id', name: 'Quick Actor' });
    const setCastSearchQuery = vi.fn();

    render(<CastSection {...defaultProps} showAddForm setCastSearchQuery={setCastSearchQuery} />);

    fireEvent.click(screen.getByTestId('quick-add-btn'));
    await vi.waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Quick Actor', person_type: 'actor' }),
      );
    });
    expect(setCastSearchQuery).toHaveBeenCalledWith('Quick Actor');
  });

  it('handleQuickAdd uses technician person_type for crew', async () => {
    mockCreateMutateAsync.mockResolvedValue({ id: 'new-crew-id', name: 'Quick Actor' });
    const setCastSearchQuery = vi.fn();

    render(<CastSection {...defaultProps} showAddForm setCastSearchQuery={setCastSearchQuery} />);

    // Switch to crew type
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'crew' } });

    fireEvent.click(screen.getByTestId('quick-add-btn'));
    await vi.waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ person_type: 'technician' }),
      );
    });
  });

  it('calls onReorder when cast drag happens', () => {
    const onReorder = vi.fn();
    const castItems = [
      makeCast({ id: 'c1', credit_type: 'cast', display_order: 0 }),
      makeCast({ id: 'c2', credit_type: 'cast', display_order: 1 }),
    ];

    render(<CastSection {...defaultProps} visibleCast={castItems} onReorder={onReorder} />);

    // Trigger drag end via the mock
    const dragButtons = screen.getAllByText('Drag');
    // The first sortable list is cast
    fireEvent.click(dragButtons[0]);

    expect(onReorder).toHaveBeenCalled();
  });

  it('includes role_order when submitting crew member with role_order set', () => {
    const onAdd = vi.fn();
    render(<CastSection {...defaultProps} showAddForm onAdd={onAdd} />);

    // Switch to crew type
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'crew' } });

    // Set role order
    fireEvent.change(screen.getByLabelText('Role Order'), { target: { value: '1' } });

    // Set role name
    fireEvent.change(screen.getByLabelText('Role Title'), { target: { value: 'Director' } });

    // Select an actor
    fireEvent.click(screen.getByTestId('select-actor'));

    // Submit
    fireEvent.submit(screen.getByText('Add Cast / Crew').closest('form')!);

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        credit_type: 'crew',
        role_name: 'Director',
        role_order: 1,
      }),
    );
  });

  it('does not call onReorder when dragging to same position', () => {
    const onReorder = vi.fn();
    const castItems = [
      makeCast({ id: 'c1', credit_type: 'cast', display_order: 0 }),
      makeCast({ id: 'c2', credit_type: 'cast', display_order: 1 }),
    ];

    render(<CastSection {...defaultProps} visibleCast={castItems} onReorder={onReorder} />);
    fireEvent.click(screen.getByTestId('drag-same'));
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('does not call onReorder when over is null', () => {
    const onReorder = vi.fn();
    const castItems = [
      makeCast({ id: 'c1', credit_type: 'cast', display_order: 0 }),
      makeCast({ id: 'c2', credit_type: 'cast', display_order: 1 }),
    ];

    render(<CastSection {...defaultProps} visibleCast={castItems} onReorder={onReorder} />);
    fireEvent.click(screen.getByTestId('drag-no-over'));
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('does not call onReorder when active id not found in items', () => {
    const onReorder = vi.fn();
    const castItems = [
      makeCast({ id: 'c1', credit_type: 'cast', display_order: 0 }),
      makeCast({ id: 'c2', credit_type: 'cast', display_order: 1 }),
    ];

    render(<CastSection {...defaultProps} visibleCast={castItems} onReorder={onReorder} />);
    fireEvent.click(screen.getByTestId('drag-invalid'));
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('submits crew entry with null role_order when role_order is empty', () => {
    const onAdd = vi.fn();
    render(<CastSection {...defaultProps} showAddForm onAdd={onAdd} />);

    // Switch to crew type
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'crew' } });

    // Don't set role_order — leave it empty

    // Select an actor
    fireEvent.click(screen.getByTestId('select-actor'));

    // Submit
    fireEvent.submit(screen.getByText('Add Cast / Crew').closest('form')!);

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        credit_type: 'crew',
        role_order: null, // empty string → null
      }),
    );
  });

  it('submits cast entry with null role_name when empty', () => {
    const onAdd = vi.fn();
    render(<CastSection {...defaultProps} showAddForm onAdd={onAdd} />);

    // Select an actor
    fireEvent.click(screen.getByTestId('select-actor'));

    // Submit without setting role_name
    fireEvent.submit(screen.getByText('Add Cast / Crew').closest('form')!);

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        role_name: null, // empty string → null
      }),
    );
  });

  it('does not call onReorder when crew drag to same position', () => {
    const onReorder = vi.fn();
    const crewItems = [
      makeCast({ id: 'cr1', credit_type: 'crew', display_order: 0 }),
      makeCast({ id: 'cr2', credit_type: 'crew', display_order: 1 }),
    ];

    render(<CastSection {...defaultProps} visibleCast={crewItems} onReorder={onReorder} />);
    fireEvent.click(screen.getByTestId('drag-same'));
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('does not call onReorder when crew drag has no over', () => {
    const onReorder = vi.fn();
    const crewItems = [
      makeCast({ id: 'cr1', credit_type: 'crew', display_order: 0 }),
      makeCast({ id: 'cr2', credit_type: 'crew', display_order: 1 }),
    ];

    render(<CastSection {...defaultProps} visibleCast={crewItems} onReorder={onReorder} />);
    fireEvent.click(screen.getByTestId('drag-no-over'));
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('does not call onReorder when crew drag has invalid active id', () => {
    const onReorder = vi.fn();
    const crewItems = [
      makeCast({ id: 'cr1', credit_type: 'crew', display_order: 0 }),
      makeCast({ id: 'cr2', credit_type: 'crew', display_order: 1 }),
    ];

    render(<CastSection {...defaultProps} visibleCast={crewItems} onReorder={onReorder} />);
    fireEvent.click(screen.getByTestId('drag-invalid'));
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('calls onReorder when crew drag happens', () => {
    const onReorder = vi.fn();
    const crewItems = [
      makeCast({ id: 'cr1', credit_type: 'crew', display_order: 0 }),
      makeCast({ id: 'cr2', credit_type: 'crew', display_order: 1 }),
    ];

    render(<CastSection {...defaultProps} visibleCast={crewItems} onReorder={onReorder} />);

    const dragButtons = screen.getAllByText('Drag');
    fireEvent.click(dragButtons[0]);

    expect(onReorder).toHaveBeenCalled();
  });
});
