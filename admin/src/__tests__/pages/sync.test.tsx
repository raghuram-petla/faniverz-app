import { render, screen, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/hooks/useSync', () => ({
  useTmdbSearch: () => ({
    mutate: vi.fn(),
    data: undefined,
    isPending: false,
    isError: false,
    error: null,
  }),
  useDiscoverMovies: () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    data: undefined,
    isPending: false,
    isError: false,
    error: null,
  }),
  useTmdbLookup: () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
    data: undefined,
  }),
  useImportMovies: () => ({ mutateAsync: vi.fn(), isPending: false, isSuccess: false }),
  useImportActor: () => ({ mutateAsync: vi.fn(), isPending: false, isSuccess: false, data: null }),
  useRefreshActor: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isSuccess: false,
    data: null,
  }),
  useFillFields: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRefreshMovie: () => ({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    data: null,
  }),
  useStaleItems: () => ({ data: undefined, isPending: false, isError: false, refetch: vi.fn() }),
}));

vi.mock('@/hooks/useBulkFillMissing', () => ({
  useBulkFillMissing: () => ({
    run: vi.fn(),
    reset: vi.fn(),
    state: { total: 0, done: 0, failed: 0, isRunning: false, error: null },
  }),
}));

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      ilike: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    functions: { invoke: vi.fn() },
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/sync',
  useParams: () => ({}),
}));

vi.mock('@/hooks/useDebouncedSearch', () => ({
  useDebouncedSearch: () => ({ search: '', setSearch: vi.fn(), debouncedSearch: '' }),
}));

// Mock fetch for sync API calls
vi.stubGlobal(
  'fetch',
  vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ results: [], existingMovies: [], items: [] }),
  }),
);

/* eslint-disable @typescript-eslint/no-explicit-any */
const capturedDiscoverProps: Record<string, any> = {};
vi.mock('@/components/sync/DiscoverTab', () => ({
  DiscoverTab: (props: any) => {
    capturedDiscoverProps.current = props;
    return (
      <div data-testid="discover-tab">
        <input placeholder="Search movies, actors, or TMDB ID..." />
        <button>Discover</button>
        <span>All months</span>
      </div>
    );
  },
}));

vi.mock('@/components/sync/BulkTab', () => ({
  BulkTab: () => (
    <div data-testid="bulk-tab">
      <span>Stale Movies</span>
      <span>Missing Actor Bios</span>
    </div>
  ),
}));

vi.mock('@/components/sync/HistoryTab', () => ({
  HistoryTab: () => (
    <div data-testid="history-tab">
      <select role="combobox">
        <option>All</option>
      </select>
      <select role="combobox">
        <option>All</option>
      </select>
    </div>
  ),
}));

import SyncPage from '@/app/(dashboard)/sync/page';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SyncPage', () => {
  it('renders all three tab buttons', () => {
    renderWithProviders(<SyncPage />);
    // "Discover" appears in both the tab button and the DiscoverTab's Discover button
    const discoverButtons = screen.getAllByText('Discover');
    expect(discoverButtons.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Bulk')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  it('defaults to Discover tab active with search input', () => {
    renderWithProviders(<SyncPage />);
    expect(screen.getByPlaceholderText('Search movies, actors, or TMDB ID...')).toBeInTheDocument();
  });

  it('renders search input and discover controls in Discover tab', () => {
    renderWithProviders(<SyncPage />);
    expect(screen.getByPlaceholderText('Search movies, actors, or TMDB ID...')).toBeInTheDocument();
    const discoverButtons = screen.getAllByText('Discover');
    expect(discoverButtons.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('All months')).toBeInTheDocument();
  });

  it('switches to Bulk tab on click', () => {
    renderWithProviders(<SyncPage />);
    fireEvent.click(screen.getByText('Bulk'));
    expect(screen.getByText('Stale Movies')).toBeInTheDocument();
    expect(screen.getByText('Missing Actor Bios')).toBeInTheDocument();
  });

  it('switches to History tab on click', () => {
    renderWithProviders(<SyncPage />);
    fireEvent.click(screen.getByText('History'));
    // History tab has filter selects and a table
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(2); // status + function filters
  });

  it('can switch back from Bulk to Discover', () => {
    renderWithProviders(<SyncPage />);
    fireEvent.click(screen.getByText('Bulk'));
    expect(screen.getByText('Stale Movies')).toBeInTheDocument();
    // Click first "Discover" button (tab)
    const discoverButtons = screen.getAllByText('Discover');
    fireEvent.click(discoverButtons[0]);
    expect(screen.getByPlaceholderText('Search movies, actors, or TMDB ID...')).toBeInTheDocument();
  });

  it('shows confirm dialog when switching tabs during import', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderWithProviders(<SyncPage />);

    // Set isImporting to true via DiscoverTab callback
    act(() => capturedDiscoverProps.current.onImportingChange(true));

    // Try to switch to Bulk - should be blocked
    fireEvent.click(screen.getByText('Bulk'));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('still being imported'));
    // Still on Discover tab
    expect(screen.getByTestId('discover-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('bulk-tab')).not.toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it('allows tab switch when confirm returns true during import', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithProviders(<SyncPage />);

    act(() => capturedDiscoverProps.current.onImportingChange(true));

    fireEvent.click(screen.getByText('Bulk'));
    expect(screen.getByTestId('bulk-tab')).toBeInTheDocument();

    vi.restoreAllMocks();
  });
});
