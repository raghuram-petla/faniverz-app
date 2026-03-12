import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UsersPage from '@/app/(dashboard)/users/page';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      gte: vi.fn().mockReturnThis(),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(),
    },
  },
}));

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'super-1', role: 'super_admin', email: 'admin@test.com', productionHouseIds: [] },
    isLoading: false,
    isAccessDenied: false,
    blockedReason: null,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

vi.mock('@/hooks/useImpersonation', () => ({
  useImpersonation: () => ({
    isImpersonating: false,
    effectiveUser: null,
    realUser: null,
    startImpersonation: vi.fn(),
    startRoleImpersonation: vi.fn(),
    stopImpersonation: vi.fn(),
  }),
  useEffectiveUser: () => ({
    id: 'super-1',
    role: 'super_admin',
    email: 'admin@test.com',
    productionHouseIds: [],
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/users',
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

vi.mock('@/lib/utils', () => ({
  formatDateTime: (d: string) => d,
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('UsersPage', () => {
  it('renders "User Management" heading', () => {
    renderWithProviders(<UsersPage />);
    expect(screen.getByText('User Management')).toBeInTheDocument();
  });

  it('renders "Invite Admin" link', () => {
    renderWithProviders(<UsersPage />);
    expect(screen.getByText('Invite Admin')).toBeInTheDocument();
  });

  it('renders "Admins" and "Invitations" tab buttons', () => {
    renderWithProviders(<UsersPage />);
    expect(screen.getByText('Admins')).toBeInTheDocument();
    expect(screen.getByText('Invitations')).toBeInTheDocument();
  });

  it('shows status filter buttons when on admins tab', () => {
    renderWithProviders(<UsersPage />);
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('blocked')).toBeInTheDocument();
    expect(screen.getByText('all')).toBeInTheDocument();
  });
});
