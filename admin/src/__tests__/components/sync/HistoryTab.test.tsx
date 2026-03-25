import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockLogsData = vi.hoisted(() => ({
  current: undefined as
    | Array<{
        id: string;
        function_name: string;
        status: 'running' | 'success' | 'failed';
        movies_added: number;
        movies_updated: number;
        errors: Record<string, unknown> | unknown[] | null;
        details: string[] | null;
        started_at: string;
        completed_at: string | null;
      }>
    | undefined,
}));
const mockIsLoading = vi.hoisted(() => ({ current: false }));

vi.mock('@/hooks/useAdminSync', () => ({
  useAdminSyncLogs: () => ({
    data: mockLogsData.current,
    isLoading: mockIsLoading.current,
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

import { HistoryTab } from '@/components/sync/HistoryTab';

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderWithProvider(ui: React.ReactElement) {
  const qc = createQueryClient();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

/** Get the table body rows (skipping thead). */
function getTableRows() {
  const table = screen.getByRole('table');
  const tbody = table.querySelector('tbody')!;
  return within(tbody).getAllByRole('row');
}

beforeEach(() => {
  vi.clearAllMocks();
  mockLogsData.current = undefined;
  mockIsLoading.current = false;
});

describe('HistoryTab', () => {
  it('shows loading spinner when data is loading', () => {
    mockIsLoading.current = true;
    const { container } = renderWithProvider(<HistoryTab />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows "No sync logs found" when data is empty', () => {
    mockLogsData.current = [];
    renderWithProvider(<HistoryTab />);
    expect(screen.getByText('No sync logs found.')).toBeInTheDocument();
  });

  it('renders filter dropdowns for status and function', () => {
    mockLogsData.current = [];
    renderWithProvider(<HistoryTab />);
    expect(screen.getByText('All Statuses')).toBeInTheDocument();
    expect(screen.getByText('All Functions')).toBeInTheDocument();
  });

  it('renders status filter options', () => {
    mockLogsData.current = [];
    renderWithProvider(<HistoryTab />);
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('renders table headers when logs are present', () => {
    mockLogsData.current = [
      {
        id: 'log-1',
        function_name: 'sync-discover',
        status: 'success',
        movies_added: 5,
        movies_updated: 3,
        errors: null,
        details: null,
        started_at: '2024-01-15T10:00:00Z',
        completed_at: '2024-01-15T10:01:30Z',
      },
    ];
    renderWithProvider(<HistoryTab />);
    expect(screen.getByText('Function')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Added')).toBeInTheDocument();
    expect(screen.getByText('Updated')).toBeInTheDocument();
    expect(screen.getByText('Started')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
  });

  it('renders log rows with function name, status, added, updated counts', () => {
    mockLogsData.current = [
      {
        id: 'log-1',
        function_name: 'unique-fn-xyz',
        status: 'success',
        movies_added: 12,
        movies_updated: 7,
        errors: null,
        details: null,
        started_at: '2024-01-15T10:00:00Z',
        completed_at: '2024-01-15T10:01:30Z',
      },
    ];
    renderWithProvider(<HistoryTab />);
    const rows = getTableRows();
    expect(rows.length).toBe(1);
    const row = rows[0];
    expect(within(row).getByText('unique-fn-xyz')).toBeInTheDocument();
    expect(within(row).getByText('success')).toBeInTheDocument();
    expect(within(row).getByText('12')).toBeInTheDocument();
    expect(within(row).getByText('7')).toBeInTheDocument();
  });

  it('shows duration for completed logs', () => {
    mockLogsData.current = [
      {
        id: 'log-1',
        function_name: 'sync-import',
        status: 'success',
        movies_added: 0,
        movies_updated: 0,
        errors: null,
        details: null,
        started_at: '2024-01-15T10:00:00Z',
        completed_at: '2024-01-15T10:02:15Z',
      },
    ];
    renderWithProvider(<HistoryTab />);
    expect(screen.getByText('2m 15s')).toBeInTheDocument();
  });

  it('shows "In progress..." for running logs without completed_at', () => {
    mockLogsData.current = [
      {
        id: 'log-1',
        function_name: 'sync-running',
        status: 'running',
        movies_added: 0,
        movies_updated: 0,
        errors: null,
        details: null,
        started_at: '2024-01-15T10:00:00Z',
        completed_at: null,
      },
    ];
    renderWithProvider(<HistoryTab />);
    expect(screen.getByText('In progress...')).toBeInTheDocument();
  });

  it('shows auto-refreshing indicator when a log has running status', () => {
    mockLogsData.current = [
      {
        id: 'log-1',
        function_name: 'sync-running',
        status: 'running',
        movies_added: 0,
        movies_updated: 0,
        errors: null,
        details: null,
        started_at: '2024-01-15T10:00:00Z',
        completed_at: null,
      },
    ];
    renderWithProvider(<HistoryTab />);
    expect(screen.getByText('Auto-refreshing')).toBeInTheDocument();
  });

  it('does not show auto-refreshing when no logs are running', () => {
    mockLogsData.current = [
      {
        id: 'log-1',
        function_name: 'sync-complete',
        status: 'success',
        movies_added: 5,
        movies_updated: 0,
        errors: null,
        details: null,
        started_at: '2024-01-15T10:00:00Z',
        completed_at: '2024-01-15T10:01:00Z',
      },
    ];
    renderWithProvider(<HistoryTab />);
    expect(screen.queryByText('Auto-refreshing')).not.toBeInTheDocument();
  });

  it('filters logs by status', () => {
    mockLogsData.current = [
      {
        id: 'log-1',
        function_name: 'fn-alpha',
        status: 'success',
        movies_added: 5,
        movies_updated: 0,
        errors: null,
        details: null,
        started_at: '2024-01-15T10:00:00Z',
        completed_at: '2024-01-15T10:01:00Z',
      },
      {
        id: 'log-2',
        function_name: 'fn-beta',
        status: 'failed',
        movies_added: 0,
        movies_updated: 0,
        errors: { message: 'API error' },
        details: null,
        started_at: '2024-01-15T11:00:00Z',
        completed_at: '2024-01-15T11:00:05Z',
      },
    ];
    renderWithProvider(<HistoryTab />);
    // Both visible initially
    let rows = getTableRows();
    expect(rows.length).toBe(2);

    // Filter by 'failed'
    const statusSelect = screen.getByDisplayValue('All Statuses');
    fireEvent.change(statusSelect, { target: { value: 'failed' } });
    rows = getTableRows();
    expect(rows.length).toBe(1);
    expect(within(rows[0]).getByText('fn-beta')).toBeInTheDocument();
  });

  it('filters logs by function name', () => {
    mockLogsData.current = [
      {
        id: 'log-1',
        function_name: 'fn-discover',
        status: 'success',
        movies_added: 5,
        movies_updated: 0,
        errors: null,
        details: null,
        started_at: '2024-01-15T10:00:00Z',
        completed_at: '2024-01-15T10:01:00Z',
      },
      {
        id: 'log-2',
        function_name: 'fn-import',
        status: 'success',
        movies_added: 3,
        movies_updated: 0,
        errors: null,
        details: null,
        started_at: '2024-01-15T11:00:00Z',
        completed_at: '2024-01-15T11:00:30Z',
      },
    ];
    renderWithProvider(<HistoryTab />);

    // Both visible initially
    let rows = getTableRows();
    expect(rows.length).toBe(2);

    // Filter by function name
    const fnSelect = screen.getByDisplayValue('All Functions');
    fireEvent.change(fnSelect, { target: { value: 'fn-discover' } });
    rows = getTableRows();
    expect(rows.length).toBe(1);
    expect(within(rows[0]).getByText('fn-discover')).toBeInTheDocument();
  });

  it('expands error details when clicking a row with errors', () => {
    mockLogsData.current = [
      {
        id: 'log-1',
        function_name: 'sync-errors',
        status: 'failed',
        movies_added: 0,
        movies_updated: 0,
        errors: { message: 'Rate limit exceeded' },
        details: null,
        started_at: '2024-01-15T10:00:00Z',
        completed_at: '2024-01-15T10:00:05Z',
      },
    ];
    renderWithProvider(<HistoryTab />);
    expect(screen.queryByText('Error Details')).not.toBeInTheDocument();
    // Click the table row (use the row directly)
    const rows = getTableRows();
    fireEvent.click(rows[0]);
    expect(screen.getByText('Error Details')).toBeInTheDocument();
    expect(screen.getByText(/"message": "Rate limit exceeded"/)).toBeInTheDocument();
  });

  it('collapses error details when clicking an expanded row again', () => {
    mockLogsData.current = [
      {
        id: 'log-1',
        function_name: 'sync-toggle',
        status: 'failed',
        movies_added: 0,
        movies_updated: 0,
        errors: { error: 'something went wrong' },
        details: null,
        started_at: '2024-01-15T10:00:00Z',
        completed_at: '2024-01-15T10:00:05Z',
      },
    ];
    renderWithProvider(<HistoryTab />);
    // Expand
    const rows = getTableRows();
    fireEvent.click(rows[0]);
    expect(screen.getByText('Error Details')).toBeInTheDocument();
    // Collapse -- click the same row again (first row in tbody)
    const allRows = getTableRows();
    fireEvent.click(allRows[0]);
    expect(screen.queryByText('Error Details')).not.toBeInTheDocument();
  });

  it('does not expand row when log has no errors and no details', () => {
    mockLogsData.current = [
      {
        id: 'log-1',
        function_name: 'no-error-fn',
        status: 'success',
        movies_added: 1,
        movies_updated: 0,
        errors: null,
        details: null,
        started_at: '2024-01-15T10:00:00Z',
        completed_at: '2024-01-15T10:01:00Z',
      },
    ];
    renderWithProvider(<HistoryTab />);
    const rows = getTableRows();
    fireEvent.click(rows[0]);
    expect(screen.queryByText('Error Details')).not.toBeInTheDocument();
    expect(screen.queryByText('Items Processed')).not.toBeInTheDocument();
  });

  it('expands to show details when clicking a row with details', () => {
    mockLogsData.current = [
      {
        id: 'log-1',
        function_name: 'import-movies',
        status: 'success',
        movies_added: 2,
        movies_updated: 0,
        errors: null,
        details: ['Pushpa 2', 'Devara'],
        started_at: '2024-01-15T10:00:00Z',
        completed_at: '2024-01-15T10:01:30Z',
      },
    ];
    renderWithProvider(<HistoryTab />);
    expect(screen.queryByText('Items Processed')).not.toBeInTheDocument();
    const rows = getTableRows();
    fireEvent.click(rows[0]);
    expect(screen.getByText('Items Processed')).toBeInTheDocument();
    expect(screen.getByText('Pushpa 2')).toBeInTheDocument();
    expect(screen.getByText('Devara')).toBeInTheDocument();
  });

  it('shows both details and errors when both are present', () => {
    mockLogsData.current = [
      {
        id: 'log-1',
        function_name: 'import-movies',
        status: 'success',
        movies_added: 1,
        movies_updated: 0,
        errors: [{ tmdbId: 999, message: 'Not found' }],
        details: ['Kalki 2898 AD'],
        started_at: '2024-01-15T10:00:00Z',
        completed_at: '2024-01-15T10:01:30Z',
      },
    ];
    renderWithProvider(<HistoryTab />);
    const rows = getTableRows();
    fireEvent.click(rows[0]);
    expect(screen.getByText('Items Processed')).toBeInTheDocument();
    expect(screen.getByText('Kalki 2898 AD')).toBeInTheDocument();
    expect(screen.getByText('Error Details')).toBeInTheDocument();
  });

  it('shows duration in seconds for short operations', () => {
    mockLogsData.current = [
      {
        id: 'log-1',
        function_name: 'quick-fn',
        status: 'success',
        movies_added: 0,
        movies_updated: 0,
        errors: null,
        details: null,
        started_at: '2024-01-15T10:00:00Z',
        completed_at: '2024-01-15T10:00:45Z',
      },
    ];
    renderWithProvider(<HistoryTab />);
    expect(screen.getByText('45s')).toBeInTheDocument();
  });

  it('populates function name dropdown with unique sorted names', () => {
    mockLogsData.current = [
      {
        id: 'log-1',
        function_name: 'zebra-fn',
        status: 'success',
        movies_added: 0,
        movies_updated: 0,
        errors: null,
        details: null,
        started_at: '2024-01-15T10:00:00Z',
        completed_at: '2024-01-15T10:01:00Z',
      },
      {
        id: 'log-2',
        function_name: 'alpha-fn',
        status: 'success',
        movies_added: 0,
        movies_updated: 0,
        errors: null,
        details: null,
        started_at: '2024-01-15T11:00:00Z',
        completed_at: '2024-01-15T11:01:00Z',
      },
      {
        id: 'log-3',
        function_name: 'alpha-fn',
        status: 'failed',
        movies_added: 0,
        movies_updated: 0,
        errors: null,
        details: null,
        started_at: '2024-01-15T12:00:00Z',
        completed_at: '2024-01-15T12:01:00Z',
      },
    ];
    renderWithProvider(<HistoryTab />);
    const fnSelect = screen.getByDisplayValue('All Functions');
    const options = fnSelect.querySelectorAll('option');
    // "All Functions" + "alpha-fn" + "zebra-fn" = 3 options
    expect(options.length).toBe(3);
    expect(options[1].textContent).toBe('alpha-fn');
    expect(options[2].textContent).toBe('zebra-fn');
  });

  it('handles array errors by expanding', () => {
    mockLogsData.current = [
      {
        id: 'log-1',
        function_name: 'array-errors-fn',
        status: 'failed',
        movies_added: 0,
        movies_updated: 0,
        errors: ['Error 1', 'Error 2'],
        details: null,
        started_at: '2024-01-15T10:00:00Z',
        completed_at: '2024-01-15T10:00:05Z',
      },
    ];
    renderWithProvider(<HistoryTab />);
    const rows = getTableRows();
    fireEvent.click(rows[0]);
    expect(screen.getByText('Error Details')).toBeInTheDocument();
  });

  it('uses fallback status style for unknown status values', () => {
    mockLogsData.current = [
      {
        id: 'log-1',
        function_name: 'test-fn',
        status: 'unknown_status' as 'failed',
        movies_added: 0,
        movies_updated: 0,
        errors: null,
        details: null,
        started_at: '2024-01-15T10:00:00Z',
        completed_at: '2024-01-15T10:00:05Z',
      },
    ];
    renderWithProvider(<HistoryTab />);
    // Should render without error, using the fallback style
    expect(screen.getByText('unknown_status')).toBeInTheDocument();
  });

  it('handles null details when expanding a row — does not show Items Processed section', () => {
    mockLogsData.current = [
      {
        id: 'log-1',
        function_name: 'test-fn',
        status: 'success',
        movies_added: 5,
        movies_updated: 0,
        errors: null,
        details: null,
        started_at: '2024-01-15T10:00:00Z',
        completed_at: '2024-01-15T10:00:05Z',
      },
    ];
    renderWithProvider(<HistoryTab />);
    const rows = getTableRows();
    fireEvent.click(rows[0]);
    // With null details and null errors, the row is not expandable, so no expanded content
    expect(screen.queryByText('Items Processed')).not.toBeInTheDocument();
  });

  it('renders details list when details is a non-empty array', () => {
    mockLogsData.current = [
      {
        id: 'log-1',
        function_name: 'test-fn',
        status: 'success',
        movies_added: 5,
        movies_updated: 0,
        errors: null,
        details: ['Movie A', 'Movie B'],
        started_at: '2024-01-15T10:00:00Z',
        completed_at: '2024-01-15T10:00:05Z',
      },
    ];
    renderWithProvider(<HistoryTab />);
    const rows = getTableRows();
    fireEvent.click(rows[0]);
    expect(screen.getByText('Items Processed')).toBeInTheDocument();
    expect(screen.getByText('Movie A')).toBeInTheDocument();
    expect(screen.getByText('Movie B')).toBeInTheDocument();
  });
});
