import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockStaleMoviesData = vi.hoisted(() => ({
  current: undefined as
    | {
        items: { id: string; title?: string; name?: string; tmdb_last_synced_at?: string | null }[];
      }
    | undefined,
}));
const mockMissingBiosData = vi.hoisted(() => ({
  current: undefined as
    | {
        items: { id: string; title?: string; name?: string; tmdb_last_synced_at?: string | null }[];
      }
    | undefined,
}));
const mockStaleMoviesLoading = vi.hoisted(() => ({ current: false }));
const mockMissingBiosLoading = vi.hoisted(() => ({ current: false }));
const mockRefreshMovieMutateAsync = vi.hoisted(() => vi.fn());
const mockRefreshActorMutateAsync = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useSync', () => ({
  useStaleItems: (type: string) => {
    if (type === 'movies') {
      return {
        data: mockStaleMoviesData.current,
        isLoading: mockStaleMoviesLoading.current,
      };
    }
    return {
      data: mockMissingBiosData.current,
      isLoading: mockMissingBiosLoading.current,
    };
  },
  useRefreshMovie: () => ({
    mutateAsync: mockRefreshMovieMutateAsync,
    isPending: false,
  }),
  useRefreshActor: () => ({
    mutateAsync: mockRefreshActorMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    functions: { invoke: vi.fn() },
  },
}));

import { BulkTab } from '@/components/sync/BulkTab';

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderWithProvider(ui: React.ReactElement) {
  const qc = createQueryClient();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockStaleMoviesData.current = undefined;
  mockMissingBiosData.current = undefined;
  mockStaleMoviesLoading.current = false;
  mockMissingBiosLoading.current = false;
});

describe('BulkTab', () => {
  it('renders Stale Movies and Missing Actor Bios sections', () => {
    renderWithProvider(<BulkTab />);
    expect(screen.getByText('Stale Movies')).toBeInTheDocument();
    expect(screen.getByText('Missing Actor Bios')).toBeInTheDocument();
  });

  it('renders stale days select with default 30 days', () => {
    renderWithProvider(<BulkTab />);
    expect(screen.getByText('not synced in')).toBeInTheDocument();
    const select = screen.getByDisplayValue('30 days');
    expect(select).toBeInTheDocument();
  });

  it('renders all stale days options', () => {
    renderWithProvider(<BulkTab />);
    expect(screen.getByText('7 days')).toBeInTheDocument();
    expect(screen.getByText('14 days')).toBeInTheDocument();
    expect(screen.getByText('30 days')).toBeInTheDocument();
    expect(screen.getByText('60 days')).toBeInTheDocument();
    expect(screen.getByText('90 days')).toBeInTheDocument();
  });

  it('shows loading state for stale movies', () => {
    mockStaleMoviesLoading.current = true;
    renderWithProvider(<BulkTab />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows loading state for missing bios', () => {
    mockMissingBiosLoading.current = true;
    renderWithProvider(<BulkTab />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows stale movie count when data is loaded', () => {
    mockStaleMoviesData.current = {
      items: [
        { id: 'm1', title: 'Old Movie 1', tmdb_last_synced_at: '2023-01-01T00:00:00Z' },
        { id: 'm2', title: 'Old Movie 2', tmdb_last_synced_at: null },
      ],
    };
    renderWithProvider(<BulkTab />);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Stale Movies')).toBeInTheDocument();
  });

  it('shows missing bios count when data is loaded', () => {
    mockMissingBiosData.current = {
      items: [
        { id: 'a1', name: 'Actor Without Bio' },
        { id: 'a2', name: 'Another Actor' },
        { id: 'a3', name: 'Third Actor' },
      ],
    };
    renderWithProvider(<BulkTab />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/actors with TMDB ID but no biography/)).toBeInTheDocument();
  });

  it('shows Preview button for stale movies when there are items', () => {
    mockStaleMoviesData.current = {
      items: [{ id: 'm1', title: 'Movie', tmdb_last_synced_at: null }],
    };
    renderWithProvider(<BulkTab />);
    const previewButtons = screen.getAllByText('Preview');
    expect(previewButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows Refresh All button for stale movies', () => {
    mockStaleMoviesData.current = {
      items: [{ id: 'm1', title: 'Movie', tmdb_last_synced_at: null }],
    };
    renderWithProvider(<BulkTab />);
    expect(screen.getByText('Refresh All')).toBeInTheDocument();
  });

  it('shows Fetch All Bios button for missing bios', () => {
    mockMissingBiosData.current = {
      items: [{ id: 'a1', name: 'Actor' }],
    };
    renderWithProvider(<BulkTab />);
    expect(screen.getByText('Fetch All Bios')).toBeInTheDocument();
  });

  it('toggles stale movie list visibility when Preview/Hide is clicked', () => {
    mockStaleMoviesData.current = {
      items: [{ id: 'm1', title: 'Stale Movie A', tmdb_last_synced_at: '2023-06-01T00:00:00Z' }],
    };
    renderWithProvider(<BulkTab />);
    // Initially movie list is hidden
    expect(screen.queryByText('Stale Movie A')).not.toBeInTheDocument();
    // Click Preview to show
    const previewButtons = screen.getAllByText('Preview');
    fireEvent.click(previewButtons[0]);
    expect(screen.getByText('Stale Movie A')).toBeInTheDocument();
    // Click Hide to hide
    fireEvent.click(screen.getByText('Hide'));
  });

  it('toggles missing bios list visibility when Preview/Hide is clicked', () => {
    mockMissingBiosData.current = {
      items: [{ id: 'a1', name: 'Bio-less Actor' }],
    };
    renderWithProvider(<BulkTab />);
    expect(screen.queryByText('Bio-less Actor')).not.toBeInTheDocument();
    const previewButtons = screen.getAllByText('Preview');
    // Click the last Preview (missing bios section)
    fireEvent.click(previewButtons[previewButtons.length - 1]);
    expect(screen.getByText('Bio-less Actor')).toBeInTheDocument();
  });

  it('disables Preview when stale movies list is empty', () => {
    mockStaleMoviesData.current = { items: [] };
    renderWithProvider(<BulkTab />);
    const previewButtons = screen.getAllByText('Preview');
    expect(previewButtons[0]).toBeDisabled();
  });

  it('disables Refresh All when stale movies list is empty', () => {
    mockStaleMoviesData.current = { items: [] };
    renderWithProvider(<BulkTab />);
    expect(screen.getByText('Refresh All')).toBeDisabled();
  });

  it('disables Fetch All Bios when missing bios list is empty', () => {
    mockMissingBiosData.current = { items: [] };
    renderWithProvider(<BulkTab />);
    expect(screen.getByText('Fetch All Bios')).toBeDisabled();
  });

  it('shows 0 movies when stale movies data has empty items', () => {
    mockStaleMoviesData.current = { items: [] };
    mockMissingBiosData.current = { items: [] };
    renderWithProvider(<BulkTab />);
    const zeroElements = screen.getAllByText('0');
    expect(zeroElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows stale movie items with "Never" when tmdb_last_synced_at is null', () => {
    mockStaleMoviesData.current = {
      items: [{ id: 'm1', title: 'Never Synced', tmdb_last_synced_at: null }],
    };
    renderWithProvider(<BulkTab />);
    const previewButtons = screen.getAllByText('Preview');
    fireEvent.click(previewButtons[0]);
    expect(screen.getByText('Never Synced')).toBeInTheDocument();
    expect(screen.getByText('Never')).toBeInTheDocument();
  });

  it('changes stale days when select is changed', () => {
    renderWithProvider(<BulkTab />);
    const select = screen.getByDisplayValue('30 days');
    fireEvent.change(select, { target: { value: '7' } });
    expect(screen.getByDisplayValue('7 days')).toBeInTheDocument();
  });
});
