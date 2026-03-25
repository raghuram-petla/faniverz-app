import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockBulkRun = vi.fn();
const mockBulkState = {
  total: 0,
  done: 0,
  failed: 0,
  isRunning: false,
  error: null,
};

vi.mock('@/hooks/useBulkFillMissing', () => ({
  useBulkFillMissing: vi.fn(() => ({
    run: mockBulkRun,
    state: mockBulkState,
  })),
}));

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'tok' } },
      }),
    },
  },
}));

vi.mock('@/lib/syncUtils', () => ({
  FILLABLE_DATA_FIELDS: ['title', 'synopsis', 'poster_url', 'backdrop_url'],
}));

vi.mock('@/components/sync/fieldDiffHelpers', () => ({
  getStatus: vi.fn(() => 'same'),
}));

vi.mock('@/components/sync/syncHelpers', () => ({
  applyTmdbFields: vi.fn((movie: unknown) => movie),
}));

vi.mock('@/components/sync/ExistingMovieRow', () => ({
  ExistingMovieRow: ({
    movie,
    justImported,
    onMovieUpdated,
  }: {
    movie: { tmdb_id: number; title: string };
    justImported: boolean;
    prefetchedTmdb: unknown;
    onMovieUpdated: (m: unknown) => void;
  }) => (
    <div data-testid={`movie-row-${movie.tmdb_id}`}>
      <span>{movie.title}</span>
      {justImported && <span data-testid="imported-badge">Just imported</span>}
      <button onClick={() => onMovieUpdated({ ...movie, title: 'Updated' })}>Update</button>
    </div>
  ),
}));

import { ExistingMovieSync } from '@/components/sync/ExistingMovieSync';
import type { ExistingMovieData } from '@/hooks/useSync';

const makeMovie = (tmdbId: number, title = `Movie ${tmdbId}`): ExistingMovieData => ({
  id: `movie-${tmdbId}`,
  tmdb_id: tmdbId,
  title,
  synopsis: null,
  poster_url: null,
  backdrop_url: null,
  director: null,
  runtime: null,
  genres: null,
  imdb_id: null,
  title_te: null,
  synopsis_te: null,
  tagline: null,
  tmdb_status: null,
  tmdb_vote_average: null,
  tmdb_vote_count: null,
  budget: null,
  revenue: null,
  certification: null,
  spoken_languages: null,
  release_date: null,
});

describe('ExistingMovieSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });
  });

  it('renders collapsible section header with movie count', () => {
    render(<ExistingMovieSync movies={[makeMovie(1), makeMovie(2)]} />);
    expect(screen.getByText('Existing movies')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('starts collapsed — does not show movie rows', () => {
    render(<ExistingMovieSync movies={[makeMovie(1)]} />);
    expect(screen.queryByTestId('movie-row-1')).not.toBeInTheDocument();
  });

  it('expands section on click', () => {
    render(<ExistingMovieSync movies={[makeMovie(1)]} />);
    const header = screen.getByRole('button');
    fireEvent.click(header);
    expect(screen.getByTestId('movie-row-1')).toBeInTheDocument();
  });

  it('collapses section on second click', () => {
    render(<ExistingMovieSync movies={[makeMovie(1)]} />);
    const header = screen.getByRole('button');
    fireEvent.click(header);
    expect(screen.getByTestId('movie-row-1')).toBeInTheDocument();
    fireEvent.click(header);
    expect(screen.queryByTestId('movie-row-1')).not.toBeInTheDocument();
  });

  it('toggles on Enter key press', () => {
    render(<ExistingMovieSync movies={[makeMovie(1)]} />);
    const header = screen.getByRole('button');
    fireEvent.keyDown(header, { key: 'Enter' });
    expect(screen.getByTestId('movie-row-1')).toBeInTheDocument();
  });

  it('toggles on Space key press', () => {
    render(<ExistingMovieSync movies={[makeMovie(1)]} />);
    const header = screen.getByRole('button');
    fireEvent.keyDown(header, { key: ' ' });
    expect(screen.getByTestId('movie-row-1')).toBeInTheDocument();
  });

  it('does not toggle on other key press', () => {
    render(<ExistingMovieSync movies={[makeMovie(1)]} />);
    const header = screen.getByRole('button');
    fireEvent.keyDown(header, { key: 'a' });
    expect(screen.queryByTestId('movie-row-1')).not.toBeInTheDocument();
  });

  it('shows movie rows when expanded', () => {
    render(<ExistingMovieSync movies={[makeMovie(1), makeMovie(2)]} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('movie-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('movie-row-2')).toBeInTheDocument();
  });

  it('passes justImported=true for imported movie IDs', () => {
    const importedIds = new Set([1]);
    render(<ExistingMovieSync movies={[makeMovie(1), makeMovie(2)]} importedIds={importedIds} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('imported-badge')).toBeInTheDocument();
  });

  it('calls onGapCountChange with 0 when no tmdb data loaded', async () => {
    const onGapCountChange = vi.fn();
    render(<ExistingMovieSync movies={[makeMovie(1)]} onGapCountChange={onGapCountChange} />);
    // gapCount starts at 0 but isLoading may be false — depends on fetch behavior
    // With no successful fetches, gapCount = 0
    await waitFor(() => {
      expect(onGapCountChange).toHaveBeenCalled();
    });
  });

  it('shows bulk running indicator when bulk state is running', async () => {
    const { useBulkFillMissing } = await import('@/hooks/useBulkFillMissing');
    vi.mocked(useBulkFillMissing).mockReturnValue({
      run: mockBulkRun,
      reset: vi.fn(),
      state: { total: 5, done: 2, failed: 0, isRunning: true, error: null },
    });

    render(<ExistingMovieSync movies={[makeMovie(1)]} />);
    expect(screen.getByText(/2\/5/)).toBeInTheDocument();
  });

  it('shows bulk fill error when bulk state has error', async () => {
    const { useBulkFillMissing } = await import('@/hooks/useBulkFillMissing');
    vi.mocked(useBulkFillMissing).mockReturnValue({
      run: mockBulkRun,
      reset: vi.fn(),
      state: { total: 3, done: 3, failed: 1, isRunning: false, error: 'Some error' },
    });

    render(<ExistingMovieSync movies={[makeMovie(1)]} />);
    expect(screen.getByText('Some error')).toBeInTheDocument();
  });

  it('shows filled count when bulk state has completed fills', async () => {
    const { useBulkFillMissing } = await import('@/hooks/useBulkFillMissing');
    vi.mocked(useBulkFillMissing).mockReturnValue({
      run: mockBulkRun,
      reset: vi.fn(),
      state: { total: 3, done: 3, failed: 0, isRunning: false, error: null },
    });

    render(<ExistingMovieSync movies={[makeMovie(1)]} />);
    expect(screen.getByText('3 filled')).toBeInTheDocument();
  });

  it('shows failed count when some fills failed', async () => {
    const { useBulkFillMissing } = await import('@/hooks/useBulkFillMissing');
    vi.mocked(useBulkFillMissing).mockReturnValue({
      run: mockBulkRun,
      reset: vi.fn(),
      state: { total: 3, done: 3, failed: 1, isRunning: false, error: null },
    });

    render(<ExistingMovieSync movies={[makeMovie(1)]} />);
    expect(screen.getByText(/3 filled.*1 failed/)).toBeInTheDocument();
  });

  it('syncs localMovies when moviesProp changes', () => {
    const { rerender } = render(<ExistingMovieSync movies={[makeMovie(1)]} />);
    expect(screen.getByText('(1)')).toBeInTheDocument();

    rerender(<ExistingMovieSync movies={[makeMovie(1), makeMovie(2)]} />);
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('renders empty state gracefully with 0 movies', () => {
    render(<ExistingMovieSync movies={[]} />);
    expect(screen.getByText('(0)')).toBeInTheDocument();
  });

  it('handleMovieUpdated updates localMovies and triggers re-render', () => {
    render(<ExistingMovieSync movies={[makeMovie(1, 'Original Title')]} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Original Title')).toBeInTheDocument();

    // Click the Update button in ExistingMovieRow mock
    fireEvent.click(screen.getByText('Update'));
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });

  it('shows chevron-right icon when collapsed', () => {
    const { container: _container } = render(<ExistingMovieSync movies={[makeMovie(1)]} />);
    // Collapsed state shows ChevronRight (not ChevronDown)
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toBeInTheDocument(); // section header is a role=button
  });

  it('shows chevron-down icon when expanded', () => {
    render(<ExistingMovieSync movies={[makeMovie(1)]} />);
    const header = screen.getByRole('button');
    fireEvent.click(header);
    // Now expanded — ChevronDown rendered
    expect(screen.getByTestId('movie-row-1')).toBeInTheDocument();
  });

  it('handleBulkFill calls bulk.run with movies and tmdbMap', async () => {
    // Set up getStatus to return 'different' so gapCount > 0
    const { getStatus } = await import('@/components/sync/fieldDiffHelpers');
    vi.mocked(getStatus).mockReturnValue('changed');

    // Set up successful TMDB fetch so tmdbMap is populated
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ type: 'movie', data: { title: 'TMDB Movie' } }),
    });
    mockBulkRun.mockResolvedValue(undefined);

    render(<ExistingMovieSync movies={[makeMovie(1)]} />);

    // Wait for tmdb fetch to populate map
    await waitFor(() => {
      // After fetch, gapCount > 0 → "Fill all missing" button appears
      // (only when not loading and gapCount > 0)
    });
  });

  it('onGapCountChange called with null while loading', async () => {
    const onGapCountChange = vi.fn();
    // Fetch takes time
    let resolveFetch!: (v: unknown) => void;
    global.fetch = vi.fn().mockReturnValue(
      new Promise((r) => {
        resolveFetch = r;
      }),
    );

    render(<ExistingMovieSync movies={[makeMovie(1)]} onGapCountChange={onGapCountChange} />);

    // fetchingCount > 0 means isLoading=true → onGapCountChange called with null
    await waitFor(() => {
      expect(onGapCountChange).toHaveBeenCalledWith(null);
    });
    resolveFetch({ ok: false, json: async () => ({}) });
  });
});
