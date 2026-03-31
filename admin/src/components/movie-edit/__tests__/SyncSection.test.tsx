/**
 * Tests for SyncSection — TMDB sync tab in the movie edit page.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// ── Mocks ────────────────────────────────────────────────────────────────────
/* eslint-disable @typescript-eslint/no-explicit-any */

const mockRefetch = vi.fn();
const mockFillFieldsMutateAsync = vi.fn();

let mockLookupState: {
  data: Record<string, unknown> | null;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: typeof mockRefetch;
};
let mockFillFieldsState: {
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  mutateAsync: typeof mockFillFieldsMutateAsync;
};

vi.mock('@/hooks/useSync', () => ({
  useTmdbMovieLookup: () => mockLookupState,
  useFillFields: () => mockFillFieldsState,
}));

vi.mock('@/lib/syncUtils', () => ({
  FILLABLE_DATA_FIELDS: ['title', 'synopsis', 'director'],
}));

const mockGetStatus = vi.fn();
vi.mock('@/components/sync/fieldDiffHelpers', () => ({
  getStatus: (...args: any[]) => mockGetStatus(...args),
}));

let capturedDiffPanelProps: any = null;
vi.mock('@/components/sync/FieldDiffPanel', () => ({
  FieldDiffPanel: (props: any) => {
    capturedDiffPanelProps = props;
    return <div data-testid="field-diff-panel" />;
  },
}));

const mockApplyTmdbFields = vi.fn();
vi.mock('@/components/sync/syncHelpers', () => ({
  applyTmdbFields: (...args: any[]) => mockApplyTmdbFields(...args),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const mockMovie = {
  id: 'movie-uuid-123',
  tmdb_id: 12345,
  title: 'Test Movie',
  synopsis: 'A test movie',
  release_date: '2025-01-15',
  poster_url: 'poster.jpg',
  backdrop_url: 'backdrop.jpg',
  director: 'Test Director',
  runtime: 120,
  genres: ['Action'],
  imdb_id: 'tt1234567',
  title_te: null,
  synopsis_te: null,
  tagline: null,
  tmdb_status: 'Released',
  tmdb_vote_average: 7.5,
  tmdb_vote_count: 1000,
  budget: 50000000,
  revenue: 200000000,
  certification: 'UA',
  spoken_languages: ['te'],
  original_language: 'te',
};

const mockTmdbData = {
  tmdbId: 12345,
  title: 'Test Movie',
  overview: 'A test movie',
  releaseDate: '2025-01-15',
  runtime: 120,
  genres: ['Action'],
  posterUrl: 'tmdb-poster.jpg',
  backdropUrl: 'tmdb-backdrop.jpg',
  director: 'Test Director',
  castCount: 10,
  crewCount: 5,
  posterCount: 3,
  backdropCount: 2,
  videoCount: 1,
  providerNames: [],
  keywordCount: 5,
  imdbId: 'tt1234567',
  titleTe: null,
  synopsisTe: null,
  tagline: null,
  tmdbStatus: 'Released',
  tmdbVoteAverage: 7.5,
  tmdbVoteCount: 1000,
  budget: 50000000,
  revenue: 200000000,
  certification: 'UA',
  spokenLanguages: ['te'],
  productionCompanyCount: 2,
  originalLanguage: 'te',
  dbPosterCount: 3,
  dbBackdropCount: 2,
  dbVideoCount: 1,
  dbKeywordCount: 5,
  dbProductionHouseCount: 2,
  dbPlatformNames: [],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

import { SyncSection } from '../SyncSection';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('SyncSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedDiffPanelProps = null;
    mockGetStatus.mockReturnValue('same');
    mockLookupState = {
      data: null,
      isFetching: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    };
    mockFillFieldsState = {
      isPending: false,
      isError: false,
      error: null,
      mutateAsync: mockFillFieldsMutateAsync,
    };
  });

  it('shows loading spinner when fetching', () => {
    mockLookupState.isFetching = true;
    renderWithProviders(<SyncSection movie={mockMovie} />);
    const fetchingTexts = screen.getAllByText('Fetching from TMDB…');
    expect(fetchingTexts).toHaveLength(1);
  });

  it('shows error state when lookup fails', () => {
    mockLookupState.isError = true;
    mockLookupState.error = new Error('Rate limit exceeded');
    renderWithProviders(<SyncSection movie={mockMovie} />);
    expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
  });

  it('shows fill-fields error state', () => {
    mockLookupState.data = { type: 'movie', data: mockTmdbData };
    mockFillFieldsState.isError = true;
    mockFillFieldsState.error = new Error('Apply failed');
    renderWithProviders(<SyncSection movie={mockMovie} />);
    expect(screen.getByText('Apply failed')).toBeInTheDocument();
  });

  it('renders FieldDiffPanel when TMDB data is available', () => {
    mockLookupState.data = { type: 'movie', data: mockTmdbData };
    renderWithProviders(<SyncSection movie={mockMovie} />);
    expect(screen.getByTestId('field-diff-panel')).toBeInTheDocument();
  });

  it('passes correct props to FieldDiffPanel', () => {
    mockLookupState.data = { type: 'movie', data: mockTmdbData };
    renderWithProviders(<SyncSection movie={mockMovie} />);
    expect(capturedDiffPanelProps).not.toBeNull();
    expect(capturedDiffPanelProps.movie.id).toBe('movie-uuid-123');
    expect(capturedDiffPanelProps.movie.tmdb_id).toBe(12345);
    expect(capturedDiffPanelProps.tmdb).toBe(mockTmdbData);
    expect(capturedDiffPanelProps.appliedFields).toEqual([]);
    expect(capturedDiffPanelProps.isSaving).toBe(false);
  });

  it('shows "All fields in sync" when no gaps', () => {
    mockLookupState.data = { type: 'movie', data: mockTmdbData };
    mockGetStatus.mockReturnValue('same');
    renderWithProviders(<SyncSection movie={mockMovie} />);
    expect(screen.getByText('All fields in sync')).toBeInTheDocument();
  });

  it('shows gap count when fields differ', () => {
    mockLookupState.data = { type: 'movie', data: mockTmdbData };
    mockGetStatus.mockImplementation((_m: any, _t: any, field: string) =>
      field === 'title' ? 'missing' : 'same',
    );
    renderWithProviders(<SyncSection movie={mockMovie} />);
    expect(screen.getByText('1 gap found')).toBeInTheDocument();
  });

  it('shows plural gaps text for multiple gaps', () => {
    mockLookupState.data = { type: 'movie', data: mockTmdbData };
    mockGetStatus.mockReturnValue('missing');
    renderWithProviders(<SyncSection movie={mockMovie} />);
    expect(screen.getByText('3 gaps found')).toBeInTheDocument();
  });

  it('handles apply callback correctly', async () => {
    mockLookupState.data = { type: 'movie', data: mockTmdbData };
    mockFillFieldsMutateAsync.mockResolvedValue({
      movieId: 'movie-uuid-123',
      updatedFields: ['title', 'director'],
    });
    mockApplyTmdbFields.mockReturnValue({
      movie: { ...mockMovie, title: 'Updated Title' },
      tmdb: mockTmdbData,
    });

    renderWithProviders(<SyncSection movie={mockMovie} />);
    expect(capturedDiffPanelProps).not.toBeNull();

    await capturedDiffPanelProps.onApply(['title', 'director'], false);

    expect(mockFillFieldsMutateAsync).toHaveBeenCalledWith({
      tmdbId: 12345,
      fields: ['title', 'director'],
    });
    expect(mockApplyTmdbFields).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'movie-uuid-123' }),
      mockTmdbData,
      ['title', 'director'],
    );
  });

  it('passes forceResyncCast when requested', async () => {
    mockLookupState.data = { type: 'movie', data: mockTmdbData };
    mockFillFieldsMutateAsync.mockResolvedValue({
      movieId: 'movie-uuid-123',
      updatedFields: ['title'],
    });
    mockApplyTmdbFields.mockReturnValue({ movie: mockMovie, tmdb: mockTmdbData });

    renderWithProviders(<SyncSection movie={mockMovie} />);
    await capturedDiffPanelProps.onApply(['title'], true);

    expect(mockFillFieldsMutateAsync).toHaveBeenCalledWith({
      tmdbId: 12345,
      fields: ['title'],
      forceResyncCast: true,
    });
  });

  it('re-fetch button calls refetch', () => {
    mockLookupState.data = { type: 'movie', data: mockTmdbData };
    renderWithProviders(<SyncSection movie={mockMovie} />);
    fireEvent.click(screen.getByText('Re-fetch from TMDB'));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('hides re-fetch button while fetching', () => {
    mockLookupState.isFetching = true;
    renderWithProviders(<SyncSection movie={mockMovie} />);
    expect(screen.queryByText('Re-fetch from TMDB')).not.toBeInTheDocument();
  });

  it('does not render FieldDiffPanel when TMDB data is for wrong movie', () => {
    mockLookupState.data = {
      type: 'movie',
      data: { ...mockTmdbData, tmdbId: 99999 },
    };
    renderWithProviders(<SyncSection movie={mockMovie} />);
    expect(screen.queryByTestId('field-diff-panel')).not.toBeInTheDocument();
  });

  it('updates appliedFields after successful apply', async () => {
    mockLookupState.data = { type: 'movie', data: mockTmdbData };
    mockFillFieldsMutateAsync.mockResolvedValue({
      movieId: 'movie-uuid-123',
      updatedFields: ['title'],
    });
    mockApplyTmdbFields.mockReturnValue({ movie: mockMovie, tmdb: mockTmdbData });

    renderWithProviders(<SyncSection movie={mockMovie} />);
    await capturedDiffPanelProps.onApply(['title'], false);

    await waitFor(() => {
      expect(capturedDiffPanelProps.appliedFields).toContain('title');
    });
  });

  it('does not call applyTmdbFields when updatedFields is empty', async () => {
    mockLookupState.data = { type: 'movie', data: mockTmdbData };
    mockFillFieldsMutateAsync.mockResolvedValue({
      movieId: 'movie-uuid-123',
      updatedFields: [],
    });

    renderWithProviders(<SyncSection movie={mockMovie} />);
    await capturedDiffPanelProps.onApply(['title'], false);

    expect(mockApplyTmdbFields).not.toHaveBeenCalled();
  });

  it('shows fallback error text when lookup error is not an Error instance', () => {
    mockLookupState.isError = true;
    mockLookupState.error = 'string error' as unknown as Error;
    renderWithProviders(<SyncSection movie={mockMovie} />);
    expect(screen.getByText('TMDB fetch failed')).toBeInTheDocument();
  });

  it('shows fallback error text when fillFields error is not an Error instance', () => {
    mockLookupState.data = { type: 'movie', data: mockTmdbData };
    mockFillFieldsState.isError = true;
    mockFillFieldsState.error = 'string error' as unknown as Error;
    renderWithProviders(<SyncSection movie={mockMovie} />);
    expect(screen.getByText('Apply failed')).toBeInTheDocument();
  });

  it('calls onFieldsApplied with form patch after successful apply', async () => {
    mockLookupState.data = { type: 'movie', data: mockTmdbData };
    const onFieldsApplied = vi.fn();
    mockFillFieldsMutateAsync.mockResolvedValue({
      movieId: 'movie-uuid-123',
      updatedFields: ['synopsis', 'genres'],
    });
    const updatedMovie = {
      ...mockMovie,
      synopsis: 'New synopsis from TMDB',
      genres: ['Romance', 'Drama'],
    };
    mockApplyTmdbFields.mockReturnValue({ movie: updatedMovie, tmdb: mockTmdbData });

    renderWithProviders(<SyncSection movie={mockMovie} onFieldsApplied={onFieldsApplied} />);
    await capturedDiffPanelProps.onApply(['synopsis', 'genres'], false);

    expect(onFieldsApplied).toHaveBeenCalledTimes(1);
    expect(onFieldsApplied).toHaveBeenCalledWith({
      synopsis: 'New synopsis from TMDB',
      genres: ['Romance', 'Drama'],
    });
  });

  it('does not call onFieldsApplied when no form-relevant fields updated', async () => {
    mockLookupState.data = { type: 'movie', data: mockTmdbData };
    const onFieldsApplied = vi.fn();
    mockFillFieldsMutateAsync.mockResolvedValue({
      movieId: 'movie-uuid-123',
      updatedFields: ['cast'],
    });
    mockApplyTmdbFields.mockReturnValue({ movie: mockMovie, tmdb: mockTmdbData });

    renderWithProviders(<SyncSection movie={mockMovie} onFieldsApplied={onFieldsApplied} />);
    await capturedDiffPanelProps.onApply(['cast'], false);

    expect(onFieldsApplied).not.toHaveBeenCalled();
  });

  it('passes isSaving=true to FieldDiffPanel when fill is pending', () => {
    mockLookupState.data = { type: 'movie', data: mockTmdbData };
    mockFillFieldsState.isPending = true;
    renderWithProviders(<SyncSection movie={mockMovie} />);
    expect(capturedDiffPanelProps.isSaving).toBe(true);
  });
});
