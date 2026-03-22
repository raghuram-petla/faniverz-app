import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from '@/app/(dashboard)/page';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ count: 42, data: null, error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    functions: { invoke: vi.fn() },
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
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

const mockUsePermissions = vi.fn();
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => mockUsePermissions(),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePermissions.mockReturnValue({
      role: 'super_admin',
      isSuperAdmin: true,
      isAdmin: false,
      isPHAdmin: false,
      productionHouseIds: [],
      canViewPage: () => true,
      canCreate: () => true,
      canUpdate: () => true,
      canDelete: () => true,
      auditScope: 'all',
    });
  });

  it('renders Movies stat card', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('Movies')).toBeInTheDocument();
  });

  it('renders all 6 stat cards', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('Movies')).toBeInTheDocument();
    expect(screen.getByText('Actors')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Reviews')).toBeInTheDocument();
    expect(screen.getByText('Feed Items')).toBeInTheDocument();
    expect(screen.getByText('Comments')).toBeInTheDocument();
  });

  it('renders quick action links', () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('Add Movie')).toBeInTheDocument();
    expect(screen.getByText('In Theaters')).toBeInTheDocument();
    expect(screen.getByText('Add Actor')).toBeInTheDocument();
    expect(screen.getByText('Add Feed Post')).toBeInTheDocument();
    expect(screen.getByText('Trigger Sync')).toBeInTheDocument();
  });

  it('shows "My Movies" label for PH admin', () => {
    mockUsePermissions.mockReturnValue({
      role: 'production_house_admin',
      isSuperAdmin: false,
      isAdmin: false,
      isPHAdmin: true,
      productionHouseIds: ['ph-1'],
      canViewPage: () => true,
      canCreate: () => true,
      canUpdate: () => true,
      canDelete: () => false,
      auditScope: 'own',
    });
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('My Movies')).toBeInTheDocument();
  });

  it('hides "Add Feed Post" for PH admin', () => {
    mockUsePermissions.mockReturnValue({
      role: 'production_house_admin',
      isSuperAdmin: false,
      isAdmin: false,
      isPHAdmin: true,
      productionHouseIds: ['ph-1'],
      canViewPage: () => true,
      canCreate: () => true,
      canUpdate: () => true,
      canDelete: () => false,
      auditScope: 'own',
    });
    renderWithProviders(<DashboardPage />);
    expect(screen.queryByText('Add Feed Post')).not.toBeInTheDocument();
  });

  it('hides "Trigger Sync" when user cannot view sync page', () => {
    mockUsePermissions.mockReturnValue({
      role: 'admin',
      isSuperAdmin: false,
      isAdmin: true,
      isPHAdmin: false,
      productionHouseIds: [],
      canViewPage: (page: string) => page !== 'sync',
      canCreate: () => true,
      canUpdate: () => true,
      canDelete: () => true,
      auditScope: 'all',
    });
    renderWithProviders(<DashboardPage />);
    expect(screen.queryByText('Trigger Sync')).not.toBeInTheDocument();
  });

  it('renders stat cards with loading or value state', () => {
    renderWithProviders(<DashboardPage />);
    // Each stat card has an icon div and label — verify the stat card structure
    const statCards = document.querySelectorAll('.bg-surface-card');
    expect(statCards.length).toBeGreaterThanOrEqual(6);
  });

  it('quick actions link to correct hrefs', () => {
    renderWithProviders(<DashboardPage />);
    const addMovieLink = screen.getByText('Add Movie').closest('a');
    expect(addMovieLink).toHaveAttribute('href', '/movies/new');
  });
});
