import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockRefreshMovieMutateAsync = vi.fn();
const mockRefreshActorMutateAsync = vi.fn();
const mockUseStaleItems = vi.fn();

vi.mock('@/hooks/useSync', () => ({
  useStaleItems: (...args: unknown[]) => mockUseStaleItems(...args),
  useRefreshMovie: () => ({ mutateAsync: mockRefreshMovieMutateAsync, isPending: false }),
  useRefreshActor: () => ({ mutateAsync: mockRefreshActorMutateAsync, isPending: false }),
}));

vi.mock('@/components/sync/BulkSections', () => ({
  StaleMoviesSection: ({
    staleMovies,
    showList,
    onToggleList,
    onRefreshAll,
    isBulkRunning,
    staleDays,
    onStaleDaysChange,
    sinceYear,
    onSinceYearChange,
  }: {
    staleMovies: { data?: { items: { id: string; title?: string }[] }; isLoading: boolean };
    showList: boolean;
    onToggleList: () => void;
    onRefreshAll: () => void;
    isBulkRunning: boolean;
    staleDays: number;
    onStaleDaysChange: (d: number) => void;
    sinceYear: number;
    onSinceYearChange: (y: number) => void;
  }) => (
    <div data-testid="stale-movies-section">
      <span data-testid="stale-count">{staleMovies.data?.items.length ?? 0}</span>
      <span data-testid="bulk-running">{isBulkRunning ? 'running' : 'idle'}</span>
      <button onClick={onRefreshAll} data-testid="refresh-all-btn">
        Refresh All
      </button>
      <button onClick={onToggleList} data-testid="toggle-list-btn">
        {showList ? 'Hide' : 'Preview'}
      </button>
    </div>
  ),
  MissingBiosSection: ({
    missingBios,
    showList,
    onToggleList,
    onFetchAll,
    isBulkRunning,
  }: {
    missingBios: { data?: { items: { id: string; name?: string }[] }; isLoading: boolean };
    showList: boolean;
    onToggleList: () => void;
    onFetchAll: () => void;
    isBulkRunning: boolean;
  }) => (
    <div data-testid="missing-bios-section">
      <span data-testid="bio-count">{missingBios.data?.items.length ?? 0}</span>
      <span data-testid="bulk-running-bio">{isBulkRunning ? 'running' : 'idle'}</span>
      <button onClick={onFetchAll} data-testid="fetch-all-btn">
        Fetch All
      </button>
      <button onClick={onToggleList} data-testid="toggle-bio-list-btn">
        {showList ? 'Hide' : 'Preview'}
      </button>
    </div>
  ),
  BulkProgressPanel: ({
    progress,
  }: {
    progress: { type: string; total: number; completed: number; current: string; errors: string[] };
  }) => (
    <div data-testid="bulk-progress">
      <span data-testid="progress-type">{progress.type}</span>
      <span data-testid="progress-completed">{progress.completed}</span>
      <span data-testid="progress-total">{progress.total}</span>
    </div>
  ),
}));

import { BulkTab } from '@/components/sync/BulkTab';

describe('BulkTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
    window.alert = vi.fn();

    mockUseStaleItems.mockReturnValue({
      data: { items: [] },
      isLoading: false,
    });
  });

  it('renders StaleMoviesSection and MissingBiosSection', () => {
    render(<BulkTab />);
    expect(screen.getByTestId('stale-movies-section')).toBeInTheDocument();
    expect(screen.getByTestId('missing-bios-section')).toBeInTheDocument();
  });

  it('does not render BulkProgressPanel initially', () => {
    render(<BulkTab />);
    expect(screen.queryByTestId('bulk-progress')).not.toBeInTheDocument();
  });

  it('passes correct stale movie count to StaleMoviesSection', () => {
    mockUseStaleItems
      .mockReturnValueOnce({
        data: {
          items: [
            { id: '1', title: 'Movie A' },
            { id: '2', title: 'Movie B' },
          ],
        },
        isLoading: false,
      })
      .mockReturnValueOnce({ data: { items: [] }, isLoading: false });

    render(<BulkTab />);
    expect(screen.getByTestId('stale-count').textContent).toBe('2');
  });

  it('passes correct missing bio count to MissingBiosSection', () => {
    mockUseStaleItems
      .mockReturnValueOnce({ data: { items: [] }, isLoading: false })
      .mockReturnValueOnce({ data: { items: [{ id: 'a1', name: 'Actor 1' }] }, isLoading: false });

    render(<BulkTab />);
    expect(screen.getByTestId('bio-count').textContent).toBe('1');
  });

  it('isBulkRunning is false when no progress', () => {
    render(<BulkTab />);
    expect(screen.getByTestId('bulk-running').textContent).toBe('idle');
  });

  it('handleBulkRefreshMovies: does nothing if no stale movies', async () => {
    mockUseStaleItems.mockReturnValue({ data: { items: [] }, isLoading: false });

    render(<BulkTab />);
    fireEvent.click(screen.getByTestId('refresh-all-btn'));

    expect(window.confirm).not.toHaveBeenCalled();
    expect(mockRefreshMovieMutateAsync).not.toHaveBeenCalled();
  });

  it('handleBulkRefreshMovies: does nothing if user cancels confirm', async () => {
    window.confirm = vi.fn(() => false);
    mockUseStaleItems
      .mockReturnValueOnce({ data: { items: [{ id: 'm1', title: 'Movie 1' }] }, isLoading: false })
      .mockReturnValueOnce({ data: { items: [] }, isLoading: false });

    render(<BulkTab />);
    fireEvent.click(screen.getByTestId('refresh-all-btn'));

    expect(window.confirm).toHaveBeenCalledWith(
      'Refresh 1 stale movies from TMDB? This may take a while.',
    );
    expect(mockRefreshMovieMutateAsync).not.toHaveBeenCalled();
  });

  it('handleBulkRefreshMovies: processes each movie and shows progress', async () => {
    mockRefreshMovieMutateAsync.mockResolvedValue({});

    mockUseStaleItems
      .mockReturnValueOnce({
        data: {
          items: [
            { id: 'm1', title: 'Movie 1' },
            { id: 'm2', title: 'Movie 2' },
          ],
        },
        isLoading: false,
      })
      .mockReturnValueOnce({ data: { items: [] }, isLoading: false });

    render(<BulkTab />);
    fireEvent.click(screen.getByTestId('refresh-all-btn'));

    await waitFor(() => {
      expect(mockRefreshMovieMutateAsync).toHaveBeenCalledTimes(2);
    });

    expect(mockRefreshMovieMutateAsync).toHaveBeenCalledWith('m1');
    expect(mockRefreshMovieMutateAsync).toHaveBeenCalledWith('m2');
    expect(screen.getByTestId('bulk-progress')).toBeInTheDocument();
    expect(screen.getByTestId('progress-type').textContent).toBe('movies');
    expect(screen.getByTestId('progress-total').textContent).toBe('2');
    expect(screen.getByTestId('progress-completed').textContent).toBe('2');
  });

  it('handleBulkRefreshMovies: accumulates errors without stopping', async () => {
    mockRefreshMovieMutateAsync
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('TMDB error'));

    mockUseStaleItems
      .mockReturnValueOnce({
        data: {
          items: [
            { id: 'm1', title: 'Movie 1' },
            { id: 'm2', title: 'Movie 2' },
          ],
        },
        isLoading: false,
      })
      .mockReturnValueOnce({ data: { items: [] }, isLoading: false });

    render(<BulkTab />);
    fireEvent.click(screen.getByTestId('refresh-all-btn'));

    await waitFor(() => {
      expect(mockRefreshMovieMutateAsync).toHaveBeenCalledTimes(2);
    });

    // Both movies should have been processed despite the error
    expect(screen.getByTestId('progress-completed').textContent).toBe('2');
  });

  it('handleBulkRefreshActors: does nothing if no missing bios', async () => {
    mockUseStaleItems.mockReturnValue({ data: { items: [] }, isLoading: false });

    render(<BulkTab />);
    fireEvent.click(screen.getByTestId('fetch-all-btn'));

    expect(window.confirm).not.toHaveBeenCalled();
    expect(mockRefreshActorMutateAsync).not.toHaveBeenCalled();
  });

  it('handleBulkRefreshActors: does nothing if user cancels confirm', async () => {
    window.confirm = vi.fn(() => false);
    mockUseStaleItems
      .mockReturnValueOnce({ data: { items: [] }, isLoading: false })
      .mockReturnValueOnce({ data: { items: [{ id: 'a1', name: 'Actor 1' }] }, isLoading: false });

    render(<BulkTab />);
    fireEvent.click(screen.getByTestId('fetch-all-btn'));

    expect(window.confirm).toHaveBeenCalledWith(
      'Fetch bios for 1 actors from TMDB? This may take a while.',
    );
    expect(mockRefreshActorMutateAsync).not.toHaveBeenCalled();
  });

  it('handleBulkRefreshActors: processes each actor and shows progress', async () => {
    mockRefreshActorMutateAsync.mockResolvedValue({});

    mockUseStaleItems
      .mockReturnValueOnce({ data: { items: [] }, isLoading: false })
      .mockReturnValueOnce({
        data: {
          items: [
            { id: 'a1', name: 'Actor 1' },
            { id: 'a2', name: 'Actor 2' },
          ],
        },
        isLoading: false,
      });

    render(<BulkTab />);
    fireEvent.click(screen.getByTestId('fetch-all-btn'));

    await waitFor(() => {
      expect(mockRefreshActorMutateAsync).toHaveBeenCalledTimes(2);
    });

    expect(mockRefreshActorMutateAsync).toHaveBeenCalledWith('a1');
    expect(mockRefreshActorMutateAsync).toHaveBeenCalledWith('a2');
    expect(screen.getByTestId('progress-type').textContent).toBe('actors');
    expect(screen.getByTestId('progress-completed').textContent).toBe('2');
  });

  it('handleBulkRefreshActors: handles non-Error throws gracefully', async () => {
    mockRefreshActorMutateAsync.mockRejectedValue('string error');

    mockUseStaleItems
      .mockReturnValueOnce({ data: { items: [] }, isLoading: false })
      .mockReturnValueOnce({
        data: { items: [{ id: 'a1', name: 'Actor 1' }] },
        isLoading: false,
      });

    render(<BulkTab />);
    fireEvent.click(screen.getByTestId('fetch-all-btn'));

    await waitFor(() => {
      expect(mockRefreshActorMutateAsync).toHaveBeenCalledTimes(1);
    });

    // Should still complete
    expect(screen.getByTestId('progress-completed').textContent).toBe('1');
  });

  it('toggle list buttons update showList state', () => {
    mockUseStaleItems.mockReturnValue({ data: { items: [] }, isLoading: false });

    render(<BulkTab />);

    // Initially "Preview"
    expect(screen.getByTestId('toggle-list-btn').textContent).toBe('Preview');
    fireEvent.click(screen.getByTestId('toggle-list-btn'));
    expect(screen.getByTestId('toggle-list-btn').textContent).toBe('Hide');
  });

  it('toggle bio list buttons update showBioList state', () => {
    mockUseStaleItems.mockReturnValue({ data: { items: [] }, isLoading: false });

    render(<BulkTab />);

    expect(screen.getByTestId('toggle-bio-list-btn').textContent).toBe('Preview');
    fireEvent.click(screen.getByTestId('toggle-bio-list-btn'));
    expect(screen.getByTestId('toggle-bio-list-btn').textContent).toBe('Hide');
  });
});
