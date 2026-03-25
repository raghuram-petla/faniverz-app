/**
 * Tests for ValidationsPage — image validation scanning and fixing.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ValidationsPage from '@/app/(dashboard)/validations/page';

const mockGetSession = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
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

const mockStartScan = vi.fn();
const mockFixSelected = vi.fn();
const mockToggleItem = vi.fn();
const mockSelectAllIssues = vi.fn();
const mockDeselectAll = vi.fn();
const mockSetActiveFilter = vi.fn();

let mockScanProgress: { isScanning: boolean; entity: string | null } = {
  isScanning: false,
  entity: null,
};

vi.mock('@/hooks/useValidations', () => ({
  useValidations: () => ({
    summary: mockSummary,
    isSummaryLoading: false,
    scanResults: mockScanResults,
    allScanResults: mockScanResults,
    scanProgress: mockScanProgress,
    fixProgress: null,
    selectedItems: new Set(),
    activeFilter: 'all',
    setActiveFilter: mockSetActiveFilter,
    startScan: mockStartScan,
    fixSelected: mockFixSelected,
    toggleItem: mockToggleItem,
    selectAllIssues: mockSelectAllIssues,
    deselectAll: mockDeselectAll,
  }),
  hasIssue: (item: { status: string }) => item.status === 'issue',
}));

vi.mock('@/components/validations/ValidationsSummary', () => ({
  ValidationsSummary: ({
    isLoading,
    isScanning,
    activeScanEntity,
    onScan,
    onDeepScan,
    onScanAll,
  }: {
    isLoading: boolean;
    isScanning: boolean;
    activeScanEntity: string | null;
    onScan: (entity: string) => void;
    onDeepScan: (entity: string) => void;
    onScanAll: () => void;
  }) => (
    <div data-testid="validations-summary">
      {isLoading ? 'Loading...' : 'Summary loaded'}
      {isScanning && <span data-testid="scanning-indicator">Scanning {activeScanEntity}</span>}
      <button onClick={() => onScan('movies')} data-testid="scan-movies">
        Scan Movies
      </button>
      <button onClick={() => onDeepScan('actors')} data-testid="deep-scan-actors">
        Deep Scan Actors
      </button>
      <button onClick={onScanAll} data-testid="scan-all">
        Scan All
      </button>
    </div>
  ),
}));

vi.mock('@/components/validations/ValidationsScanPanel', () => ({
  ValidationsScanPanel: ({
    results,
    isReadOnly,
    onFix,
    onFixSingle,
    onToggle,
    onSelectAllIssues,
    onDeselectAll,
  }: {
    results: Array<{
      id: string;
      status: string;
      entity: string;
      field: string;
      currentUrl: string;
      urlType: string;
      tmdbId?: number;
    }>;
    isReadOnly: boolean;
    onFix: () => void;
    onFixSingle: (item: unknown) => void;
    onToggle: (id: string) => void;
    onSelectAllIssues: () => void;
    onDeselectAll: () => void;
  }) => (
    <div data-testid="scan-panel">
      {results.length} results
      {isReadOnly && ' (read-only)'}
      <button onClick={onFix} data-testid="fix-selected">
        Fix Selected
      </button>
      <button onClick={() => onFixSingle(results[0])} data-testid="fix-single">
        Fix Single
      </button>
      <button onClick={() => onToggle('result-1')} data-testid="toggle-item">
        Toggle
      </button>
      <button onClick={onSelectAllIssues} data-testid="select-all">
        Select All
      </button>
      <button onClick={onDeselectAll} data-testid="deselect-all">
        Deselect All
      </button>
    </div>
  ),
}));

const mockFetch = vi.fn();

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ValidationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsReadOnly = false;
    mockScanProgress = { isScanning: false, entity: null };
    global.fetch = mockFetch;
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok-123' } },
      error: null,
    });
  });

  describe('rendering', () => {
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

    it('shows scanning indicator when scanning', () => {
      mockScanProgress = { isScanning: true, entity: 'movies' };
      renderWithProviders(<ValidationsPage />);
      expect(screen.getByTestId('scanning-indicator')).toBeInTheDocument();
    });
  });

  describe('handleScanAll', () => {
    it('calls startScan for each entity type', async () => {
      mockStartScan.mockResolvedValue(undefined);
      renderWithProviders(<ValidationsPage />);
      fireEvent.click(screen.getByTestId('scan-all'));

      await waitFor(() => {
        expect(mockStartScan).toHaveBeenCalledWith('movies');
        expect(mockStartScan).toHaveBeenCalledWith('movie_images');
        expect(mockStartScan).toHaveBeenCalledWith('actors');
        expect(mockStartScan).toHaveBeenCalledWith('platforms');
        expect(mockStartScan).toHaveBeenCalledWith('production_houses');
        expect(mockStartScan).toHaveBeenCalledWith('profiles');
      });
    });

    it('calls startScan 6 times total', async () => {
      mockStartScan.mockResolvedValue(undefined);
      renderWithProviders(<ValidationsPage />);
      fireEvent.click(screen.getByTestId('scan-all'));

      await waitFor(() => {
        expect(mockStartScan).toHaveBeenCalledTimes(6);
      });
    });
  });

  describe('handleDeepScan', () => {
    it('calls startScan with deep=true for given entity', async () => {
      mockStartScan.mockResolvedValue(undefined);
      renderWithProviders(<ValidationsPage />);
      fireEvent.click(screen.getByTestId('deep-scan-actors'));

      await waitFor(() => {
        expect(mockStartScan).toHaveBeenCalledWith('actors', true);
      });
    });
  });

  describe('handleFixSingle', () => {
    it('calls fetch with fix API when session exists', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      renderWithProviders(<ValidationsPage />);
      fireEvent.click(screen.getByTestId('fix-single'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/validations/fix',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              Authorization: 'Bearer tok-123',
            }),
          }),
        );
      });
    });

    it('sends correct fix payload for external URL type', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      renderWithProviders(<ValidationsPage />);
      fireEvent.click(screen.getByTestId('fix-single'));

      await waitFor(() => {
        const callArgs = mockFetch.mock.calls[0];
        const body = JSON.parse(callArgs[1].body);
        expect(body.items[0].fixType).toBe('migrate_external');
        expect(body.items[0].id).toBe('result-1');
        expect(body.items[0].entity).toBe('movies');
        expect(body.items[0].tmdbId).toBe(123);
      });
    });

    it('sends correct body structure to fix API', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      renderWithProviders(<ValidationsPage />);
      fireEvent.click(screen.getByTestId('fix-single'));

      await waitFor(() => {
        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body).toHaveProperty('items');
        expect(body.items).toHaveLength(1);
        expect(body.items[0]).toMatchObject({
          id: 'result-1',
          entity: 'movies',
          field: 'poster_url',
          fixType: 'migrate_external',
        });
      });
    });

    it('re-scans entity after successful fix when scanProgress has entity', async () => {
      mockScanProgress = { isScanning: false, entity: 'movies' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
      mockStartScan.mockResolvedValue(undefined);

      renderWithProviders(<ValidationsPage />);
      fireEvent.click(screen.getByTestId('fix-single'));

      await waitFor(() => {
        expect(mockStartScan).toHaveBeenCalledWith('movies');
      });
    });
  });

  describe('handleFixSingle — no-op for non-issue items', () => {
    it('does nothing when item has no issue (status is ok)', async () => {
      // Replace scan results with a non-issue item
      const originalResults = [...mockScanResults];
      mockScanResults.length = 0;
      mockScanResults.push({
        id: 'result-ok',
        entity: 'movies',
        field: 'poster_url',
        currentUrl: 'https://r2.example.com/poster.jpg',
        urlType: 'r2',
        status: 'ok',
        tmdbId: 123,
      });

      renderWithProviders(<ValidationsPage />);
      fireEvent.click(screen.getByTestId('fix-single'));

      // hasIssue returns false for status='ok', so fetch should NOT be called
      await waitFor(() => {
        expect(mockFetch).not.toHaveBeenCalled();
      });

      // Restore
      mockScanResults.length = 0;
      mockScanResults.push(...originalResults);
    });
  });

  describe('handleFixSingle — error cases', () => {
    it('logs error when session is expired', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      renderWithProviders(<ValidationsPage />);
      fireEvent.click(screen.getByTestId('fix-single'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('[ValidationsPage] fix failed:', expect.any(Error));
      });
      consoleSpy.mockRestore();
    });

    it('logs error when fix API returns non-ok response', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      renderWithProviders(<ValidationsPage />);
      fireEvent.click(screen.getByTestId('fix-single'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('[ValidationsPage] fix failed:', expect.any(Error));
      });
      consoleSpy.mockRestore();
    });

    it('handles json parse failure on error response gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      renderWithProviders(<ValidationsPage />);
      fireEvent.click(screen.getByTestId('fix-single'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('[ValidationsPage] fix failed:', expect.any(Error));
      });
      consoleSpy.mockRestore();
    });

    it('uses regenerate_variants fixType for non-external URLs', async () => {
      // Override scan results with non-external item
      const { useValidations: _useValidations } = await import('@/hooks/useValidations');
      const originalMockResults = [...mockScanResults];
      mockScanResults.length = 0;
      mockScanResults.push({
        id: 'result-2',
        entity: 'actors',
        field: 'photo_url',
        currentUrl: 'https://r2.faniverz.dev/actors/photo.jpg',
        urlType: 'r2',
        status: 'issue',
        tmdbId: undefined as unknown as number,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      renderWithProviders(<ValidationsPage />);
      fireEvent.click(screen.getByTestId('fix-single'));

      await waitFor(() => {
        const callArgs = mockFetch.mock.calls[0];
        const body = JSON.parse(callArgs[1].body);
        expect(body.items[0].fixType).toBe('regenerate_variants');
      });

      // Restore
      mockScanResults.length = 0;
      mockScanResults.push(...originalMockResults);
    });
  });

  describe('passthrough handlers', () => {
    it('calls fixSelected when Fix Selected is clicked', () => {
      renderWithProviders(<ValidationsPage />);
      fireEvent.click(screen.getByTestId('fix-selected'));
      expect(mockFixSelected).toHaveBeenCalled();
    });

    it('calls toggleItem when toggle button clicked', () => {
      renderWithProviders(<ValidationsPage />);
      fireEvent.click(screen.getByTestId('toggle-item'));
      expect(mockToggleItem).toHaveBeenCalledWith('result-1');
    });

    it('calls selectAllIssues when Select All clicked', () => {
      renderWithProviders(<ValidationsPage />);
      fireEvent.click(screen.getByTestId('select-all'));
      expect(mockSelectAllIssues).toHaveBeenCalled();
    });

    it('calls deselectAll when Deselect All clicked', () => {
      renderWithProviders(<ValidationsPage />);
      fireEvent.click(screen.getByTestId('deselect-all'));
      expect(mockDeselectAll).toHaveBeenCalled();
    });
  });
});
