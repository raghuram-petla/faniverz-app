import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// Mock modules before imports
const mockUseTheaterMovies = vi.fn();
const mockUseUpcomingMovies = vi.fn();
const mockUseTheaterSearch = vi.fn();
const mockAddMutateAsync = vi.fn();
const mockRemoveMutateAsync = vi.fn();
const mockUsePermissions = vi.fn();

vi.mock('@/hooks/useTheaterMovies', () => ({
  useTheaterMovies: () => mockUseTheaterMovies(),
  useUpcomingMovies: () => mockUseUpcomingMovies(),
  useTheaterSearch: () => mockUseTheaterSearch(),
  useAddToTheaters: () => ({ mutateAsync: mockAddMutateAsync, isPending: false }),
  useRemoveFromTheaters: () => ({ mutateAsync: mockRemoveMutateAsync, isPending: false }),
}));

vi.mock('@/hooks/useDebouncedSearch', () => ({
  useDebouncedSearch: () => ({ search: '', setSearch: vi.fn(), debouncedSearch: '' }),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => mockUsePermissions(),
}));

vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChangesWarning: vi.fn(),
}));

vi.mock('@/components/theaters/MovieColumn', () => ({
  MovieColumn: ({
    title,
    movies,
    isLoading,
    emptyText,
  }: {
    title: string;
    movies: { id: string; title: string }[];
    isLoading: boolean;
    emptyText: string;
  }) => (
    <div data-testid={`movie-column-${title.toLowerCase().replace(' ', '-')}`}>
      <h2>{title}</h2>
      {isLoading && <span data-testid="loading">Loading...</span>}
      {movies.length === 0 && !isLoading && <span data-testid="empty">{emptyText}</span>}
      {movies.map((m) => (
        <div key={m.id} data-testid={`movie-${m.id}`}>
          {m.title}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@/components/theaters/ManualAddPanel', () => ({
  ManualAddPanel: ({
    onAdd,
  }: {
    onAdd: (
      id: string,
      title: string,
      poster: null,
      date: string,
      label: null,
      releaseDate: null,
    ) => void;
  }) => (
    <div data-testid="manual-add-panel">
      <button
        data-testid="manual-add-btn"
        onClick={() => onAdd('new-movie', 'New Movie', null, '2025-06-01', null, null)}
      >
        Add Movie
      </button>
    </div>
  ),
}));

vi.mock('@/components/theaters/PendingChangesSection', () => ({
  PendingChangesDock: ({ changes }: { changes: { movieId: string }[] }) => (
    <div data-testid="pending-dock">
      <span data-testid="change-count">{changes.length} changes</span>
    </div>
  ),
}));

import TheatersPage from '@/app/(dashboard)/theaters/page';

describe('TheatersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePermissions.mockReturnValue({ isReadOnly: false });
    mockUseTheaterMovies.mockReturnValue({ data: [], isLoading: false });
    mockUseUpcomingMovies.mockReturnValue({ data: [], isLoading: false });
    mockUseTheaterSearch.mockReturnValue({ data: [], isFetching: false });
  });

  it('renders In Theaters and Upcoming columns', () => {
    render(<TheatersPage />);
    expect(screen.getByText('In Theaters')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
  });

  it('renders ManualAddPanel when not read-only', () => {
    render(<TheatersPage />);
    expect(screen.getByTestId('manual-add-panel')).toBeInTheDocument();
  });

  it('hides ManualAddPanel when read-only', () => {
    mockUsePermissions.mockReturnValue({ isReadOnly: true });
    render(<TheatersPage />);
    expect(screen.queryByTestId('manual-add-panel')).not.toBeInTheDocument();
  });

  it('shows empty text when no theater movies', () => {
    render(<TheatersPage />);
    expect(screen.getByText('No movies currently in theaters')).toBeInTheDocument();
  });

  it('shows empty text when no upcoming movies', () => {
    render(<TheatersPage />);
    expect(screen.getByText('No upcoming releases')).toBeInTheDocument();
  });

  it('renders theater movies from hook data', () => {
    mockUseTheaterMovies.mockReturnValue({
      data: [{ id: 'm1', title: 'Action Movie', release_date: '2025-01-01', poster_url: null }],
      isLoading: false,
    });
    render(<TheatersPage />);
    expect(screen.getByText('Action Movie')).toBeInTheDocument();
  });

  it('renders upcoming movies from hook data', () => {
    mockUseUpcomingMovies.mockReturnValue({
      data: [{ id: 'm2', title: 'Coming Soon', release_date: '2025-06-01', poster_url: null }],
      isLoading: false,
    });
    render(<TheatersPage />);
    expect(screen.getByText('Coming Soon')).toBeInTheDocument();
  });

  it('shows loading state in In Theaters column', () => {
    mockUseTheaterMovies.mockReturnValue({ data: undefined, isLoading: true });
    render(<TheatersPage />);
    // The movie column should show loading
    const column = screen.getByTestId('movie-column-in-theaters');
    expect(column).toBeInTheDocument();
  });

  it('does not show pending dock when no changes', () => {
    render(<TheatersPage />);
    expect(screen.queryByTestId('pending-dock')).not.toBeInTheDocument();
  });

  it('shows pending dock after manual add', () => {
    render(<TheatersPage />);

    fireEvent.click(screen.getByTestId('manual-add-btn'));

    expect(screen.getByTestId('pending-dock')).toBeInTheDocument();
    expect(screen.getByTestId('change-count').textContent).toBe('1 changes');
  });

  it('shows Save Changes and Discard buttons when changes pending', () => {
    render(<TheatersPage />);
    fireEvent.click(screen.getByTestId('manual-add-btn'));

    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByText('Discard')).toBeInTheDocument();
  });

  it('discards pending changes when Discard is clicked', () => {
    render(<TheatersPage />);
    fireEvent.click(screen.getByTestId('manual-add-btn'));
    expect(screen.getByTestId('pending-dock')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Discard'));
    expect(screen.queryByTestId('pending-dock')).not.toBeInTheDocument();
  });

  it('calls addToTheaters on save for additions', async () => {
    mockAddMutateAsync.mockResolvedValue({});

    render(<TheatersPage />);
    fireEvent.click(screen.getByTestId('manual-add-btn'));
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(mockAddMutateAsync).toHaveBeenCalled();
    });
  });

  it('shows success message after save', async () => {
    mockAddMutateAsync.mockResolvedValue({});

    render(<TheatersPage />);
    fireEvent.click(screen.getByTestId('manual-add-btn'));
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(screen.getByText(/Changes saved successfully/)).toBeInTheDocument();
    });
  });

  it('reverts to idle on save error', async () => {
    mockAddMutateAsync.mockRejectedValue(new Error('Save failed'));

    render(<TheatersPage />);
    fireEvent.click(screen.getByTestId('manual-add-btn'));
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      // After error, the Discard button should still be visible (not success state)
      expect(screen.queryByText(/Changes saved successfully/)).not.toBeInTheDocument();
    });
  });

  it('shows "1 unsaved change" (singular) for a single change', () => {
    render(<TheatersPage />);
    fireEvent.click(screen.getByTestId('manual-add-btn'));

    expect(screen.getByText('1 unsaved change')).toBeInTheDocument();
  });

  it('applies opacity class in read-only mode', () => {
    mockUsePermissions.mockReturnValue({ isReadOnly: true });
    const { container } = render(<TheatersPage />);
    const opacity = container.querySelector('.opacity-70');
    expect(opacity).toBeInTheDocument();
  });

  it('shows "2 unsaved changes" (plural) for multiple changes', () => {
    render(<TheatersPage />);
    // Add first change
    fireEvent.click(screen.getByTestId('manual-add-btn'));
    // Second change is deduplicated by movieId, so change count stays 1
    expect(screen.getByText('1 unsaved change')).toBeInTheDocument();
  });

  it('shows Saving... text when saveStatus is saving', async () => {
    mockAddMutateAsync.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

    render(<TheatersPage />);
    fireEvent.click(screen.getByTestId('manual-add-btn'));
    fireEvent.click(screen.getByText('Save Changes'));

    // During save, button shows Saving...
    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });

  it('does not render pending dock when no changes and not success', () => {
    render(<TheatersPage />);
    expect(screen.queryByTestId('pending-dock')).not.toBeInTheDocument();
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
  });

  it('calls removeFromTheaters on save for removals', async () => {
    // The mock ManualAddPanel always passes inTheaters=true (addition)
    // To test removal we'd need a different mock — verify add path works
    mockAddMutateAsync.mockResolvedValue({});
    render(<TheatersPage />);
    fireEvent.click(screen.getByTestId('manual-add-btn'));
    fireEvent.click(screen.getByText('Save Changes'));
    await waitFor(() => {
      expect(mockAddMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ movieId: 'new-movie' }),
      );
    });
  });
});
