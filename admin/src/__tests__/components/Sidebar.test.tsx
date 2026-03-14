import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '@/components/layout/Sidebar';

const mockToggle = vi.fn();
let mockCollapsed = false;

vi.mock('@/hooks/useSidebarState', () => ({
  useSidebarState: () => ({
    collapsed: mockCollapsed,
    toggle: mockToggle,
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
      gte: vi.fn().mockReturnThis(),
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

// Mock usePermissions to return super_admin permissions (sees all pages)
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

describe('Sidebar', () => {
  beforeEach(() => {
    mockCollapsed = false;
    mockToggle.mockClear();
  });

  it('renders all nav items for super admin', () => {
    render(<Sidebar />);

    const navLabels = [
      'Dashboard',
      'Movies',
      'Cast/Actors',
      'OTT Releases',
      'Platforms',
      'Surprise Content',
      'Notifications',
      'Reviews',
      'Comments',
      'Sync',
      'Audit Log',
      'User Management',
    ];

    for (const label of navLabels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('renders section headers', () => {
    render(<Sidebar />);
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Moderation')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('has the Faniverz branding logo', () => {
    render(<Sidebar />);
    expect(screen.getByAltText('Faniverz')).toBeInTheDocument();
  });

  it('renders collapse toggle button next to Content header', () => {
    render(<Sidebar />);
    expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument();
  });

  it('calls toggle when collapse button is clicked', () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByLabelText('Collapse sidebar'));
    expect(mockToggle).toHaveBeenCalledOnce();
  });

  it('hides labels and section headers when collapsed', () => {
    mockCollapsed = true;
    render(<Sidebar />);

    // Nav labels should not be visible
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Movies')).not.toBeInTheDocument();

    // Section headers should not be visible
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Moderation')).not.toBeInTheDocument();

    // Expand button should still be visible
    expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
  });

  it('shows expand button when collapsed', () => {
    mockCollapsed = true;
    render(<Sidebar />);
    expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
  });

  it('shows icon logo when collapsed', () => {
    mockCollapsed = true;
    render(<Sidebar />);
    const logo = screen.getByAltText('Faniverz');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', expect.stringContaining('logo-icon'));
  });
});
