import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import InviteAdminPage from '@/app/(dashboard)/users/invite/page';

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

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'user-1', role: 'super_admin', productionHouseIds: [] },
    isLoading: false,
    isAccessDenied: false,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
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
});
