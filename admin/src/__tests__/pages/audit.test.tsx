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

const mockAuditData = {
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

vi.mock('@/components/audit/auditUtils', () => ({
  actionStyles: {
    create: { bg: 'bg-green', text: 'text-green' },
    update: { bg: 'bg-blue', text: 'text-blue' },
    delete: { bg: 'bg-red', text: 'text-red' },
    sync: { bg: 'bg-purple', text: 'text-purple' },
  },
  formatDetails: vi.fn().mockReturnValue('formatted details'),
  getEntityDisplayName: vi.fn().mockReturnValue(null),
  canRevert: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/types', () => ({
  AUDIT_ENTITY_TYPES: ['movie', 'actor', 'user'],
  ADMIN_ROLE_LABELS: { super_admin: 'Super Admin', admin: 'Admin' },
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

    // Details should be visible
    expect(screen.getByText('Changes')).toBeInTheDocument();
    expect(screen.getByText('formatted details')).toBeInTheDocument();
  });
});
