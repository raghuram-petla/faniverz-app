/**
 * Tests for ValidationsPage — image validation scanning and fixing.
 */

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ValidationsPage from '@/app/(dashboard)/validations/page';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'token-123' } },
        error: null,
      }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(),
    },
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/validations',
  useParams: () => ({}),
}));

let mockIsReadOnly = false;

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    role: 'super_admin',
    isSuperAdmin: true,
    isReadOnly: mockIsReadOnly,
    canViewPage: () => true,
  }),
}));

const mockSummary = {
  movies: { total: 100, issues: 5 },
  actors: { total: 200, issues: 10 },
  profiles: { total: 50, issues: 0 },
};

const mockScanResults = [
  {
    id: 'result-1',
    entity: 'movies',
    field: 'poster_url',
    currentUrl: 'https://tmdb.org/old.jpg',
    urlType: 'external',
    status: 'issue',
    tmdbId: 123,
  },
];

vi.mock('@/hooks/useValidations', () => ({
  useValidations: () => ({
    summary: mockSummary,
    isSummaryLoading: false,
    scanResults: mockScanResults,
    allScanResults: mockScanResults,
    scanProgress: { isScanning: false, entity: null },
    fixProgress: null,
    selectedItems: new Set(),
    activeFilter: 'all',
    setActiveFilter: vi.fn(),
    startScan: vi.fn(),
    fixSelected: vi.fn(),
    toggleItem: vi.fn(),
    selectAllIssues: vi.fn(),
    deselectAll: vi.fn(),
  }),
  hasIssue: (item: { status: string }) => item.status === 'issue',
}));

vi.mock('@/components/validations/ValidationsSummary', () => ({
  ValidationsSummary: ({ isLoading, isScanning }: { isLoading: boolean; isScanning: boolean }) => (
    <div data-testid="validations-summary">
      {isLoading ? 'Loading...' : 'Summary loaded'}
      {isScanning && 'Scanning...'}
    </div>
  ),
}));

vi.mock('@/components/validations/ValidationsScanPanel', () => ({
  ValidationsScanPanel: ({
    results,
    isReadOnly,
  }: {
    results: Array<{ id: string }>;
    isReadOnly: boolean;
  }) => (
    <div data-testid="scan-panel">
      {results.length} results
      {isReadOnly && ' (read-only)'}
    </div>
  ),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ValidationsPage', () => {
  beforeEach(() => {
    mockIsReadOnly = false;
  });

  it('renders page title', () => {
    renderWithProviders(<ValidationsPage />);
    expect(screen.getByText('Image Validations')).toBeInTheDocument();
  });

  it('renders validations summary component', () => {
    renderWithProviders(<ValidationsPage />);
    expect(screen.getByTestId('validations-summary')).toBeInTheDocument();
    expect(screen.getByText('Summary loaded')).toBeInTheDocument();
  });

  it('renders scan panel component', () => {
    renderWithProviders(<ValidationsPage />);
    expect(screen.getByTestId('scan-panel')).toBeInTheDocument();
    expect(screen.getByText('1 results')).toBeInTheDocument();
  });

  it('passes isReadOnly to scan panel', () => {
    mockIsReadOnly = true;
    renderWithProviders(<ValidationsPage />);
    expect(screen.getByText(/read-only/)).toBeInTheDocument();
  });
});
