import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import InviteAdminPage from '@/app/(dashboard)/users/invite/page';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';

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
      gte: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
      ilike: vi.fn().mockReturnThis(),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(),
    },
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/users/invite',
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

vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChangesWarning: vi.fn(),
}));

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'user-1', role: 'super_admin', productionHouseIds: [] },
    isLoading: false,
    isAccessDenied: false,
    signInWithGoogle: vi.fn(),

    signOut: vi.fn(),
  }),
}));

// @sync: mock usePermissions so canManageAdmin is stable and returns true for all roles
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    canManageAdmin: () => true,
    role: 'super_admin',
    isRoot: false,
    isSuperAdmin: true,
    isAdmin: false,
    isPHAdmin: false,
    isViewer: false,
    isReadOnly: false,
  }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('InviteAdminPage', () => {
  it('renders "Invite New Admin" heading', () => {
    renderWithProviders(<InviteAdminPage />);
    expect(screen.getByText('Invite New Admin')).toBeInTheDocument();
  });

  it('renders "Back to Admin Management" link', () => {
    renderWithProviders(<InviteAdminPage />);
    expect(screen.getByText('Back to Admin Management')).toBeInTheDocument();
  });

  it('renders email input with placeholder "admin@example.com"', () => {
    renderWithProviders(<InviteAdminPage />);
    expect(screen.getByPlaceholderText('admin@example.com')).toBeInTheDocument();
  });

  it('renders role select dropdown', () => {
    renderWithProviders(<InviteAdminPage />);
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders "Create Invitation" submit button', () => {
    renderWithProviders(<InviteAdminPage />);
    expect(screen.getByText('Create Invitation')).toBeInTheDocument();
  });

  it('calls useUnsavedChangesWarning hook', () => {
    renderWithProviders(<InviteAdminPage />);
    expect(useUnsavedChangesWarning).toHaveBeenCalled();
  });

  it('calls useUnsavedChangesWarning with false when form is pristine', () => {
    renderWithProviders(<InviteAdminPage />);
    // @contract: isDirty should be false on initial render (no email, no PH, role == default)
    expect(useUnsavedChangesWarning).toHaveBeenLastCalledWith(false);
  });

  it('calls useUnsavedChangesWarning with true when email is entered', () => {
    renderWithProviders(<InviteAdminPage />);
    const emailInput = screen.getByPlaceholderText('admin@example.com');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    expect(useUnsavedChangesWarning).toHaveBeenLastCalledWith(true);
  });
});
