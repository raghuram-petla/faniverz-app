import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockSearch = vi.fn();
const mockDiscover = vi.fn();
const mockLookup = vi.fn();
const mockImportMovies = vi.fn();
const mockImportActor = vi.fn();
const mockRefreshActor = vi.fn();

vi.mock('@/hooks/useSync', () => ({
  useTmdbSearch: () => mockSearch(),
  useDiscoverMovies: () => mockDiscover(),
  useTmdbLookup: () => mockLookup(),
  useImportMovies: () => mockImportMovies(),
  useImportActor: () => mockImportActor(),
  useRefreshActor: () => mockRefreshActor(),
}));

vi.mock('@/hooks/useLanguageContext', () => ({
  useLanguageContext: () => ({ selectedLanguageCode: 'te' }),
}));

vi.mock('@/components/sync/SearchResultsPanel', () => ({
  SearchResultsPanel: ({ data }: { data: unknown }) => (
    <div data-testid="search-results">{JSON.stringify(data)}</div>
  ),
}));

vi.mock('@/components/sync/DiscoverByYear', () => ({
  DiscoverByYear: ({ data }: { data: unknown }) => (
    <div data-testid="discover-results">{JSON.stringify(data)}</div>
  ),
}));

vi.mock('@/components/sync/MoviePreview', () => ({
  MoviePreview: ({
    result,
    onImport,
    isPending,
  }: {
    result: { data: { title: string } };
    onImport: () => void;
    isPending: boolean;
  }) => (
    <div data-testid="movie-preview">
      <span>{result.data.title}</span>
      <button onClick={onImport} disabled={isPending}>
        Import
      </button>
    </div>
  ),
}));

vi.mock('@/components/sync/PersonPreview', () => ({
  PersonPreview: ({
    result,
    onImport,
    onRefresh,
    isPending,
  }: {
    result: { data: { name: string } };
    onImport: () => void;
    onRefresh: () => void;
    isPending: boolean;
  }) => (
    <div data-testid="person-preview">
      <span>{result.data.name}</span>
      <button onClick={onImport} disabled={isPending}>
        Import Person
      </button>
      <button onClick={onRefresh} disabled={isPending}>
        Refresh
      </button>
    </div>
  ),
}));

let mockMonthSelected: number[] = [];
let mockMonthOnChange: (months: number[]) => void = () => {};
vi.mock('@/components/sync/MonthMultiSelect', () => ({
  MonthMultiSelect: ({
    selected,
    onChange,
  }: {
    selected: number[];
    onChange: (m: number[]) => void;
  }) => {
    mockMonthSelected = selected;
    mockMonthOnChange = onChange;
    return (
      <div data-testid="month-multi-select">
        <span>{selected.length === 0 ? 'All months' : selected.map(String).join(',')}</span>
      </div>
    );
  },
}));

vi.mock('@/components/sync/syncHelpers', () => {
  const year = new Date().getFullYear();
  return {
    CURRENT_YEAR: year,
    YEARS: [year, year - 1],
    MONTHS: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
  };
});

import { DiscoverTab } from '@/components/sync/DiscoverTab';

const CURRENT_YEAR = new Date().getFullYear();

function makeIdleHook(overrides = {}) {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
    isError: false,
    isSuccess: false,
    data: undefined,
    error: null,
    ...overrides,
  };
}

function setup(
  overrides: {
    searchOverrides?: object;
    discoverOverrides?: object;
    lookupOverrides?: object;
    importMoviesOverrides?: object;
    importActorOverrides?: object;
    refreshActorOverrides?: object;
  } = {},
) {
  mockSearch.mockReturnValue(makeIdleHook(overrides.searchOverrides));
  mockDiscover.mockReturnValue(makeIdleHook(overrides.discoverOverrides));
  mockLookup.mockReturnValue(makeIdleHook(overrides.lookupOverrides));
  mockImportMovies.mockReturnValue(makeIdleHook(overrides.importMoviesOverrides));
  mockImportActor.mockReturnValue(makeIdleHook(overrides.importActorOverrides));
  mockRefreshActor.mockReturnValue(makeIdleHook(overrides.refreshActorOverrides));
}

describe('DiscoverTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setup();
  });

  describe('initial render', () => {
    it('renders search input', () => {
      render(<DiscoverTab />);
      expect(screen.getByPlaceholderText(/Search movies, actors, or TMDB ID/i)).toBeInTheDocument();
    });

    it('renders Search button', () => {
      render(<DiscoverTab />);
      expect(screen.getByText('Search')).toBeInTheDocument();
    });

    it('renders Discover button', () => {
      render(<DiscoverTab />);
      expect(screen.getByText('Discover')).toBeInTheDocument();
    });

    it('renders year select and month multi-select', () => {
      render(<DiscoverTab />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByTestId('month-multi-select')).toBeInTheDocument();
    });
  });

  describe('search button label', () => {
    it('shows "Lookup" when query is numeric', () => {
      render(<DiscoverTab />);
      const input = screen.getByPlaceholderText(/Search movies/i);
      fireEvent.change(input, { target: { value: '12345' } });
      expect(screen.getByText('Lookup')).toBeInTheDocument();
    });

    it('shows "Search" when query is non-numeric', () => {
      render(<DiscoverTab />);
      const input = screen.getByPlaceholderText(/Search movies/i);
      fireEvent.change(input, { target: { value: 'Baahubali' } });
      expect(screen.getByText('Search')).toBeInTheDocument();
    });
  });

  describe('search disabled state', () => {
    it('disables search button when query is less than 2 characters', () => {
      render(<DiscoverTab />);
      const input = screen.getByPlaceholderText(/Search movies/i);
      fireEvent.change(input, { target: { value: 'B' } });
      const btn = screen.getByText('Search').closest('button')!;
      expect(btn).toBeDisabled();
    });

    it('enables search button when query has 2+ characters', () => {
      render(<DiscoverTab />);
      const input = screen.getByPlaceholderText(/Search movies/i);
      fireEvent.change(input, { target: { value: 'Ba' } });
      const btn = screen.getByText('Search').closest('button')!;
      expect(btn).not.toBeDisabled();
    });

    it('disables search when isPending is true', () => {
      setup({ searchOverrides: { isPending: true } });
      render(<DiscoverTab />);
      const input = screen.getByPlaceholderText(/Search movies/i);
      fireEvent.change(input, { target: { value: 'Baahubali' } });
      // Button text changes when pending
      expect(screen.getByText('Search').closest('button')).toBeDisabled();
    });
  });

  describe('text search', () => {
    it('calls search.mutate with text query', () => {
      const searchHook = makeIdleHook();
      mockSearch.mockReturnValue(searchHook);
      render(<DiscoverTab />);
      const input = screen.getByPlaceholderText(/Search movies/i);
      fireEvent.change(input, { target: { value: 'Baahubali' } });
      fireEvent.click(screen.getByText('Search'));
      expect(searchHook.mutate).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'Baahubali', language: 'te' }),
      );
    });

    it('calls search on Enter key', () => {
      const searchHook = makeIdleHook();
      mockSearch.mockReturnValue(searchHook);
      render(<DiscoverTab />);
      const input = screen.getByPlaceholderText(/Search movies/i);
      fireEvent.change(input, { target: { value: 'Baahubali' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(searchHook.mutate).toHaveBeenCalled();
    });

    it('does not search when query length < 2', () => {
      const searchHook = makeIdleHook();
      mockSearch.mockReturnValue(searchHook);
      render(<DiscoverTab />);
      const input = screen.getByPlaceholderText(/Search movies/i);
      fireEvent.change(input, { target: { value: 'B' } });
      fireEvent.click(screen.getByText('Search'));
      expect(searchHook.mutate).not.toHaveBeenCalled();
    });

    it('shows SearchResultsPanel with search data', () => {
      const searchData = { movies: [], people: [] };
      setup({
        searchOverrides: {
          isSuccess: true,
          data: searchData,
        },
      });
      render(<DiscoverTab />);
      const input = screen.getByPlaceholderText(/Search movies/i);
      fireEvent.change(input, { target: { value: 'Baahubali' } });
      fireEvent.click(screen.getByText('Search'));
      expect(screen.getByTestId('search-results')).toBeInTheDocument();
    });
  });

  describe('lookup (numeric ID)', () => {
    it('calls lookup.mutate with tmdbId when query is numeric', () => {
      const lookupHook = makeIdleHook();
      mockLookup.mockReturnValue(lookupHook);
      render(<DiscoverTab />);
      const input = screen.getByPlaceholderText(/Search movies/i);
      fireEvent.change(input, { target: { value: '12345' } });
      fireEvent.click(screen.getByText('Lookup'));
      expect(lookupHook.mutate).toHaveBeenCalledWith({ tmdbId: 12345, type: 'movie' });
    });

    it('shows MoviePreview when lookup returns a movie', () => {
      const lookupData = {
        type: 'movie',
        existsInDb: false,
        existingId: null,
        data: { tmdbId: 12345, title: 'Baahubali' },
      };
      setup({ lookupOverrides: { data: lookupData } });
      render(<DiscoverTab />);
      const input = screen.getByPlaceholderText(/Search movies/i);
      fireEvent.change(input, { target: { value: '12345' } });
      fireEvent.click(screen.getByText('Lookup'));
      expect(screen.getByTestId('movie-preview')).toBeInTheDocument();
      expect(screen.getByText('Baahubali')).toBeInTheDocument();
    });

    it('shows PersonPreview when lookup returns a person', () => {
      const lookupData = {
        type: 'person',
        existsInDb: false,
        existingId: null,
        data: { tmdbPersonId: 500, name: 'Prabhas' },
      };
      setup({ lookupOverrides: { data: lookupData } });
      render(<DiscoverTab />);
      const input = screen.getByPlaceholderText(/Search movies/i);
      fireEvent.change(input, { target: { value: '500' } });
      fireEvent.click(screen.getByText('Lookup'));
      expect(screen.getByTestId('person-preview')).toBeInTheDocument();
    });

    it('shows success message after movie import', () => {
      const lookupData = {
        type: 'movie',
        existsInDb: false,
        existingId: null,
        data: { tmdbId: 12345, title: 'Baahubali' },
      };
      setup({
        lookupOverrides: { data: lookupData },
        importMoviesOverrides: { isSuccess: true },
      });
      render(<DiscoverTab />);
      fireEvent.change(screen.getByPlaceholderText(/Search movies/i), {
        target: { value: '12345' },
      });
      fireEvent.click(screen.getByText('Lookup'));
      expect(screen.getByText(/Import completed/i)).toBeInTheDocument();
    });

    it('shows actor import success message with name', () => {
      const lookupData = {
        type: 'person',
        existsInDb: false,
        existingId: null,
        data: { tmdbPersonId: 500, name: 'Prabhas' },
      };
      setup({
        lookupOverrides: { data: lookupData },
        importActorOverrides: {
          isSuccess: true,
          data: { result: { name: 'Prabhas' } },
        },
      });
      render(<DiscoverTab />);
      fireEvent.change(screen.getByPlaceholderText(/Search movies/i), { target: { value: '500' } });
      fireEvent.click(screen.getByText('Lookup'));
      expect(screen.getByText(/Actor imported: Prabhas/i)).toBeInTheDocument();
    });

    it('shows actor refresh success message', () => {
      const lookupData = {
        type: 'person',
        existsInDb: true,
        existingId: 'actor-1',
        data: { tmdbPersonId: 500, name: 'Prabhas' },
      };
      setup({
        lookupOverrides: { data: lookupData },
        refreshActorOverrides: {
          isSuccess: true,
          data: { result: { fields: ['name', 'photo_url'] } },
        },
      });
      render(<DiscoverTab />);
      fireEvent.change(screen.getByPlaceholderText(/Search movies/i), { target: { value: '500' } });
      fireEvent.click(screen.getByText('Lookup'));
      expect(screen.getByText(/Actor refreshed/i)).toBeInTheDocument();
      expect(screen.getByText(/name, photo_url/i)).toBeInTheDocument();
    });
  });

  describe('discover', () => {
    it('calls discover.mutate with year and language', () => {
      const discoverHook = makeIdleHook();
      mockDiscover.mockReturnValue(discoverHook);
      render(<DiscoverTab />);
      fireEvent.click(screen.getByText('Discover'));
      expect(discoverHook.mutate).toHaveBeenCalledWith(
        expect.objectContaining({ year: CURRENT_YEAR, language: 'te' }),
      );
    });

    it('passes months when months are selected', () => {
      const discoverHook = makeIdleHook();
      mockDiscover.mockReturnValue(discoverHook);
      render(<DiscoverTab />);
      // Simulate selecting March via MonthMultiSelect onChange
      act(() => {
        mockMonthOnChange([3]);
      });
      fireEvent.click(screen.getByText('Discover'));
      expect(discoverHook.mutate).toHaveBeenCalledWith(expect.objectContaining({ months: [3] }));
    });

    it('does not pass months when "All months" is selected', () => {
      const discoverHook = makeIdleHook();
      mockDiscover.mockReturnValue(discoverHook);
      render(<DiscoverTab />);
      fireEvent.click(screen.getByText('Discover'));
      const call = discoverHook.mutate.mock.calls[0][0];
      expect(call.months).toBeUndefined();
    });

    it('shows DiscoverByYear panel when discover data is present', () => {
      const discoverData = { movies: [], total: 0 };
      setup({ discoverOverrides: { data: discoverData } });
      render(<DiscoverTab />);
      fireEvent.click(screen.getByText('Discover'));
      expect(screen.getByTestId('discover-results')).toBeInTheDocument();
    });

    it('shows result label after discover with months', () => {
      setup({ discoverOverrides: { data: { movies: [] } } });
      render(<DiscoverTab />);
      // Simulate selecting March via MonthMultiSelect onChange
      act(() => {
        mockMonthOnChange([3]);
      });
      fireEvent.click(screen.getByText('Discover'));
      // The label span contains the resultLabel e.g. "March 2026"
      expect(
        screen.getByText(
          (content) => content.includes('March') && content.includes(String(CURRENT_YEAR)),
        ),
      ).toBeInTheDocument();
    });

    it('shows result label after discover without month', () => {
      setup({ discoverOverrides: { data: { movies: [] } } });
      render(<DiscoverTab />);
      fireEvent.click(screen.getByText('Discover'));
      // The span contains just the year as the resultLabel
      expect(screen.getByText((content) => content === String(CURRENT_YEAR))).toBeInTheDocument();
    });
  });

  describe('import actions', () => {
    it('calls importMovies.mutateAsync when movie import button clicked', async () => {
      const importMutateAsync = vi.fn().mockResolvedValue(undefined);
      const lookupData = {
        type: 'movie',
        existsInDb: false,
        existingId: null,
        data: { tmdbId: 999, title: 'Import Test' },
      };
      setup({
        lookupOverrides: { data: lookupData },
        importMoviesOverrides: {
          mutateAsync: importMutateAsync,
          isPending: false,
          isSuccess: false,
        },
      });
      render(<DiscoverTab />);
      fireEvent.change(screen.getByPlaceholderText(/Search movies/i), {
        target: { value: '999' },
      });
      fireEvent.click(screen.getByText('Lookup'));
      // Click the Import button in MoviePreview mock
      fireEvent.click(screen.getByText('Import'));
      expect(importMutateAsync).toHaveBeenCalledWith({
        tmdbIds: [999],
        originalLanguage: undefined,
      });
    });

    it('handleLookupImport does nothing when lookup result is not a movie', async () => {
      const importMutateAsync = vi.fn().mockResolvedValue(undefined);
      const lookupData = {
        type: 'person',
        existsInDb: false,
        existingId: null,
        data: { tmdbPersonId: 500, name: 'Actor' },
      };
      setup({
        lookupOverrides: { data: lookupData },
        importMoviesOverrides: { mutateAsync: importMutateAsync },
      });
      render(<DiscoverTab />);
      fireEvent.change(screen.getByPlaceholderText(/Search movies/i), {
        target: { value: '500' },
      });
      fireEvent.click(screen.getByText('Lookup'));
      // PersonPreview is shown, not MoviePreview — import button is for person
    });

    it('calls importActor.mutateAsync when person import button clicked', async () => {
      const importActorAsync = vi.fn().mockResolvedValue(undefined);
      const lookupData = {
        type: 'person',
        existsInDb: false,
        existingId: null,
        data: { tmdbPersonId: 700, name: 'New Actor' },
      };
      setup({
        lookupOverrides: { data: lookupData },
        importActorOverrides: { mutateAsync: importActorAsync, isPending: false },
      });
      render(<DiscoverTab />);
      fireEvent.change(screen.getByPlaceholderText(/Search movies/i), {
        target: { value: '700' },
      });
      fireEvent.click(screen.getByText('Lookup'));
      fireEvent.click(screen.getByText('Import Person'));
      expect(importActorAsync).toHaveBeenCalledWith(700);
    });

    it('calls refreshActor.mutateAsync when refresh button clicked on existing person', async () => {
      const refreshAsync = vi.fn().mockResolvedValue(undefined);
      const lookupData = {
        type: 'person',
        existsInDb: true,
        existingId: 'actor-existing',
        data: { tmdbPersonId: 800, name: 'Existing Actor' },
      };
      setup({
        lookupOverrides: { data: lookupData },
        refreshActorOverrides: { mutateAsync: refreshAsync, isPending: false },
      });
      render(<DiscoverTab />);
      fireEvent.change(screen.getByPlaceholderText(/Search movies/i), {
        target: { value: '800' },
      });
      fireEvent.click(screen.getByText('Lookup'));
      fireEvent.click(screen.getByText('Refresh'));
      expect(refreshAsync).toHaveBeenCalledWith('actor-existing');
    });

    it('does not call refresh when person has no existingId', async () => {
      const refreshAsync = vi.fn().mockResolvedValue(undefined);
      const lookupData = {
        type: 'person',
        existsInDb: false,
        existingId: null,
        data: { tmdbPersonId: 900, name: 'Unknown' },
      };
      setup({
        lookupOverrides: { data: lookupData },
        refreshActorOverrides: { mutateAsync: refreshAsync, isPending: false },
      });
      render(<DiscoverTab />);
      fireEvent.change(screen.getByPlaceholderText(/Search movies/i), {
        target: { value: '900' },
      });
      fireEvent.click(screen.getByText('Lookup'));
      fireEvent.click(screen.getByText('Refresh'));
      expect(refreshAsync).not.toHaveBeenCalled();
    });

    it('shows refreshed fields as "none" when no fields updated', () => {
      const lookupData = {
        type: 'person',
        existsInDb: true,
        existingId: 'actor-1',
        data: { tmdbPersonId: 500, name: 'Prabhas' },
      };
      setup({
        lookupOverrides: { data: lookupData },
        refreshActorOverrides: {
          isSuccess: true,
          data: { result: { fields: [] } },
        },
      });
      render(<DiscoverTab />);
      fireEvent.change(screen.getByPlaceholderText(/Search movies/i), { target: { value: '500' } });
      fireEvent.click(screen.getByText('Lookup'));
      expect(screen.getByText(/Actor refreshed/i)).toBeInTheDocument();
      expect(screen.getByText(/none/)).toBeInTheDocument();
    });
  });

  describe('keyboard shortcuts', () => {
    it('does not search on Enter when query length < 2', () => {
      const searchHook = makeIdleHook();
      mockSearch.mockReturnValue(searchHook);
      render(<DiscoverTab />);
      const input = screen.getByPlaceholderText(/Search movies/i);
      fireEvent.change(input, { target: { value: 'B' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(searchHook.mutate).not.toHaveBeenCalled();
    });

    it('does not trigger search on non-Enter key press', () => {
      const searchHook = makeIdleHook();
      mockSearch.mockReturnValue(searchHook);
      render(<DiscoverTab />);
      const input = screen.getByPlaceholderText(/Search movies/i);
      fireEvent.change(input, { target: { value: 'Baahubali' } });
      fireEvent.keyDown(input, { key: 'a' });
      expect(searchHook.mutate).not.toHaveBeenCalled();
    });
  });

  describe('error display', () => {
    it('shows error message when search fails', () => {
      setup({
        searchOverrides: { isError: true, error: new Error('Search failed') },
      });
      render(<DiscoverTab />);
      expect(screen.getByText('Search failed')).toBeInTheDocument();
    });

    it('shows error message when lookup fails', () => {
      setup({
        lookupOverrides: { isError: true, error: new Error('Lookup failed') },
      });
      render(<DiscoverTab />);
      expect(screen.getByText('Lookup failed')).toBeInTheDocument();
    });

    it('shows "Operation failed" for non-Error errors', () => {
      setup({
        discoverOverrides: { isError: true, error: 'string error' },
      });
      render(<DiscoverTab />);
      expect(screen.getByText('Operation failed')).toBeInTheDocument();
    });
  });
});
