import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockImportMutateAsync = vi.fn();
const mockLinkTmdbIdMutateAsync = vi.fn();

vi.mock('@/hooks/useSync', () => ({
  useImportMovies: vi.fn(() => ({ mutateAsync: mockImportMutateAsync, isPending: false })),
  useLinkTmdbId: vi.fn(() => ({ mutateAsync: mockLinkTmdbIdMutateAsync, isPending: false })),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => ({
    isReadOnly: false,
    languageCodes: [],
  })),
}));

vi.mock('@/hooks/useLanguageContext', () => ({
  useLanguageContext: vi.fn(() => ({
    selectedLanguageCode: null,
  })),
}));

vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChangesWarning: vi.fn(),
}));

vi.mock('@/components/sync/DiscoverResults', () => ({
  ImportProgressList: ({
    items,
  }: {
    items: Array<{ tmdbId: number; title: string; status: string }>;
  }) => (
    <div data-testid="import-progress">
      {items.map((item) => (
        <span key={item.tmdbId} data-testid={`progress-${item.tmdbId}`}>
          {item.status}
        </span>
      ))}
    </div>
  ),
}));

vi.mock('@/lib/movie-constants', () => ({
  LANGUAGE_OPTIONS: [
    { value: 'te', label: 'Telugu' },
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'Hindi' },
  ],
}));

import { MovieSearchResults } from '@/components/sync/MovieSearchResults';

type TmdbMovie = {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  original_language: string;
};

const makeMovie = (overrides: Partial<TmdbMovie> = {}): TmdbMovie => ({
  id: 1,
  title: 'Test Movie',
  poster_path: null,
  release_date: '2024-01-01',
  original_language: 'te',
  ...overrides,
});

describe('MovieSearchResults', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset to default (no restriction)
    const permsMod = await import('@/hooks/usePermissions');
    vi.mocked(permsMod.usePermissions).mockReturnValue({
      isReadOnly: false,
      languageCodes: [],
    } as ReturnType<typeof permsMod.usePermissions>);
    const langMod = await import('@/hooks/useLanguageContext');
    vi.mocked(langMod.useLanguageContext).mockReturnValue({
      selectedLanguageCode: null,
    } as ReturnType<typeof langMod.useLanguageContext>);
  });

  it('renders movies count in heading', () => {
    const movies = [makeMovie(), makeMovie({ id: 2, title: 'Movie 2' })];
    render(<MovieSearchResults movies={movies} existingSet={new Set()} />);
    expect(screen.getByText(/Movies \(2\)/)).toBeInTheDocument();
  });

  it('renders each movie title', () => {
    const movies = [
      makeMovie({ title: 'Telugu Movie' }),
      makeMovie({ id: 2, title: 'Hindi Movie', original_language: 'hi' }),
    ];
    render(<MovieSearchResults movies={movies} existingSet={new Set()} />);
    expect(screen.getByText('Telugu Movie')).toBeInTheDocument();
    expect(screen.getByText('Hindi Movie')).toBeInTheDocument();
  });

  it('shows "In DB" badge for existing movies', () => {
    const movies = [makeMovie()];
    render(<MovieSearchResults movies={movies} existingSet={new Set([1])} />);
    expect(screen.getByText('In DB')).toBeInTheDocument();
  });

  it('shows "Duplicate?" badge for duplicate suspects', () => {
    const movies = [makeMovie()];
    const suspects = { 1: { id: 'db-1', title: 'Existing Movie' } };
    render(
      <MovieSearchResults movies={movies} existingSet={new Set()} duplicateSuspects={suspects} />,
    );
    expect(screen.getByText('Duplicate?')).toBeInTheDocument();
  });

  it('shows "Select all new" button when new movies exist', () => {
    const movies = [makeMovie()];
    render(<MovieSearchResults movies={movies} existingSet={new Set()} />);
    expect(screen.getByText(/Select all new/)).toBeInTheDocument();
  });

  it('does not show "Select all new" when all movies are in DB', () => {
    const movies = [makeMovie()];
    render(<MovieSearchResults movies={movies} existingSet={new Set([1])} />);
    expect(screen.queryByText(/Select all new/)).not.toBeInTheDocument();
  });

  it('selects all new movies on "Select all new" click', () => {
    const movies = [makeMovie(), makeMovie({ id: 2, title: 'Movie 2' })];
    render(<MovieSearchResults movies={movies} existingSet={new Set()} />);
    fireEvent.click(screen.getByText(/Select all new/));
    expect(screen.getByText('Deselect all')).toBeInTheDocument();
    expect(screen.getByText('Import 2 selected')).toBeInTheDocument();
  });

  it('deselects all on "Deselect all" click', () => {
    const movies = [makeMovie()];
    render(<MovieSearchResults movies={movies} existingSet={new Set()} />);
    fireEvent.click(screen.getByText(/Select all new/));
    fireEvent.click(screen.getByText('Deselect all'));
    expect(screen.queryByText('Deselect all')).not.toBeInTheDocument();
    expect(screen.getByText(/Select all new/)).toBeInTheDocument();
  });

  it('shows "Import N selected" button when movies are selected', () => {
    const movies = [makeMovie()];
    render(<MovieSearchResults movies={movies} existingSet={new Set()} />);
    fireEvent.click(screen.getByText(/Select all new/));
    expect(screen.getByText('Import 1 selected')).toBeInTheDocument();
  });

  it('does not show import button when nothing selected', () => {
    const movies = [makeMovie()];
    render(<MovieSearchResults movies={movies} existingSet={new Set()} />);
    expect(screen.queryByText(/Import \d+ selected/)).not.toBeInTheDocument();
  });

  it('calls importMovies when import button is clicked', async () => {
    mockImportMutateAsync.mockResolvedValue({ results: [], errors: [] });
    const movies = [makeMovie()];
    render(<MovieSearchResults movies={movies} existingSet={new Set()} />);
    fireEvent.click(screen.getByText(/Select all new/));
    fireEvent.click(screen.getByText('Import 1 selected'));

    await waitFor(() => {
      expect(mockImportMutateAsync).toHaveBeenCalled();
    });
  });

  it('shows import progress list after import', async () => {
    mockImportMutateAsync.mockResolvedValue({ results: [], errors: [] });
    const movies = [makeMovie()];
    render(<MovieSearchResults movies={movies} existingSet={new Set()} />);
    fireEvent.click(screen.getByText(/Select all new/));
    fireEvent.click(screen.getByText('Import 1 selected'));

    await waitFor(() => {
      expect(screen.getByTestId('import-progress')).toBeInTheDocument();
    });
  });

  it('marks failed imports in progress', async () => {
    mockImportMutateAsync.mockResolvedValue({
      results: [],
      errors: [{ tmdbId: 1, message: 'TMDB error' }],
    });
    const movies = [makeMovie()];
    render(<MovieSearchResults movies={movies} existingSet={new Set()} />);
    fireEvent.click(screen.getByText(/Select all new/));
    fireEvent.click(screen.getByText('Import 1 selected'));

    await waitFor(() => {
      expect(screen.getByTestId('progress-1')).toHaveTextContent('failed');
    });
  });

  it('handles import network error', async () => {
    mockImportMutateAsync.mockRejectedValue(new Error('Network error'));
    const movies = [makeMovie()];
    render(<MovieSearchResults movies={movies} existingSet={new Set()} />);
    fireEvent.click(screen.getByText(/Select all new/));
    fireEvent.click(screen.getByText('Import 1 selected'));

    await waitFor(() => {
      expect(screen.getByTestId('progress-1')).toHaveTextContent('failed');
    });
  });

  it('marks successful imports in progress', async () => {
    mockImportMutateAsync.mockResolvedValue({
      results: [{ tmdbId: 1, movieId: 'db-1', title: 'Test Movie' }],
      errors: [],
    });
    const movies = [makeMovie()];
    render(<MovieSearchResults movies={movies} existingSet={new Set()} />);
    fireEvent.click(screen.getByText(/Select all new/));
    fireEvent.click(screen.getByText('Import 1 selected'));

    await waitFor(() => {
      expect(screen.getByTestId('progress-1')).toHaveTextContent('done');
    });
  });

  it('shows language filter toggle when language restriction is active', async () => {
    const permsMod = await import('@/hooks/usePermissions');
    vi.mocked(permsMod.usePermissions).mockReturnValue({
      isReadOnly: false,
      languageCodes: ['te'],
    } as ReturnType<typeof permsMod.usePermissions>);

    const movies = [makeMovie()];
    render(<MovieSearchResults movies={movies} existingSet={new Set()} />);

    expect(screen.getByText('All languages')).toBeInTheDocument();
    // "My languages" button should be present
    expect(screen.getByText('My languages')).toBeInTheDocument();
  });

  it('does not show language filter toggle when no restriction', () => {
    // Default mock has languageCodes: [] — no restriction
    const movies = [makeMovie()];
    render(<MovieSearchResults movies={movies} existingSet={new Set()} />);

    expect(screen.queryByText('All languages')).not.toBeInTheDocument();
  });

  it('shows language label from LANGUAGE_OPTIONS when selectedLanguageCode is set', async () => {
    const { useLanguageContext } = await import('@/hooks/useLanguageContext');
    vi.mocked(useLanguageContext).mockReturnValue({
      selectedLanguageCode: 'te',
    } as ReturnType<typeof useLanguageContext>);

    const movies = [makeMovie()];
    render(<MovieSearchResults movies={movies} existingSet={new Set()} />);

    expect(screen.getByText('Telugu')).toBeInTheDocument();
  });

  it('shows "My languages" label when no selectedLanguageCode but has languageCodes', async () => {
    const { usePermissions } = await import('@/hooks/usePermissions');
    vi.mocked(usePermissions).mockReturnValue({
      isReadOnly: false,
      languageCodes: ['te'],
    } as ReturnType<typeof usePermissions>);

    const { useLanguageContext } = await import('@/hooks/useLanguageContext');
    vi.mocked(useLanguageContext).mockReturnValue({
      selectedLanguageCode: null,
    } as ReturnType<typeof useLanguageContext>);

    const movies = [makeMovie()];
    render(<MovieSearchResults movies={movies} existingSet={new Set()} />);

    expect(screen.getByText('My languages')).toBeInTheDocument();
  });

  it('shows "Not your language" badge for language-blocked movies', async () => {
    const { usePermissions } = await import('@/hooks/usePermissions');
    vi.mocked(usePermissions).mockReturnValue({
      isReadOnly: false,
      languageCodes: ['te'], // only Telugu allowed
    } as ReturnType<typeof usePermissions>);
    const { useLanguageContext } = await import('@/hooks/useLanguageContext');
    vi.mocked(useLanguageContext).mockReturnValue({
      selectedLanguageCode: 'te',
    } as ReturnType<typeof useLanguageContext>);

    const movies = [makeMovie({ original_language: 'en' })]; // English is blocked
    render(<MovieSearchResults movies={movies} existingSet={new Set()} />);

    expect(screen.getByText('Not your language')).toBeInTheDocument();
  });

  it('filters movies when language filter is toggled on', async () => {
    const { useLanguageContext } = await import('@/hooks/useLanguageContext');
    vi.mocked(useLanguageContext).mockReturnValue({
      selectedLanguageCode: 'te',
    } as ReturnType<typeof useLanguageContext>);

    const movies = [
      makeMovie({ id: 1, title: 'Telugu Movie', original_language: 'te' }),
      makeMovie({ id: 2, title: 'English Movie', original_language: 'en' }),
    ];
    render(<MovieSearchResults movies={movies} existingSet={new Set()} />);

    // Click Telugu filter
    const teluguBtn = screen.getByText('Telugu');
    fireEvent.click(teluguBtn);

    // English movie should be hidden (it's blocked by language filter)
    await waitFor(() => {
      expect(screen.queryByText('English Movie')).not.toBeInTheDocument();
    });
  });

  it('links duplicate when Link to TMDB is clicked', async () => {
    mockLinkTmdbIdMutateAsync.mockResolvedValue({});
    const movies = [makeMovie()];
    const suspects = { 1: { id: 'db-1', title: 'Existing Movie' } };
    render(
      <MovieSearchResults movies={movies} existingSet={new Set()} duplicateSuspects={suspects} />,
    );

    fireEvent.click(screen.getByText('Link to TMDB'));

    await waitFor(() => {
      expect(mockLinkTmdbIdMutateAsync).toHaveBeenCalledWith({ movieId: 'db-1', tmdbId: 1 });
    });
  });

  it('shows "Edit instead" link for duplicate suspects', () => {
    const movies = [makeMovie()];
    const suspects = { 1: { id: 'db-1', title: 'Existing Movie' } };
    render(
      <MovieSearchResults movies={movies} existingSet={new Set()} duplicateSuspects={suspects} />,
    );

    expect(screen.getByText('Edit instead')).toBeInTheDocument();
    expect(screen.getByText('Edit instead')).toHaveAttribute('href', '/movies/db-1');
  });

  it('shows duplicate title in suspect section', () => {
    const movies = [makeMovie()];
    const suspects = { 1: { id: 'db-1', title: 'Existing Movie Title' } };
    render(
      <MovieSearchResults movies={movies} existingSet={new Set()} duplicateSuspects={suspects} />,
    );

    expect(screen.getByText(/Existing Movie Title/)).toBeInTheDocument();
  });

  it('shows release date for each movie', () => {
    const movies = [makeMovie({ release_date: '2024-06-15' })];
    render(<MovieSearchResults movies={movies} existingSet={new Set()} />);
    expect(screen.getByText(/2024-06-15/)).toBeInTheDocument();
  });

  it('shows "No date" when release_date is empty', () => {
    const movies = [makeMovie({ release_date: '' })];
    render(<MovieSearchResults movies={movies} existingSet={new Set()} />);
    expect(screen.getByText(/No date/)).toBeInTheDocument();
  });

  it('adds linked movie to existing set after successful link', async () => {
    mockLinkTmdbIdMutateAsync.mockResolvedValue({});
    const movies = [makeMovie()];
    const suspects = { 1: { id: 'db-1', title: 'Existing Movie' } };
    render(
      <MovieSearchResults movies={movies} existingSet={new Set()} duplicateSuspects={suspects} />,
    );

    fireEvent.click(screen.getByText('Link to TMDB'));

    await waitFor(() => {
      // After linking, movie should show "In DB" badge
      expect(screen.getByText('In DB')).toBeInTheDocument();
    });
  });

  it('shows poster image when poster_path is set', () => {
    const movies = [makeMovie({ poster_path: '/abc.jpg' })];
    render(<MovieSearchResults movies={movies} existingSet={new Set()} />);
    const img = screen.getByAltText('Test Movie');
    expect(img).toHaveAttribute('src', 'https://image.tmdb.org/t/p/w200/abc.jpg');
  });

  it('shows film icon placeholder when poster_path is null', () => {
    const movies = [makeMovie({ poster_path: null })];
    render(<MovieSearchResults movies={movies} existingSet={new Set()} />);
    // No img element for the poster, SVG icons will be present
    expect(screen.queryByAltText('Test Movie')).not.toBeInTheDocument();
  });

  it('shows language label next to release date', () => {
    const movies = [makeMovie({ original_language: 'te' })];
    render(<MovieSearchResults movies={movies} existingSet={new Set()} />);
    // "Telugu" appears in the movie card's language chip
    const teluguEls = screen.getAllByText(/Telugu/);
    expect(teluguEls.length).toBeGreaterThan(0);
  });

  it('shows raw language code when not in LANGUAGE_OPTIONS', () => {
    const movies = [makeMovie({ original_language: 'zz' })];
    render(<MovieSearchResults movies={movies} existingSet={new Set()} />);
    expect(screen.getByText(/zz/)).toBeInTheDocument();
  });
});
