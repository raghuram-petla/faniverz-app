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
