import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductionHousesPage from '@/app/(dashboard)/production-houses/page';

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
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    functions: { invoke: vi.fn() },
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/production-houses',
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

// Mock usePermissions to return super_admin permissions
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
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
  }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ProductionHousesPage', () => {
  it('renders "Add Production House" button', () => {
    renderWithProviders(<ProductionHousesPage />);
    expect(screen.getByText('Add Production House')).toBeInTheDocument();
  });

  it('renders search input with placeholder', () => {
    renderWithProviders(<ProductionHousesPage />);
    expect(screen.getByPlaceholderText('Search production houses...')).toBeInTheDocument();
  });

  it('shows add form when "Add Production House" button is clicked', () => {
    renderWithProviders(<ProductionHousesPage />);
    fireEvent.click(screen.getByText('Add Production House'));
    expect(screen.getByPlaceholderText('Name *')).toBeInTheDocument();
  });

  it('shows "Name *" input placeholder in the add form', () => {
    renderWithProviders(<ProductionHousesPage />);
    fireEvent.click(screen.getByText('Add Production House'));
    expect(screen.getByPlaceholderText('Name *')).toBeInTheDocument();
  });

  it('shows "Cancel" button in the add form', () => {
    renderWithProviders(<ProductionHousesPage />);
    fireEvent.click(screen.getByText('Add Production House'));
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });
});
