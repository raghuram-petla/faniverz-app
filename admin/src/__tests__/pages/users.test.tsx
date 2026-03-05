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

  it('renders "Active Admins" and "Invitations" tab buttons', () => {
    renderWithProviders(<UsersPage />);
    expect(screen.getByText('Active Admins')).toBeInTheDocument();
    expect(screen.getByText('Invitations')).toBeInTheDocument();
  });

  it('shows table headers: User, Role, Assigned PHs, Since, Actions', async () => {
    renderWithProviders(<UsersPage />);
    await waitFor(() => {
      expect(screen.getByText('Assigned PHs')).toBeInTheDocument();
    });
    expect(screen.getByText('User', { selector: 'th' })).toBeInTheDocument();
    expect(screen.getByText('Role', { selector: 'th' })).toBeInTheDocument();
    expect(screen.getByText('Since')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });
});
