import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockUseTmdbLookup = vi.fn();
const mockUseFillFields = vi.fn();
const mockGetStatus = vi.fn(() => 'different');

vi.mock('@/hooks/useSync', () => ({
  useTmdbLookup: () => mockUseTmdbLookup(),
  useFillFields: () => mockUseFillFields(),
}));

vi.mock('@/lib/syncUtils', () => ({
  FILLABLE_DATA_FIELDS: ['title', 'synopsis', 'poster_url'],
}));

vi.mock('@/components/sync/fieldDiffHelpers', () => ({
  getStatus: (...args: unknown[]) => mockGetStatus(...args),
}));

vi.mock('@/components/sync/FieldDiffPanel', () => ({
  FieldDiffPanel: ({
    onApply,
  }: {
    movie: unknown;
    tmdb: unknown;
    appliedFields: string[];
    isSaving: boolean;
    onApply: (fields: string[], force: boolean) => Promise<void>;
  }) => (
    <div data-testid="field-diff-panel">
      <button onClick={() => onApply(['title'], false)}>Apply</button>
      <button onClick={() => onApply(['cast'], true)}>Force Cast</button>
    </div>
  ),
}));

vi.mock('@/components/sync/syncHelpers', () => ({
  applyTmdbFields: (movie: object, _tmdb: unknown, fields: string[]) => ({
    ...movie,
    _appliedFields: fields,
  }),
}));

vi.mock('lucide-react', () => ({
  ChevronRight: () => <span data-testid="chevron-right" />,
  ChevronDown: () => <span data-testid="chevron-down" />,
  Loader2: ({ className }: { className?: string }) => (
    <span data-testid="loader" className={className} />
  ),
  Film: () => <span data-testid="film-icon" />,
}));

import { ExistingMovieRow } from '@/components/sync/ExistingMovieRow';
import type { ExistingMovieData, LookupMovieData } from '@/hooks/useSync';

const makeMovie = (overrides = {}): ExistingMovieData =>
  ({
    id: 'movie-1',
    tmdb_id: 101,
    title: 'Test Movie',
    poster_url: 'https://example.com/poster.jpg',
    release_date: '2024-01-01',
    ...overrides,
  }) as ExistingMovieData;

const makeTmdbData = (): LookupMovieData =>
  ({
    tmdbId: 101,
    title: 'Test Movie',
  }) as LookupMovieData;

function makeIdleHook(overrides = {}) {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue({ updatedFields: [] }),
    isPending: false,
    isError: false,
    isSuccess: false,
    data: undefined,
    error: null,
    ...overrides,
  };
}

describe('ExistingMovieRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStatus.mockReturnValue('different');
    mockUseTmdbLookup.mockReturnValue(makeIdleHook());
    mockUseFillFields.mockReturnValue(makeIdleHook());
  });

  it('renders movie title', () => {
    render(<ExistingMovieRow movie={makeMovie()} justImported={false} prefetchedTmdb={null} />);
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
  });

  it('shows "—" when title is null', () => {
    render(
      <ExistingMovieRow
        movie={makeMovie({ title: null })}
        justImported={false}
        prefetchedTmdb={null}
      />,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows "Just imported" when justImported is true', () => {
    render(<ExistingMovieRow movie={makeMovie()} justImported={true} prefetchedTmdb={null} />);
    expect(screen.getByText('Just imported')).toBeInTheDocument();
  });

  it('shows "Checking..." when prefetchedTmdb is null and not justImported', () => {
    render(<ExistingMovieRow movie={makeMovie()} justImported={false} prefetchedTmdb={null} />);
    expect(screen.getByText('Checking...')).toBeInTheDocument();
  });

  it('shows gap count when tmdb data is available', () => {
    // getStatus returns 'different' for all 3 fields → 3 gaps
    render(
      <ExistingMovieRow movie={makeMovie()} justImported={false} prefetchedTmdb={makeTmdbData()} />,
    );
    expect(screen.getByText('3 gaps')).toBeInTheDocument();
  });

  it('uses singular "gap" for exactly 1 gap', () => {
    let callCount = 0;
    mockGetStatus.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? 'different' : 'same';
    });
    render(
      <ExistingMovieRow movie={makeMovie()} justImported={false} prefetchedTmdb={makeTmdbData()} />,
    );
    expect(screen.getByText('1 gap')).toBeInTheDocument();
  });

  it('shows "No gaps" when all fields match', () => {
    mockGetStatus.mockReturnValue('same');
    render(
      <ExistingMovieRow movie={makeMovie()} justImported={false} prefetchedTmdb={makeTmdbData()} />,
    );
    expect(screen.getByText('No gaps')).toBeInTheDocument();
  });

  it('shows poster image when poster_url is set', () => {
    render(<ExistingMovieRow movie={makeMovie()} justImported={false} prefetchedTmdb={null} />);
    expect(screen.getByAltText('Test Movie')).toBeInTheDocument();
  });

  it('shows Film icon when poster_url is null', () => {
    render(
      <ExistingMovieRow
        movie={makeMovie({ poster_url: null })}
        justImported={false}
        prefetchedTmdb={null}
      />,
    );
    expect(screen.getByTestId('film-icon')).toBeInTheDocument();
  });

  it('does not toggle open when justImported is true', () => {
    render(
      <ExistingMovieRow movie={makeMovie()} justImported={true} prefetchedTmdb={makeTmdbData()} />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.queryByTestId('field-diff-panel')).not.toBeInTheDocument();
  });

  it('toggles open/closed on click when not justImported', async () => {
    render(
      <ExistingMovieRow movie={makeMovie()} justImported={false} prefetchedTmdb={makeTmdbData()} />,
    );
    const toggleBtn =
      screen.getByRole('button', { name: /Test Movie/i }) ?? screen.getAllByRole('button')[0];
    expect(screen.queryByTestId('field-diff-panel')).not.toBeInTheDocument();
    // First click: open
    fireEvent.click(screen.getAllByRole('button')[0]);
    await waitFor(() => {
      expect(screen.getByTestId('field-diff-panel')).toBeInTheDocument();
    });
    // Second click: close (toggle button is still first button)
    fireEvent.click(screen.getAllByRole('button')[0]);
    await waitFor(() => {
      expect(screen.queryByTestId('field-diff-panel')).not.toBeInTheDocument();
    });
  });

  it('shows loading state when lookup is pending', async () => {
    mockUseTmdbLookup.mockReturnValue(makeIdleHook({ isPending: true }));
    render(<ExistingMovieRow movie={makeMovie()} justImported={false} prefetchedTmdb={null} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText('Fetching from TMDB…')).toBeInTheDocument();
    });
  });

  it('shows lookup error message when lookup fails with Error', async () => {
    mockUseTmdbLookup.mockReturnValue(
      makeIdleHook({ isError: true, error: new Error('TMDB unavailable') }),
    );
    render(<ExistingMovieRow movie={makeMovie()} justImported={false} prefetchedTmdb={null} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText('TMDB unavailable')).toBeInTheDocument();
    });
  });

  it('shows generic error when lookup error is not an Error instance', async () => {
    mockUseTmdbLookup.mockReturnValue(makeIdleHook({ isError: true, error: 'string error' }));
    render(<ExistingMovieRow movie={makeMovie()} justImported={false} prefetchedTmdb={null} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText('TMDB fetch failed')).toBeInTheDocument();
    });
  });

  it('shows fillFields error when apply fails with Error', async () => {
    mockUseFillFields.mockReturnValue(
      makeIdleHook({ isError: true, error: new Error('Apply failed badly') }),
    );
    render(
      <ExistingMovieRow movie={makeMovie()} justImported={false} prefetchedTmdb={makeTmdbData()} />,
    );
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText('Apply failed badly')).toBeInTheDocument();
    });
  });

  it('shows generic "Apply failed" when fillFields error is not an Error', async () => {
    mockUseFillFields.mockReturnValue(makeIdleHook({ isError: true, error: 'bad string' }));
    render(
      <ExistingMovieRow movie={makeMovie()} justImported={false} prefetchedTmdb={makeTmdbData()} />,
    );
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText('Apply failed')).toBeInTheDocument();
    });
  });

  it('calls handleApply and updates movie on successful apply', async () => {
    const fillFieldsHook = makeIdleHook({
      mutateAsync: vi.fn().mockResolvedValue({ updatedFields: ['title'] }),
    });
    mockUseFillFields.mockReturnValue(fillFieldsHook);

    const onMovieUpdated = vi.fn();
    render(
      <ExistingMovieRow
        movie={makeMovie()}
        justImported={false}
        prefetchedTmdb={makeTmdbData()}
        onMovieUpdated={onMovieUpdated}
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => screen.getByTestId('field-diff-panel'));

    fireEvent.click(screen.getByText('Apply'));
    await waitFor(() => {
      expect(fillFieldsHook.mutateAsync).toHaveBeenCalledWith({
        tmdbId: 101,
        fields: ['title'],
      });
      expect(onMovieUpdated).toHaveBeenCalled();
    });
  });

  it('passes forceResyncCast when force=true', async () => {
    const fillFieldsHook = makeIdleHook({
      mutateAsync: vi.fn().mockResolvedValue({ updatedFields: ['cast'] }),
    });
    mockUseFillFields.mockReturnValue(fillFieldsHook);

    render(
      <ExistingMovieRow movie={makeMovie()} justImported={false} prefetchedTmdb={makeTmdbData()} />,
    );
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => screen.getByTestId('field-diff-panel'));

    fireEvent.click(screen.getByText('Force Cast'));
    await waitFor(() => {
      expect(fillFieldsHook.mutateAsync).toHaveBeenCalledWith({
        tmdbId: 101,
        fields: ['cast'],
        forceResyncCast: true,
      });
    });
  });

  it('does not call onMovieUpdated when updatedFields is empty', async () => {
    const fillFieldsHook = makeIdleHook({
      mutateAsync: vi.fn().mockResolvedValue({ updatedFields: [] }),
    });
    mockUseFillFields.mockReturnValue(fillFieldsHook);
    const onMovieUpdated = vi.fn();

    render(
      <ExistingMovieRow
        movie={makeMovie()}
        justImported={false}
        prefetchedTmdb={makeTmdbData()}
        onMovieUpdated={onMovieUpdated}
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => screen.getByTestId('field-diff-panel'));
    fireEvent.click(screen.getByText('Apply'));
    await waitFor(() => {
      expect(onMovieUpdated).not.toHaveBeenCalled();
    });
  });
});
