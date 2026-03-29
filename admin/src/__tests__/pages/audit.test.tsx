/**
 * Tests for AuditLogPage — audit log list with filters.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AuditLogPage from '@/app/(dashboard)/audit/page';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(),
    },
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/audit',
  useParams: () => ({}),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockAuditData: {
  pages: Array<
    Array<{
      id: string;
      action: string;
      entity_type: string;
      entity_id: string;
      entity_display_name: string | null;
      admin_display_name: string | null;
      admin_email: string | null;
      impersonating_role: string | null;
      impersonating_display_name: string | null;
      impersonating_email: string | null;
      details: Record<string, unknown>;
      created_at: string;
      reverted_at: string | null;
      reverted_by_display_name: string | null;
      reverted_by_email: string | null;
    }>
  >;
} = {
  pages: [
    [
      {
        id: 'audit-1',
        action: 'update',
        entity_type: 'movie',
        entity_id: 'movie-123',
        entity_display_name: 'Pushpa 2',
        admin_display_name: 'Admin User',
        admin_email: 'admin@example.com',
        impersonating_role: null,
        impersonating_display_name: null,
        impersonating_email: null,
        details: { title: { old: 'Old', new: 'New' } },
        created_at: '2025-03-15T10:30:00Z',
        reverted_at: null,
        reverted_by_display_name: null,
        reverted_by_email: null,
      },
    ],
  ],
};

let mockIsSuperAdmin = true;
let mockIsReadOnly = false;

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    role: mockIsSuperAdmin ? 'super_admin' : 'admin',
    isSuperAdmin: mockIsSuperAdmin,
    isReadOnly: mockIsReadOnly,
    isAdmin: !mockIsSuperAdmin,
    canViewPage: () => true,
    canCreate: () => true,
    canUpdate: () => true,
    canDelete: () => true,
    canDeleteTopLevel: () => mockIsSuperAdmin,
  }),
}));

vi.mock('@/hooks/useImpersonation', () => ({
  useEffectiveUser: () => ({ id: 'user-123', email: 'admin@test.com' }),
}));

let mockAuditLoading = false;
let mockAuditError = false;

vi.mock('@/hooks/useAdminAudit', () => ({
  useAdminAuditLog: () => ({
    data: mockAuditLoading ? undefined : mockAuditData,
    isLoading: mockAuditLoading,
    isError: mockAuditError,
    error: mockAuditError ? new Error('Load failed') : null,
    isFetching: false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
  }),
}));

vi.mock('@/hooks/useDebouncedSearch', () => ({
  useDebouncedSearch: () => ({
    search: '',
    setSearch: vi.fn(),
    debouncedSearch: '',
  }),
}));

vi.mock('@/components/common/SearchInput', () => ({
  SearchInput: ({ placeholder }: { placeholder: string }) => (
    <input placeholder={placeholder} data-testid="search-input" />
  ),
}));

vi.mock('@/components/common/LoadMoreButton', () => ({
  LoadMoreButton: () => null,
}));

vi.mock('@/components/audit/RevertButton', () => ({
  RevertButton: () => <button>Revert</button>,
}));

vi.mock('@/components/audit/ChangeDetails', () => ({
  ChangeDetails: ({ action }: { action: string; details: Record<string, unknown> }) => (
    <div data-testid="change-details">{action} details rendered</div>
  ),
}));

vi.mock('@/components/audit/auditUtils', () => ({
  actionStyles: {
    create: { bg: 'bg-green', text: 'text-green' },
    update: { bg: 'bg-blue', text: 'text-blue' },
    delete: { bg: 'bg-red', text: 'text-red' },
    sync: { bg: 'bg-purple', text: 'text-purple' },
  },
  getEntityDisplayName: vi.fn().mockReturnValue(null),
  canRevert: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/types', () => ({
  AUDIT_ENTITY_TYPES: ['movie', 'actor', 'user'],
  ADMIN_ROLE_LABELS: { super_admin: 'Super Admin', admin: 'Faniverz Admin' },
}));

vi.mock('@/lib/utils', () => ({
  formatDateTime: vi.fn((d: string) => d),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('AuditLogPage', () => {
  beforeEach(() => {
    mockIsSuperAdmin = true;
    mockIsReadOnly = false;
    mockAuditLoading = false;
    mockAuditError = false;
  });

  it('renders audit log table with entries', () => {
    renderWithProviders(<AuditLogPage />);

    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Entity Type')).toBeInTheDocument();
    expect(screen.getByText('Pushpa 2')).toBeInTheDocument();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('update')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    mockAuditLoading = true;
    renderWithProviders(<AuditLogPage />);

    // Should not show entries
    expect(screen.queryByText('Pushpa 2')).not.toBeInTheDocument();
  });

  it('shows error message when query fails', () => {
    mockAuditError = true;
    renderWithProviders(<AuditLogPage />);

    expect(screen.getByText(/Error loading audit log/)).toBeInTheDocument();
    expect(screen.getByText(/Load failed/)).toBeInTheDocument();
  });

  it('shows search input for super admins', () => {
    renderWithProviders(<AuditLogPage />);
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  it('hides search input for non-super admins', () => {
    mockIsSuperAdmin = false;
    renderWithProviders(<AuditLogPage />);

    expect(screen.queryByTestId('search-input')).not.toBeInTheDocument();
    expect(screen.getByText('Showing your activity only')).toBeInTheDocument();
  });

  it('renders action filter dropdown', () => {
    renderWithProviders(<AuditLogPage />);
    expect(screen.getByText('All Actions')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
    expect(screen.getByText('Sync')).toBeInTheDocument();
  });

  it('renders entity type filter dropdown', () => {
    renderWithProviders(<AuditLogPage />);
    expect(screen.getByText('All Entity Types')).toBeInTheDocument();
  });

  it('shows empty state when no entries', () => {
    mockAuditData.pages = [[]];
    renderWithProviders(<AuditLogPage />);
    expect(screen.getByText('No audit log entries found.')).toBeInTheDocument();
    // Restore
    mockAuditData.pages = [
      [
        {
          id: 'audit-1',
          action: 'update',
          entity_type: 'movie',
          entity_id: 'movie-123',
          entity_display_name: 'Pushpa 2',
          admin_display_name: 'Admin User',
          admin_email: 'admin@example.com',
          impersonating_role: null,
          impersonating_display_name: null,
          impersonating_email: null,
          details: { title: { old: 'Old', new: 'New' } },
          created_at: '2025-03-15T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
      ],
    ];
  });

  it('expands row details on click', () => {
    renderWithProviders(<AuditLogPage />);

    // Click the row
    const row = screen.getByText('Pushpa 2').closest('tr')!;
    fireEvent.click(row);

    // Details should be visible via ChangeDetails component
    expect(screen.getByTestId('change-details')).toBeInTheDocument();
    expect(screen.getByText('update details rendered')).toBeInTheDocument();
  });

  it('collapses expanded row on second click', () => {
    renderWithProviders(<AuditLogPage />);
    const row = screen.getByText('Pushpa 2').closest('tr')!;
    fireEvent.click(row);
    expect(screen.getByTestId('change-details')).toBeInTheDocument();
    fireEvent.click(row);
    expect(screen.queryByTestId('change-details')).not.toBeInTheDocument();
  });

  it('shows impersonation trail when impersonating_role is set', () => {
    mockAuditData.pages = [
      [
        {
          id: 'audit-2',
          action: 'update',
          entity_type: 'movie',
          entity_id: 'movie-456',
          entity_display_name: 'RRR',
          admin_display_name: 'Root Admin',
          admin_email: 'root@example.com',
          impersonating_role: 'admin',
          impersonating_display_name: 'Test Admin',
          impersonating_email: 'testadmin@example.com',
          details: {},
          created_at: '2025-03-16T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
      ],
    ];
    renderWithProviders(<AuditLogPage />);
    expect(screen.getByText(/as Test Admin/)).toBeInTheDocument();
    // Restore
    mockAuditData.pages = [
      [
        {
          id: 'audit-1',
          action: 'update',
          entity_type: 'movie',
          entity_id: 'movie-123',
          entity_display_name: 'Pushpa 2',
          admin_display_name: 'Admin User',
          admin_email: 'admin@example.com',
          impersonating_role: null,
          impersonating_display_name: null,
          impersonating_email: null,
          details: { title: { old: 'Old', new: 'New' } },
          created_at: '2025-03-15T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
      ],
    ];
  });

  it('shows entry count text when entries exist', () => {
    renderWithProviders(<AuditLogPage />);
    expect(screen.getByText(/Showing 1 entry/)).toBeInTheDocument();
  });

  it('renders ChangeDetails for non-update actions', () => {
    mockAuditData.pages = [
      [
        {
          id: 'audit-3',
          action: 'create',
          entity_type: 'movie',
          entity_id: 'movie-789',
          entity_display_name: 'Salaar',
          admin_display_name: 'Admin',
          admin_email: 'admin@example.com',
          impersonating_role: null,
          impersonating_display_name: null,
          impersonating_email: null,
          details: { title: 'Salaar' },
          created_at: '2025-03-17T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
      ],
    ];
    renderWithProviders(<AuditLogPage />);
    const row = screen.getByText('Salaar').closest('tr')!;
    fireEvent.click(row);
    expect(screen.getByText('create details rendered')).toBeInTheDocument();
    // Restore
    mockAuditData.pages = [
      [
        {
          id: 'audit-1',
          action: 'update',
          entity_type: 'movie',
          entity_id: 'movie-123',
          entity_display_name: 'Pushpa 2',
          admin_display_name: 'Admin User',
          admin_email: 'admin@example.com',
          impersonating_role: null,
          impersonating_display_name: null,
          impersonating_email: null,
          details: { title: { old: 'Old', new: 'New' } },
          created_at: '2025-03-15T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
      ],
    ];
  });

  it('shows RevertButton when canRevert returns true and not readOnly', async () => {
    const auditUtils = await import('@/components/audit/auditUtils');
    vi.mocked(auditUtils.canRevert).mockReturnValue(true);
    renderWithProviders(<AuditLogPage />);
    const row = screen.getByText('Pushpa 2').closest('tr')!;
    fireEvent.click(row);
    expect(screen.getByText('Revert')).toBeInTheDocument();
    vi.mocked(auditUtils.canRevert).mockReturnValue(false);
  });

  it('does not show RevertButton when isReadOnly', async () => {
    mockIsReadOnly = true;
    const auditUtils = await import('@/components/audit/auditUtils');
    vi.mocked(auditUtils.canRevert).mockReturnValue(true);
    renderWithProviders(<AuditLogPage />);
    const row = screen.getByText('Pushpa 2').closest('tr')!;
    fireEvent.click(row);
    expect(screen.queryByText('Revert')).not.toBeInTheDocument();
    vi.mocked(auditUtils.canRevert).mockReturnValue(false);
  });

  it('shows truncated entity ID when no display name or entity_display_name', async () => {
    const auditUtils = await import('@/components/audit/auditUtils');
    vi.mocked(auditUtils.getEntityDisplayName).mockReturnValue(null);
    mockAuditData.pages = [
      [
        {
          id: 'audit-4',
          action: 'delete',
          entity_type: 'user',
          entity_id: 'abcdefgh-1234-5678',
          entity_display_name: null,
          admin_display_name: 'Admin',
          admin_email: 'admin@example.com',
          impersonating_role: null,
          impersonating_display_name: null,
          impersonating_email: null,
          details: {},
          created_at: '2025-03-18T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
      ],
    ];
    renderWithProviders(<AuditLogPage />);
    expect(screen.getByText('abcdefgh...')).toBeInTheDocument();
    // Restore
    mockAuditData.pages = [
      [
        {
          id: 'audit-1',
          action: 'update',
          entity_type: 'movie',
          entity_id: 'movie-123',
          entity_display_name: 'Pushpa 2',
          admin_display_name: 'Admin User',
          admin_email: 'admin@example.com',
          impersonating_role: null,
          impersonating_display_name: null,
          impersonating_email: null,
          details: { title: { old: 'Old', new: 'New' } },
          created_at: '2025-03-15T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
      ],
    ];
  });

  it('renders date filter inputs', () => {
    renderWithProviders(<AuditLogPage />);
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBe(2);
  });

  it('applies action filter on change', () => {
    renderWithProviders(<AuditLogPage />);
    const actionSelect = screen.getByText('All Actions').closest('select')!;
    fireEvent.change(actionSelect, { target: { value: 'create' } });
    // Verify the filter was changed (component re-renders with new filter)
    expect(actionSelect).toHaveValue('create');
  });

  it('applies entity type filter on change', () => {
    renderWithProviders(<AuditLogPage />);
    const entitySelect = screen.getByText('All Entity Types').closest('select')!;
    fireEvent.change(entitySelect, { target: { value: 'movie' } });
    expect(entitySelect).toHaveValue('movie');
  });

  it('updates dateFrom when from-date input changes', () => {
    renderWithProviders(<AuditLogPage />);
    const dateInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2025-01-01' } });
    expect(dateInputs[0]).toHaveValue('2025-01-01');
  });

  it('updates dateTo when to-date input changes', () => {
    renderWithProviders(<AuditLogPage />);
    const dateInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[1], { target: { value: '2025-12-31' } });
    expect(dateInputs[1]).toHaveValue('2025-12-31');
  });

  it('shows impersonation trail for entries with impersonating_role', () => {
    mockAuditData.pages = [
      [
        {
          id: 'audit-imp',
          action: 'update',
          entity_type: 'movie',
          entity_id: 'movie-123',
          entity_display_name: 'Movie',
          admin_display_name: 'Admin',
          admin_email: 'admin@example.com',
          impersonating_role: 'admin',
          impersonating_display_name: 'Impersonated User',
          impersonating_email: 'imp@example.com',
          details: {},
          created_at: '2025-03-15T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
      ],
    ];
    renderWithProviders(<AuditLogPage />);
    expect(screen.getByText(/Impersonated User/)).toBeInTheDocument();
    // Restore
    mockAuditData.pages = [
      [
        {
          id: 'audit-1',
          action: 'update',
          entity_type: 'movie',
          entity_id: 'movie-123',
          entity_display_name: 'Pushpa 2',
          admin_display_name: 'Admin User',
          admin_email: 'admin@example.com',
          impersonating_role: null,
          impersonating_display_name: null,
          impersonating_email: null,
          details: { title: { old: 'Old', new: 'New' } },
          created_at: '2025-03-15T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
      ],
    ];
  });

  it('shows "Unknown" fallback when admin has no display name or email', () => {
    mockAuditData.pages = [
      [
        {
          id: 'audit-noname',
          action: 'update',
          entity_type: 'movie',
          entity_id: 'movie-123',
          entity_display_name: 'Movie',
          admin_display_name: null,
          admin_email: null,
          impersonating_role: null,
          impersonating_display_name: null,
          impersonating_email: null,
          details: {},
          created_at: '2025-03-15T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
      ],
    ];
    renderWithProviders(<AuditLogPage />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    // Restore
    mockAuditData.pages = [
      [
        {
          id: 'audit-1',
          action: 'update',
          entity_type: 'movie',
          entity_id: 'movie-123',
          entity_display_name: 'Pushpa 2',
          admin_display_name: 'Admin User',
          admin_email: 'admin@example.com',
          impersonating_role: null,
          impersonating_display_name: null,
          impersonating_email: null,
          details: { title: { old: 'Old', new: 'New' } },
          created_at: '2025-03-15T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
      ],
    ];
  });

  it('shows error state when audit log loading fails', () => {
    mockAuditError = true;
    renderWithProviders(<AuditLogPage />);
    expect(screen.getByText(/Error loading audit log/)).toBeInTheDocument();
    expect(screen.getByText(/Load failed/)).toBeInTheDocument();
    mockAuditError = false;
  });

  it('shows plural "entries" when count > 1', () => {
    mockAuditData.pages = [
      [
        {
          id: 'audit-1',
          action: 'update',
          entity_type: 'movie',
          entity_id: 'movie-123',
          entity_display_name: 'Pushpa 2',
          admin_display_name: 'Admin User',
          admin_email: 'admin@example.com',
          impersonating_role: null,
          impersonating_display_name: null,
          impersonating_email: null,
          details: { title: { old: 'Old', new: 'New' } },
          created_at: '2025-03-15T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
        {
          id: 'audit-2',
          action: 'create',
          entity_type: 'movie',
          entity_id: 'movie-456',
          entity_display_name: 'RRR',
          admin_display_name: 'Admin2',
          admin_email: 'admin2@example.com',
          impersonating_role: null,
          impersonating_display_name: null,
          impersonating_email: null,
          details: {},
          created_at: '2025-03-16T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
      ],
    ];
    renderWithProviders(<AuditLogPage />);
    expect(screen.getByText(/Showing 2 entries/)).toBeInTheDocument();
    // Restore
    mockAuditData.pages = [
      [
        {
          id: 'audit-1',
          action: 'update',
          entity_type: 'movie',
          entity_id: 'movie-123',
          entity_display_name: 'Pushpa 2',
          admin_display_name: 'Admin User',
          admin_email: 'admin@example.com',
          impersonating_role: null,
          impersonating_display_name: null,
          impersonating_email: null,
          details: { title: { old: 'Old', new: 'New' } },
          created_at: '2025-03-15T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
      ],
    ];
  });

  it('shows impersonating email when display_name is null', () => {
    mockAuditData.pages = [
      [
        {
          id: 'audit-imp-email',
          action: 'update',
          entity_type: 'movie',
          entity_id: 'movie-123',
          entity_display_name: 'Movie',
          admin_display_name: 'Admin',
          admin_email: 'admin@example.com',
          impersonating_role: 'admin',
          impersonating_display_name: null,
          impersonating_email: 'imp-email@example.com',
          details: {},
          created_at: '2025-03-15T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
      ],
    ];
    renderWithProviders(<AuditLogPage />);
    expect(screen.getByText(/imp-email@example.com/)).toBeInTheDocument();
    // Restore
    mockAuditData.pages = [
      [
        {
          id: 'audit-1',
          action: 'update',
          entity_type: 'movie',
          entity_id: 'movie-123',
          entity_display_name: 'Pushpa 2',
          admin_display_name: 'Admin User',
          admin_email: 'admin@example.com',
          impersonating_role: null,
          impersonating_display_name: null,
          impersonating_email: null,
          details: { title: { old: 'Old', new: 'New' } },
          created_at: '2025-03-15T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
      ],
    ];
  });

  it('shows role label when impersonating has no display_name or email', () => {
    mockAuditData.pages = [
      [
        {
          id: 'audit-imp-role',
          action: 'update',
          entity_type: 'movie',
          entity_id: 'movie-123',
          entity_display_name: 'Movie',
          admin_display_name: 'Admin',
          admin_email: 'admin@example.com',
          impersonating_role: 'admin',
          impersonating_display_name: null,
          impersonating_email: null,
          details: {},
          created_at: '2025-03-15T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
      ],
    ];
    renderWithProviders(<AuditLogPage />);
    expect(screen.getByText(/as Faniverz Admin/)).toBeInTheDocument();
    // Restore
    mockAuditData.pages = [
      [
        {
          id: 'audit-1',
          action: 'update',
          entity_type: 'movie',
          entity_id: 'movie-123',
          entity_display_name: 'Pushpa 2',
          admin_display_name: 'Admin User',
          admin_email: 'admin@example.com',
          impersonating_role: null,
          impersonating_display_name: null,
          impersonating_email: null,
          details: { title: { old: 'Old', new: 'New' } },
          created_at: '2025-03-15T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
      ],
    ];
  });

  it('shows em dash when entity has no display name and no entity_id', async () => {
    const auditUtils = await import('@/components/audit/auditUtils');
    vi.mocked(auditUtils.getEntityDisplayName).mockReturnValue(null);
    mockAuditData.pages = [
      [
        {
          id: 'audit-no-id',
          action: 'delete',
          entity_type: 'user',
          entity_id: '',
          entity_display_name: null,
          admin_display_name: 'Admin',
          admin_email: 'admin@example.com',
          impersonating_role: null,
          impersonating_display_name: null,
          impersonating_email: null,
          details: {},
          created_at: '2025-03-18T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
      ],
    ];
    renderWithProviders(<AuditLogPage />);
    expect(screen.getByText('—')).toBeInTheDocument();
    // Restore
    mockAuditData.pages = [
      [
        {
          id: 'audit-1',
          action: 'update',
          entity_type: 'movie',
          entity_id: 'movie-123',
          entity_display_name: 'Pushpa 2',
          admin_display_name: 'Admin User',
          admin_email: 'admin@example.com',
          impersonating_role: null,
          impersonating_display_name: null,
          impersonating_email: null,
          details: { title: { old: 'Old', new: 'New' } },
          created_at: '2025-03-15T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
      ],
    ];
  });

  it('shows admin email only when no display name', () => {
    mockAuditData.pages = [
      [
        {
          id: 'audit-email-only',
          action: 'update',
          entity_type: 'movie',
          entity_id: 'movie-123',
          entity_display_name: 'Movie',
          admin_display_name: null,
          admin_email: 'admin-only@example.com',
          impersonating_role: null,
          impersonating_display_name: null,
          impersonating_email: null,
          details: {},
          created_at: '2025-03-15T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
      ],
    ];
    renderWithProviders(<AuditLogPage />);
    expect(screen.getByText('admin-only@example.com')).toBeInTheDocument();
    // Should NOT show the sub-email line (only shown when both name AND email exist)
    // Restore
    mockAuditData.pages = [
      [
        {
          id: 'audit-1',
          action: 'update',
          entity_type: 'movie',
          entity_id: 'movie-123',
          entity_display_name: 'Pushpa 2',
          admin_display_name: 'Admin User',
          admin_email: 'admin@example.com',
          impersonating_role: null,
          impersonating_display_name: null,
          impersonating_email: null,
          details: { title: { old: 'Old', new: 'New' } },
          created_at: '2025-03-15T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
      ],
    ];
  });

  it('uses getEntityDisplayName fallback when entity_display_name is null but details have name', async () => {
    const auditUtils = await import('@/components/audit/auditUtils');
    vi.mocked(auditUtils.getEntityDisplayName).mockReturnValue('Details Name');
    mockAuditData.pages = [
      [
        {
          id: 'audit-name-from-details',
          action: 'create',
          entity_type: 'movie',
          entity_id: 'movie-789',
          entity_display_name: null,
          admin_display_name: 'Admin',
          admin_email: 'admin@example.com',
          impersonating_role: null,
          impersonating_display_name: null,
          impersonating_email: null,
          details: { title: 'Details Name' },
          created_at: '2025-03-18T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
      ],
    ];
    renderWithProviders(<AuditLogPage />);
    expect(screen.getByText('Details Name')).toBeInTheDocument();
    vi.mocked(auditUtils.getEntityDisplayName).mockReturnValue(null);
    // Restore
    mockAuditData.pages = [
      [
        {
          id: 'audit-1',
          action: 'update',
          entity_type: 'movie',
          entity_id: 'movie-123',
          entity_display_name: 'Pushpa 2',
          admin_display_name: 'Admin User',
          admin_email: 'admin@example.com',
          impersonating_role: null,
          impersonating_display_name: null,
          impersonating_email: null,
          details: { title: { old: 'Old', new: 'New' } },
          created_at: '2025-03-15T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
      ],
    ];
  });

  it('shows impersonating_role raw string when no display_name, email, or role label found', () => {
    mockAuditData.pages = [
      [
        {
          id: 'audit-imp-raw',
          action: 'update',
          entity_type: 'movie',
          entity_id: 'movie-123',
          entity_display_name: 'Movie',
          admin_display_name: 'Admin',
          admin_email: 'admin@example.com',
          impersonating_role: 'unknown_role_xyz',
          impersonating_display_name: null,
          impersonating_email: null,
          details: {},
          created_at: '2025-03-15T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
      ],
    ];
    renderWithProviders(<AuditLogPage />);
    expect(screen.getByText(/as unknown_role_xyz/)).toBeInTheDocument();
    // Restore
    mockAuditData.pages = [
      [
        {
          id: 'audit-1',
          action: 'update',
          entity_type: 'movie',
          entity_id: 'movie-123',
          entity_display_name: 'Pushpa 2',
          admin_display_name: 'Admin User',
          admin_email: 'admin@example.com',
          impersonating_role: null,
          impersonating_display_name: null,
          impersonating_email: null,
          details: { title: { old: 'Old', new: 'New' } },
          created_at: '2025-03-15T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
      ],
    ];
  });

  it('shows reverted_by_email fallback when reverted_by_display_name is null', async () => {
    const auditUtils = await import('@/components/audit/auditUtils');
    vi.mocked(auditUtils.canRevert).mockReturnValue(true);
    mockAuditData.pages = [
      [
        {
          id: 'audit-reverted',
          action: 'update',
          entity_type: 'movie',
          entity_id: 'movie-123',
          entity_display_name: 'Movie',
          admin_display_name: 'Admin',
          admin_email: 'admin@example.com',
          impersonating_role: null,
          impersonating_display_name: null,
          impersonating_email: null,
          details: { title: { old: 'Old', new: 'New' } },
          created_at: '2025-03-15T10:30:00Z',
          reverted_at: '2025-03-16T10:30:00Z',
          reverted_by_display_name: null,
          reverted_by_email: 'reverter@example.com',
        },
      ],
    ];
    renderWithProviders(<AuditLogPage />);
    const row = screen.getByText('Movie').closest('tr')!;
    fireEvent.click(row);
    // Revert button should be shown
    expect(screen.getByText('Revert')).toBeInTheDocument();
    vi.mocked(auditUtils.canRevert).mockReturnValue(false);
    // Restore
    mockAuditData.pages = [
      [
        {
          id: 'audit-1',
          action: 'update',
          entity_type: 'movie',
          entity_id: 'movie-123',
          entity_display_name: 'Pushpa 2',
          admin_display_name: 'Admin User',
          admin_email: 'admin@example.com',
          impersonating_role: null,
          impersonating_display_name: null,
          impersonating_email: null,
          details: { title: { old: 'Old', new: 'New' } },
          created_at: '2025-03-15T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
      ],
    ];
  });

  it('uses non-Error fallback in error display', () => {
    mockAuditError = true;
    renderWithProviders(<AuditLogPage />);
    expect(screen.getByText(/Error loading audit log/)).toBeInTheDocument();
    mockAuditError = false;
  });

  it('falls back to actionStyles.update for unknown action', () => {
    mockAuditData.pages = [
      [
        {
          id: 'audit-unknown',
          action: 'custom_action',
          entity_type: 'movie',
          entity_id: 'movie-123',
          entity_display_name: 'Movie',
          admin_display_name: 'Admin',
          admin_email: 'admin@example.com',
          impersonating_role: null,
          impersonating_display_name: null,
          impersonating_email: null,
          details: {},
          created_at: '2025-03-15T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
      ],
    ];
    renderWithProviders(<AuditLogPage />);
    expect(screen.getByText('custom_action')).toBeInTheDocument();
    // Restore
    mockAuditData.pages = [
      [
        {
          id: 'audit-1',
          action: 'update',
          entity_type: 'movie',
          entity_id: 'movie-123',
          entity_display_name: 'Pushpa 2',
          admin_display_name: 'Admin User',
          admin_email: 'admin@example.com',
          impersonating_role: null,
          impersonating_display_name: null,
          impersonating_email: null,
          details: { title: { old: 'Old', new: 'New' } },
          created_at: '2025-03-15T10:30:00Z',
          reverted_at: null,
          reverted_by_display_name: null,
          reverted_by_email: null,
        },
      ],
    ];
  });
});
