import { render, screen, fireEvent } from '@testing-library/react';
import { ActorSearchDropdown } from '@/components/movie-edit/ActorSearchDropdown';
import type { Actor } from '@/lib/types';

const mockActors = [
  { id: 'a1', name: 'Mahesh Babu', photo_url: null },
  { id: 'a2', name: 'Prabhas', photo_url: 'https://example.com/photo.jpg' },
] as Actor[];

describe('ActorSearchDropdown', () => {
  it('renders search input with placeholder "Type to search\u2026"', () => {
    render(
      <ActorSearchDropdown
        actors={[]}
        searchQuery=""
        onSearchChange={vi.fn()}
        onSelect={vi.fn()}
        selectedActorId=""
      />,
    );
    expect(screen.getByPlaceholderText('Type to search\u2026')).toBeInTheDocument();
  });

  it('renders "Person *" label', () => {
    render(
      <ActorSearchDropdown
        actors={[]}
        searchQuery=""
        onSearchChange={vi.fn()}
        onSelect={vi.fn()}
        selectedActorId=""
      />,
    );
    expect(screen.getByText('Person *')).toBeInTheDocument();
  });

  it('calls onSearchChange when user types', () => {
    const onSearchChange = vi.fn();
    render(
      <ActorSearchDropdown
        actors={[]}
        searchQuery=""
        onSearchChange={onSearchChange}
        onSelect={vi.fn()}
        selectedActorId=""
      />,
    );
    fireEvent.change(screen.getByPlaceholderText('Type to search\u2026'), {
      target: { value: 'Ma' },
    });
    expect(onSearchChange).toHaveBeenCalledWith('Ma');
  });

  it('shows dropdown with actor names when query >= 2 chars and no selectedActorId', () => {
    render(
      <ActorSearchDropdown
        actors={mockActors}
        searchQuery="Ma"
        onSearchChange={vi.fn()}
        onSelect={vi.fn()}
        selectedActorId=""
      />,
    );
    // Focus the input to open dropdown
    fireEvent.focus(screen.getByPlaceholderText('Type to search\u2026'));
    expect(screen.getByText('Mahesh Babu')).toBeInTheDocument();
    expect(screen.getByText('Prabhas')).toBeInTheDocument();
  });

  it('shows "No matching actors found" when query >= 2 chars and actors is empty', () => {
    render(
      <ActorSearchDropdown
        actors={[]}
        searchQuery="Xy"
        onSearchChange={vi.fn()}
        onSelect={vi.fn()}
        selectedActorId=""
      />,
    );
    fireEvent.focus(screen.getByPlaceholderText('Type to search\u2026'));
    expect(screen.getByText('No matching actors found')).toBeInTheDocument();
  });

  it('calls onSelect when actor clicked', () => {
    const onSelect = vi.fn();
    render(
      <ActorSearchDropdown
        actors={mockActors}
        searchQuery="Ma"
        onSearchChange={vi.fn()}
        onSelect={onSelect}
        selectedActorId=""
      />,
    );
    fireEvent.focus(screen.getByPlaceholderText('Type to search\u2026'));
    fireEvent.click(screen.getByText('Mahesh Babu'));
    expect(onSelect).toHaveBeenCalledWith(mockActors[0]);
  });

  it('shows quick-add button when no results and onQuickAdd provided', () => {
    render(
      <ActorSearchDropdown
        actors={[]}
        searchQuery="New Actor"
        onSearchChange={vi.fn()}
        onSelect={vi.fn()}
        selectedActorId=""
        onQuickAdd={vi.fn()}
      />,
    );
    fireEvent.focus(screen.getByPlaceholderText('Type to search\u2026'));
    expect(screen.getByText('Create "New Actor"')).toBeInTheDocument();
  });

  it('does not show quick-add button when onQuickAdd is not provided', () => {
    render(
      <ActorSearchDropdown
        actors={[]}
        searchQuery="New Actor"
        onSearchChange={vi.fn()}
        onSelect={vi.fn()}
        selectedActorId=""
      />,
    );
    fireEvent.focus(screen.getByPlaceholderText('Type to search\u2026'));
    expect(screen.queryByText(/Create/)).not.toBeInTheDocument();
  });

  it('calls onQuickAdd with trimmed name when quick-add clicked', () => {
    const onQuickAdd = vi.fn().mockResolvedValue(undefined);
    render(
      <ActorSearchDropdown
        actors={[]}
        searchQuery="  New Actor  "
        onSearchChange={vi.fn()}
        onSelect={vi.fn()}
        selectedActorId=""
        onQuickAdd={onQuickAdd}
      />,
    );
    fireEvent.focus(screen.getByPlaceholderText('Type to search\u2026'));
    fireEvent.click(screen.getByText('Create "New Actor"'));
    expect(onQuickAdd).toHaveBeenCalledWith('New Actor');
  });

  it('shows "Creating\u2026" when quickAddPending is true', () => {
    render(
      <ActorSearchDropdown
        actors={[]}
        searchQuery="New Actor"
        onSearchChange={vi.fn()}
        onSelect={vi.fn()}
        selectedActorId=""
        onQuickAdd={vi.fn()}
        quickAddPending={true}
      />,
    );
    fireEvent.focus(screen.getByPlaceholderText('Type to search\u2026'));
    expect(screen.getByText('Creating\u2026')).toBeInTheDocument();
  });

  it('selects actor with ArrowDown + Enter', () => {
    const onSelect = vi.fn();
    render(
      <ActorSearchDropdown
        actors={mockActors}
        searchQuery="Ma"
        onSearchChange={vi.fn()}
        onSelect={onSelect}
        selectedActorId=""
      />,
    );
    const input = screen.getByPlaceholderText('Type to search…');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(mockActors[0]);
  });

  it('navigates to second actor with two ArrowDown presses', () => {
    const onSelect = vi.fn();
    render(
      <ActorSearchDropdown
        actors={mockActors}
        searchQuery="Ma"
        onSearchChange={vi.fn()}
        onSelect={onSelect}
        selectedActorId=""
      />,
    );
    const input = screen.getByPlaceholderText('Type to search…');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(mockActors[1]);
  });

  it('wraps around with ArrowUp from top', () => {
    const onSelect = vi.fn();
    render(
      <ActorSearchDropdown
        actors={mockActors}
        searchQuery="Ma"
        onSearchChange={vi.fn()}
        onSelect={onSelect}
        selectedActorId=""
      />,
    );
    const input = screen.getByPlaceholderText('Type to search…');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(mockActors[1]);
  });

  it('closes dropdown on Escape', () => {
    render(
      <ActorSearchDropdown
        actors={mockActors}
        searchQuery="Ma"
        onSearchChange={vi.fn()}
        onSelect={vi.fn()}
        selectedActorId=""
      />,
    );
    const input = screen.getByPlaceholderText('Type to search…');
    fireEvent.focus(input);
    expect(screen.getByText('Mahesh Babu')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByText('Mahesh Babu')).not.toBeInTheDocument();
  });

  it('selects quick-add with keyboard when no actors match', () => {
    const onQuickAdd = vi.fn().mockResolvedValue(undefined);
    render(
      <ActorSearchDropdown
        actors={[]}
        searchQuery="New Actor"
        onSearchChange={vi.fn()}
        onSelect={vi.fn()}
        selectedActorId=""
        onQuickAdd={onQuickAdd}
      />,
    );
    const input = screen.getByPlaceholderText('Type to search…');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onQuickAdd).toHaveBeenCalledWith('New Actor');
  });

  it('does not show dropdown when selectedActorId is set', () => {
    render(
      <ActorSearchDropdown
        actors={mockActors}
        searchQuery="Ma"
        onSearchChange={vi.fn()}
        onSelect={vi.fn()}
        selectedActorId="a1"
      />,
    );
    fireEvent.focus(screen.getByPlaceholderText('Type to search\u2026'));
    expect(screen.queryByText('Mahesh Babu')).not.toBeInTheDocument();
    expect(screen.queryByText('Prabhas')).not.toBeInTheDocument();
  });
});
