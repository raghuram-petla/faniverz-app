import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

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

// Mock fetch for sync API calls
vi.stubGlobal(
  'fetch',
  vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ results: [], existingMovies: [], items: [] }),
  }),
);

import SyncPage from '@/app/(dashboard)/sync/page';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SyncPage', () => {
  it('renders all five tab buttons', () => {
    renderWithProviders(<SyncPage />);
    // Use getAllByText for "Discover" since it appears in tab + Discover button
    const discoverButtons = screen.getAllByText('Discover');
    expect(discoverButtons.length).toBeGreaterThanOrEqual(1);
    // Tab buttons specifically inside the tab bar
    expect(screen.getByText('Import')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
    expect(screen.getByText('Bulk')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  it('defaults to Discover tab active', () => {
    renderWithProviders(<SyncPage />);
    expect(screen.getByText('Discover Movies')).toBeInTheDocument();
  });

  it('switches to Import tab on click', () => {
    renderWithProviders(<SyncPage />);
    fireEvent.click(screen.getByText('Import'));
    expect(screen.getByText('Import by TMDB ID')).toBeInTheDocument();
  });

  it('switches to Refresh tab on click', () => {
    renderWithProviders(<SyncPage />);
    fireEvent.click(screen.getByText('Refresh'));
    expect(screen.getByText('Refresh Movie')).toBeInTheDocument();
    expect(screen.getByText('Refresh Actor')).toBeInTheDocument();
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

  it('renders Discover tab with year and month selectors', () => {
    renderWithProviders(<SyncPage />);
    expect(screen.getByText('Year')).toBeInTheDocument();
    expect(screen.getByText('Month')).toBeInTheDocument();
  });

  it('renders Import tab with type label and TMDB ID input', () => {
    renderWithProviders(<SyncPage />);
    fireEvent.click(screen.getByText('Import'));

    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. 823464')).toBeInTheDocument();
  });

  it('renders Refresh tab with movie and actor search inputs', () => {
    renderWithProviders(<SyncPage />);
    fireEvent.click(screen.getByText('Refresh'));

    expect(screen.getByPlaceholderText('Search movie by title...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search actor by name...')).toBeInTheDocument();
  });
});
