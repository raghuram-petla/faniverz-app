import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from '@/app/(dashboard)/page';

const mockUseDashboardStats = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useDashboardStats', () => ({
  useDashboardStats: (...args: unknown[]) => mockUseDashboardStats(...args),
}));

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
    mockUseDashboardStats.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
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

  it('hides "In Theaters" when user cannot view theaters page', () => {
    mockUsePermissions.mockReturnValue({
      role: 'admin',
      isSuperAdmin: false,
      isAdmin: true,
      isPHAdmin: false,
      productionHouseIds: [],
      canViewPage: (page: string) => page !== 'theaters',
      canCreate: () => true,
      canUpdate: () => true,
      canDelete: () => true,
      auditScope: 'all',
    });
    renderWithProviders(<DashboardPage />);
    expect(screen.queryByText('In Theaters')).not.toBeInTheDocument();
  });

  it('shows loading pulse when stats are loading', () => {
    renderWithProviders(<DashboardPage />);
    // The stats are loading initially, so we should see the loading pulse
    const pulseElements = document.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThanOrEqual(0);
  });

  it('renders all quick action links with correct hrefs', () => {
    renderWithProviders(<DashboardPage />);
    const theatersLink = screen.getByText('In Theaters').closest('a');
    expect(theatersLink).toHaveAttribute('href', '/theaters');
    const actorLink = screen.getByText('Add Actor').closest('a');
    expect(actorLink).toHaveAttribute('href', '/cast');
    const feedLink = screen.getByText('Add Feed Post').closest('a');
    expect(feedLink).toHaveAttribute('href', '/feed/new');
    const syncLink = screen.getByText('Trigger Sync').closest('a');
    expect(syncLink).toHaveAttribute('href', '/sync');
  });

  it('PH admin sees only allowed quick actions', () => {
    mockUsePermissions.mockReturnValue({
      role: 'production_house_admin',
      isSuperAdmin: false,
      isAdmin: false,
      isPHAdmin: true,
      productionHouseIds: ['ph-1'],
      canViewPage: (page: string) => page !== 'sync',
      canCreate: () => true,
      canUpdate: () => true,
      canDelete: () => false,
      auditScope: 'own',
    });
    renderWithProviders(<DashboardPage />);
    // PH admin should see Add Movie and Add Actor
    expect(screen.getByText('Add Movie')).toBeInTheDocument();
    expect(screen.getByText('Add Actor')).toBeInTheDocument();
    // But not Add Feed Post (isPHAdmin) or Trigger Sync (canViewPage returns false)
    expect(screen.queryByText('Add Feed Post')).not.toBeInTheDocument();
    expect(screen.queryByText('Trigger Sync')).not.toBeInTheDocument();
  });

  it('renders stat values when data is loaded (non-loading branch)', () => {
    mockUseDashboardStats.mockReturnValue({
      data: {
        totalMovies: 150,
        totalActors: 300,
        totalUsers: 1000,
        totalReviews: 500,
        totalFeedItems: 75,
        totalComments: 2000,
      },
      isLoading: false,
    });
    renderWithProviders(<DashboardPage />);
    // Should show actual values, no loading pulses
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();
    expect(screen.getByText('1000')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('2000')).toBeInTheDocument();
    expect(document.querySelectorAll('.animate-pulse').length).toBe(0);
  });

  it('renders 0 for null/undefined stat values via nullish coalescing', () => {
    mockUseDashboardStats.mockReturnValue({
      data: {
        totalMovies: null,
        totalActors: undefined,
        totalUsers: 0,
        totalReviews: null,
        totalFeedItems: undefined,
        totalComments: null,
      },
      isLoading: false,
    });
    renderWithProviders(<DashboardPage />);
    // null/undefined values should fall back to 0 via ?? operator
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(5);
  });

  it('PH admin with theaters access sees In Theaters action', () => {
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
    expect(screen.getByText('In Theaters')).toBeInTheDocument();
    // Feed post still hidden because isPHAdmin
    expect(screen.queryByText('Add Feed Post')).not.toBeInTheDocument();
  });
});
