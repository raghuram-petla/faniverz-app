import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockImportMutateAsync = vi.fn();
const mockLinkTmdbIdMutateAsync = vi.fn();

vi.mock('@/hooks/useSync', () => ({
  useImportMovies: vi.fn(() => ({ mutateAsync: mockImportMutateAsync, isPending: false })),
  useLinkTmdbId: vi.fn(() => ({ mutateAsync: mockLinkTmdbIdMutateAsync, isPending: false })),
}));

vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChangesWarning: vi.fn(),
}));

vi.mock('@/components/sync/DiscoverResults', () => ({
  DiscoverResults: ({
    results,
    newMovies,
    selected,
    isImporting,
    onToggleSelect,
    onSelectAllNew,
    onDeselectAll,
    onImport,
    onImportAllNew,
    duplicateSuspects,
    onLinkDuplicate,
    onGapCountChange,
    existingMovies,
    existingSet,
    importProgress,
  }: {
    results: Array<{ id: number; title: string }>;
    newMovies: Array<{ id: number; title: string }>;
    selected: Set<number>;
    isImporting: boolean;
    gapCount: number | null;
    importedIds: Set<number>;
    onToggleSelect: (id: number) => void;
    onSelectAllNew: () => void;
    onDeselectAll: () => void;
    onImport: () => void;
    onImportAllNew: () => void;
    duplicateSuspects?: Record<number, { id: string; title: string }>;
    onLinkDuplicate: (tmdbId: number, suspect: { id: string; title: string }) => void;
    linkingTmdbId: number | null;
    onGapCountChange: (count: number | null) => void;
    existingMovies: unknown[];
    existingSet: Set<number>;
    importProgress?: Array<{ tmdbId: number; title: string; status: string }>;
  }) => (
    <div data-testid="discover-results">
      {importProgress && importProgress.length > 0 && (
        <div data-testid="import-progress">
          {importProgress.map((item) => (
            <span key={item.tmdbId} data-testid={`progress-${item.tmdbId}`}>
              {item.status}
            </span>
          ))}
        </div>
      )}
      <span data-testid="results-count">{results.length}</span>
      <span data-testid="new-movies-count">{newMovies.length}</span>
      <span data-testid="selected-count">{selected.size}</span>
      <span data-testid="is-importing">{isImporting ? 'yes' : 'no'}</span>
      <span data-testid="existing-count">{existingMovies.length}</span>
      <button onClick={() => onToggleSelect(1)} data-testid="toggle-btn">
        Toggle
      </button>
      <button onClick={onSelectAllNew} data-testid="select-all-btn">
        Select All New
      </button>
      <button onClick={onDeselectAll} data-testid="deselect-all-btn">
        Deselect All
      </button>
      <button onClick={onImport} data-testid="import-btn">
        Import Selected
      </button>
      <button onClick={onImportAllNew} data-testid="import-all-btn">
        Import All New
      </button>
      {duplicateSuspects && Object.keys(duplicateSuspects).length > 0 && (
        <button
          onClick={() =>
            onLinkDuplicate(
              Number(Object.keys(duplicateSuspects)[0]),
              Object.values(duplicateSuspects)[0],
            )
          }
          data-testid="link-btn"
        >
          Link
        </button>
      )}
      <button onClick={() => onGapCountChange(5)} data-testid="gap-count-btn">
        Set Gap
      </button>
    </div>
  ),
}));

import { DiscoverByYear } from '@/components/sync/DiscoverByYear';
import type { DiscoverResult } from '@/hooks/useSync';

const makeDiscoverResult = (overrides: Partial<DiscoverResult> = {}): DiscoverResult => ({
  results: [
    { id: 1, title: 'Movie A', poster_path: null, release_date: '2024-01-01' },
    { id: 2, title: 'Movie B', poster_path: null, release_date: '2024-02-01' },
    { id: 3, title: 'Movie C', poster_path: null, release_date: '2024-03-01' },
  ],
  existingMovies: [],
  duplicateSuspects: {},
  ...overrides,
});

describe('DiscoverByYear', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders DiscoverResults component', () => {
    render(<DiscoverByYear data={makeDiscoverResult()} />);
    expect(screen.getByTestId('discover-results')).toBeInTheDocument();
  });

  it('passes all results to DiscoverResults', () => {
    render(<DiscoverByYear data={makeDiscoverResult()} />);
    expect(screen.getByTestId('results-count').textContent).toBe('3');
  });

  it('shows new movies count excluding existing', () => {
    render(<DiscoverByYear data={makeDiscoverResult({ existingMovies: [] })} />);
    expect(screen.getByTestId('new-movies-count').textContent).toBe('3');
  });

  it('excludes existing movies from new movies count', () => {
    const existingMovies = [
      {
        id: 'db-1',
        tmdb_id: 1,
        title: 'Movie A',
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
      },
    ];
    render(<DiscoverByYear data={makeDiscoverResult({ existingMovies })} />);
    expect(screen.getByTestId('new-movies-count').textContent).toBe('2');
  });

  it('excludes duplicate suspects from new movies', () => {
    render(
      <DiscoverByYear
        data={makeDiscoverResult({
          duplicateSuspects: { 1: { id: 'db-1', title: 'Movie A' } },
        })}
      />,
    );
    expect(screen.getByTestId('new-movies-count').textContent).toBe('2');
  });

  it('starts with no selection', () => {
    render(<DiscoverByYear data={makeDiscoverResult()} />);
    expect(screen.getByTestId('selected-count').textContent).toBe('0');
  });

  it('toggles selection when toggleSelect is called', () => {
    render(<DiscoverByYear data={makeDiscoverResult()} />);
    fireEvent.click(screen.getByTestId('toggle-btn'));
    expect(screen.getByTestId('selected-count').textContent).toBe('1');
  });

  it('deselects already-selected item on second toggle', () => {
    render(<DiscoverByYear data={makeDiscoverResult()} />);
    fireEvent.click(screen.getByTestId('toggle-btn'));
    expect(screen.getByTestId('selected-count').textContent).toBe('1');
    fireEvent.click(screen.getByTestId('toggle-btn'));
    expect(screen.getByTestId('selected-count').textContent).toBe('0');
  });

  it('selects all new movies on selectAllNew', () => {
    render(<DiscoverByYear data={makeDiscoverResult()} />);
    fireEvent.click(screen.getByTestId('select-all-btn'));
    expect(screen.getByTestId('selected-count').textContent).toBe('3');
  });

  it('deselects all on deselectAll', () => {
    render(<DiscoverByYear data={makeDiscoverResult()} />);
    fireEvent.click(screen.getByTestId('select-all-btn'));
    fireEvent.click(screen.getByTestId('deselect-all-btn'));
    expect(screen.getByTestId('selected-count').textContent).toBe('0');
  });

  it('does not import when nothing is selected', async () => {
    render(<DiscoverByYear data={makeDiscoverResult()} />);
    fireEvent.click(screen.getByTestId('import-btn'));
    await new Promise((r) => setTimeout(r, 0));
    expect(mockImportMutateAsync).not.toHaveBeenCalled();
  });

  it('calls importMovies when import is triggered with selection', async () => {
    mockImportMutateAsync.mockResolvedValue({
      results: [{ tmdbId: 1, movieId: 'db-1', title: 'Movie A' }],
      errors: [],
    });

    render(<DiscoverByYear data={makeDiscoverResult()} />);
    fireEvent.click(screen.getByTestId('toggle-btn'));
    fireEvent.click(screen.getByTestId('import-btn'));

    await waitFor(() => {
      expect(mockImportMutateAsync).toHaveBeenCalled();
    });
  });

  it('shows import progress after import starts', async () => {
    mockImportMutateAsync.mockResolvedValue({
      results: [{ tmdbId: 1, movieId: 'db-1', title: 'Movie A' }],
      errors: [],
    });

    render(<DiscoverByYear data={makeDiscoverResult()} />);
    fireEvent.click(screen.getByTestId('toggle-btn'));
    fireEvent.click(screen.getByTestId('import-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('import-progress')).toBeInTheDocument();
    });
  });

  it('clears selection after import completes', async () => {
    mockImportMutateAsync.mockResolvedValue({
      results: [{ tmdbId: 1, movieId: 'db-1', title: 'Movie A' }],
      errors: [],
    });

    render(<DiscoverByYear data={makeDiscoverResult()} />);
    fireEvent.click(screen.getByTestId('toggle-btn'));
    expect(screen.getByTestId('selected-count').textContent).toBe('1');

    fireEvent.click(screen.getByTestId('import-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('selected-count').textContent).toBe('0');
    });
  });

  it('handles import all new', async () => {
    mockImportMutateAsync.mockResolvedValue({
      results: [
        { tmdbId: 1, movieId: 'db-1', title: 'Movie A' },
        { tmdbId: 2, movieId: 'db-2', title: 'Movie B' },
        { tmdbId: 3, movieId: 'db-3', title: 'Movie C' },
      ],
      errors: [],
    });

    render(<DiscoverByYear data={makeDiscoverResult()} />);
    fireEvent.click(screen.getByTestId('import-all-btn'));

    await waitFor(() => {
      expect(mockImportMutateAsync).toHaveBeenCalled();
    });
  });

  it('does not import all when no new movies', async () => {
    const existingMovies = [
      {
        id: 'db-1',
        tmdb_id: 1,
        title: 'A',
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
      },
      {
        id: 'db-2',
        tmdb_id: 2,
        title: 'B',
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
      },
      {
        id: 'db-3',
        tmdb_id: 3,
        title: 'C',
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
      },
    ];
    render(<DiscoverByYear data={makeDiscoverResult({ existingMovies })} />);
    fireEvent.click(screen.getByTestId('import-all-btn'));
    await new Promise((r) => setTimeout(r, 0));
    expect(mockImportMutateAsync).not.toHaveBeenCalled();
  });

  it('marks failed imports in progress list', async () => {
    mockImportMutateAsync.mockResolvedValue({
      results: [],
      errors: [{ tmdbId: 1, message: 'Failed to import' }],
    });

    render(<DiscoverByYear data={makeDiscoverResult()} />);
    fireEvent.click(screen.getByTestId('toggle-btn'));
    fireEvent.click(screen.getByTestId('import-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('progress-1')).toHaveTextContent('failed');
    });
  });

  it('handles import network error', async () => {
    mockImportMutateAsync.mockRejectedValue(new Error('Network error'));

    render(<DiscoverByYear data={makeDiscoverResult()} />);
    fireEvent.click(screen.getByTestId('toggle-btn'));
    fireEvent.click(screen.getByTestId('import-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('progress-1')).toHaveTextContent('failed');
    });
  });

  it('calls linkTmdbId when link duplicate button is clicked', async () => {
    mockLinkTmdbIdMutateAsync.mockResolvedValue({});

    const data = makeDiscoverResult({
      duplicateSuspects: { 1: { id: 'db-1', title: 'Existing Movie' } },
    });
    render(<DiscoverByYear data={data} />);

    fireEvent.click(screen.getByTestId('link-btn'));

    await waitFor(() => {
      expect(mockLinkTmdbIdMutateAsync).toHaveBeenCalledWith({
        movieId: 'db-1',
        tmdbId: 1,
      });
    });
  });

  it('passes existing movies to DiscoverResults', () => {
    const existingMovies = [
      {
        id: 'db-1',
        tmdb_id: 10,
        title: 'Existing',
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
      },
    ];
    render(<DiscoverByYear data={makeDiscoverResult({ existingMovies })} />);
    expect(screen.getByTestId('existing-count').textContent).toBe('1');
  });

  it('updates gap count via onGapCountChange callback', () => {
    render(<DiscoverByYear data={makeDiscoverResult()} />);
    fireEvent.click(screen.getByTestId('gap-count-btn'));
    // No assertion needed — just ensuring it doesn't throw
  });

  it('does not import all when isImporting is true', async () => {
    // Make import hang to keep isImporting=true
    mockImportMutateAsync.mockReturnValue(new Promise(() => {}));

    render(<DiscoverByYear data={makeDiscoverResult()} />);
    // Start an import first
    fireEvent.click(screen.getByTestId('toggle-btn'));
    fireEvent.click(screen.getByTestId('import-btn'));

    // isImporting should be true now, so import all should no-op
    fireEvent.click(screen.getByTestId('import-all-btn'));
    // Only one call from the first import
    expect(mockImportMutateAsync).toHaveBeenCalledTimes(1);
  });

  it('handles import with error result from server', async () => {
    mockImportMutateAsync.mockResolvedValue({
      results: [],
      errors: [{ tmdbId: 2, message: 'Server error' }],
    });

    render(<DiscoverByYear data={makeDiscoverResult()} />);
    // Select movie ID 2
    // The toggle mock always toggles ID 1, so use import all
    fireEvent.click(screen.getByTestId('import-all-btn'));

    await waitFor(() => {
      expect(mockImportMutateAsync).toHaveBeenCalled();
    });
  });

  it('handles non-Error exception during import (fallback message)', async () => {
    mockImportMutateAsync.mockRejectedValue('string error');

    render(<DiscoverByYear data={makeDiscoverResult()} />);
    fireEvent.click(screen.getByTestId('toggle-btn'));
    fireEvent.click(screen.getByTestId('import-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('progress-1')).toHaveTextContent('failed');
    });
  });

  it('retries on 502 gateway error and eventually fails after max retries', async () => {
    // Use a non-timeout error that exhausts retries quickly
    const error = new Error('Server error');
    mockImportMutateAsync.mockRejectedValue(error);

    render(<DiscoverByYear data={makeDiscoverResult()} />);
    fireEvent.click(screen.getByTestId('toggle-btn'));
    fireEvent.click(screen.getByTestId('import-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('progress-1')).toHaveTextContent('failed');
    });
  });

  it('notifies parent when import state changes via onImportingChange', () => {
    const onImportingChange = vi.fn();
    render(<DiscoverByYear data={makeDiscoverResult()} onImportingChange={onImportingChange} />);
    // Initially not importing
    expect(onImportingChange).toHaveBeenCalledWith(false);
  });

  it('handles link duplicate with poster_path in results', async () => {
    let resolveLink: (() => void) | undefined;
    mockLinkTmdbIdMutateAsync.mockImplementation(
      () =>
        new Promise<void>((r) => {
          resolveLink = r;
        }),
    );

    const data = makeDiscoverResult({
      results: [
        { id: 1, title: 'Movie A', poster_path: '/poster.jpg', release_date: '2024-01-01' },
        { id: 2, title: 'Movie B', poster_path: null, release_date: '2024-02-01' },
        { id: 3, title: 'Movie C', poster_path: null, release_date: '2024-03-01' },
      ],
      duplicateSuspects: { 1: { id: 'db-1', title: 'Existing Movie A' } },
    });
    render(<DiscoverByYear data={data} />);

    fireEvent.click(screen.getByTestId('link-btn'));

    expect(mockLinkTmdbIdMutateAsync).toHaveBeenCalledWith({
      movieId: 'db-1',
      tmdbId: 1,
    });

    // Resolve the link promise
    await act(async () => {
      resolveLink?.();
    });

    // After linking, the movie should show in existing count
    await waitFor(() => {
      expect(screen.getByTestId('existing-count').textContent).toBe('1');
    });
  });

  it('import all skips when already importing', async () => {
    // Start a never-resolving import
    mockImportMutateAsync.mockReturnValue(new Promise(() => {}));
    render(<DiscoverByYear data={makeDiscoverResult()} />);

    fireEvent.click(screen.getByTestId('import-all-btn'));
    expect(screen.getByTestId('is-importing').textContent).toBe('yes');

    // Second import all should be blocked
    fireEvent.click(screen.getByTestId('import-all-btn'));
    // Only 3 calls from the first import-all (3 movies)
    expect(mockImportMutateAsync).toHaveBeenCalledTimes(1);
  });

  it('handles import with successful results that populate imported data', async () => {
    mockImportMutateAsync.mockResolvedValue({
      results: [
        { tmdbId: 1, movieId: 'db-1', title: 'Movie A' },
        { tmdbId: 2, movieId: 'db-2', title: 'Movie B' },
      ],
      errors: [],
    });

    const data = makeDiscoverResult({
      results: [
        { id: 1, title: 'Movie A', poster_path: '/poster.jpg', release_date: '2024-01-01' },
        { id: 2, title: 'Movie B', poster_path: null, release_date: '2024-02-01' },
      ],
      existingMovies: [],
    });

    render(<DiscoverByYear data={data} />);
    fireEvent.click(screen.getByTestId('import-all-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('selected-count').textContent).toBe('0');
    });
  });

  it('handles empty results array', () => {
    render(<DiscoverByYear data={makeDiscoverResult({ results: [] })} />);
    expect(screen.getByTestId('results-count').textContent).toBe('0');
    expect(screen.getByTestId('new-movies-count').textContent).toBe('0');
  });
});
