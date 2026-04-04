import { render, screen } from '@testing-library/react';
import React from 'react';

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockPathname = '/';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: vi.fn() }),
  usePathname: () => mockPathname,
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
    [k: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

vi.mock('@/lib/query-client', () => {
  const { QueryClient } = require('@tanstack/react-query');
  return {
    getQueryClient: () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  };
});

const mockUseAuth = vi.fn();
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/components/layout/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock('@/components/layout/Header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

vi.mock('@/components/layout/ImpersonationBar', () => ({
  ImpersonationBar: () => null,
}));

vi.mock('@/components/common/AccessDenied', () => ({
  AccessDenied: () => <div data-testid="access-denied">Access Denied</div>,
}));

vi.mock('@/components/common/ReadOnlyBanner', () => ({
  ReadOnlyBanner: () => null,
}));

vi.mock('@/hooks/useImpersonation', () => ({
  ImpersonationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/hooks/useLanguageContext', () => ({
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockUsePermissions = vi.fn();
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => mockUsePermissions(),
}));

import DashboardLayout from '@/app/(dashboard)/layout';

describe('DashboardLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/';
    mockUsePermissions.mockReturnValue({
      canViewPage: () => true,
      isReadOnly: false,
    });
  });

  it('shows loading spinner while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true, isAccessDenied: false });
    render(
      <DashboardLayout>
        <div>child</div>
      </DashboardLayout>,
    );
    expect(screen.queryByText('child')).not.toBeInTheDocument();
    // Spinner is rendered via Loader2 icon
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows AccessDenied when access is denied', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false, isAccessDenied: true });
    render(
      <DashboardLayout>
        <div>child</div>
      </DashboardLayout>,
    );
    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
  });

  it('redirects to login when no user and not loading', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false, isAccessDenied: false });
    render(
      <DashboardLayout>
        <div>child</div>
      </DashboardLayout>,
    );
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('renders null when no user (before redirect)', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false, isAccessDenied: false });
    const { container: _container } = render(
      <DashboardLayout>
        <div>child</div>
      </DashboardLayout>,
    );
    expect(screen.queryByText('child')).not.toBeInTheDocument();
  });

  it('renders sidebar, header, and children when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', role: 'super_admin' },
      isLoading: false,
      isAccessDenied: false,
    });
    render(
      <DashboardLayout>
        <div>child content</div>
      </DashboardLayout>,
    );
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('shows access denied message when user lacks page permission', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', role: 'admin' },
      isLoading: false,
      isAccessDenied: false,
    });
    mockUsePermissions.mockReturnValue({
      canViewPage: () => false,
      isReadOnly: false,
    });
    mockPathname = '/movies';

    render(
      <DashboardLayout>
        <div>movie content</div>
      </DashboardLayout>,
    );
    expect(screen.getByText('Page Not Accessible')).toBeInTheDocument();
  });

  it('shows read-only message when viewer tries to access create pages', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', role: 'viewer' },
      isLoading: false,
      isAccessDenied: false,
    });
    mockUsePermissions.mockReturnValue({
      canViewPage: () => true,
      isReadOnly: true,
    });
    mockPathname = '/movies/new';

    render(
      <DashboardLayout>
        <div>new movie</div>
      </DashboardLayout>,
    );
    expect(screen.getByText('Read-Only Access')).toBeInTheDocument();
  });

  it('blocks viewer from /notifications/compose page', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', role: 'viewer' },
      isLoading: false,
      isAccessDenied: false,
    });
    mockUsePermissions.mockReturnValue({
      canViewPage: () => true,
      isReadOnly: true,
    });
    mockPathname = '/notifications/compose';
    render(
      <DashboardLayout>
        <div>compose content</div>
      </DashboardLayout>,
    );
    expect(screen.getByText('Read-Only Access')).toBeInTheDocument();
  });

  it('blocks viewer from /users/invite page', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', role: 'viewer' },
      isLoading: false,
      isAccessDenied: false,
    });
    mockUsePermissions.mockReturnValue({
      canViewPage: () => true,
      isReadOnly: true,
    });
    mockPathname = '/users/invite';
    render(
      <DashboardLayout>
        <div>invite content</div>
      </DashboardLayout>,
    );
    expect(screen.getByText('Read-Only Access')).toBeInTheDocument();
  });

  it('renders children for unmapped routes without permission check', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', role: 'admin' },
      isLoading: false,
      isAccessDenied: false,
    });
    mockUsePermissions.mockReturnValue({
      canViewPage: () => false,
      isReadOnly: false,
    });
    mockPathname = '/';
    render(
      <DashboardLayout>
        <div>home content</div>
      </DashboardLayout>,
    );
    // '/' is not in ROUTE_PAGE_MAP, so requiredPage is null -> renders children
    expect(screen.getByText('home content')).toBeInTheDocument();
  });

  it('shows Page Not Accessible for /reviews when user lacks permission', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', role: 'admin' },
      isLoading: false,
      isAccessDenied: false,
    });
    mockUsePermissions.mockReturnValue({
      canViewPage: (page: string) => page !== 'reviews',
      isReadOnly: false,
    });
    mockPathname = '/reviews';

    render(
      <DashboardLayout>
        <div>reviews content</div>
      </DashboardLayout>,
    );
    expect(screen.getByText('Page Not Accessible')).toBeInTheDocument();
    expect(screen.queryByText('reviews content')).not.toBeInTheDocument();
  });

  it('shows Page Not Accessible for /comments when user lacks permission', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', role: 'admin' },
      isLoading: false,
      isAccessDenied: false,
    });
    mockUsePermissions.mockReturnValue({
      canViewPage: (page: string) => page !== 'comments',
      isReadOnly: false,
    });
    mockPathname = '/comments';

    render(
      <DashboardLayout>
        <div>comments content</div>
      </DashboardLayout>,
    );
    expect(screen.getByText('Page Not Accessible')).toBeInTheDocument();
    expect(screen.queryByText('comments content')).not.toBeInTheDocument();
  });

  it('renders /reviews content when user has reviews permission', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', role: 'admin' },
      isLoading: false,
      isAccessDenied: false,
    });
    mockUsePermissions.mockReturnValue({
      canViewPage: () => true,
      isReadOnly: false,
    });
    mockPathname = '/reviews';

    render(
      <DashboardLayout>
        <div>reviews content</div>
      </DashboardLayout>,
    );
    expect(screen.getByText('reviews content')).toBeInTheDocument();
  });

  it('renders /comments content when user has comments permission', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', role: 'admin' },
      isLoading: false,
      isAccessDenied: false,
    });
    mockUsePermissions.mockReturnValue({
      canViewPage: () => true,
      isReadOnly: false,
    });
    mockPathname = '/comments';

    render(
      <DashboardLayout>
        <div>comments content</div>
      </DashboardLayout>,
    );
    expect(screen.getByText('comments content')).toBeInTheDocument();
  });

  it('checks permission for /reviews/some-id sub-route', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', role: 'admin' },
      isLoading: false,
      isAccessDenied: false,
    });
    mockUsePermissions.mockReturnValue({
      canViewPage: (page: string) => page !== 'reviews',
      isReadOnly: false,
    });
    mockPathname = '/reviews/some-review-id';

    render(
      <DashboardLayout>
        <div>review detail</div>
      </DashboardLayout>,
    );
    expect(screen.getByText('Page Not Accessible')).toBeInTheDocument();
  });

  it('allows viewer to access non-create pages', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', role: 'viewer' },
      isLoading: false,
      isAccessDenied: false,
    });
    mockUsePermissions.mockReturnValue({
      canViewPage: () => true,
      isReadOnly: true,
    });
    render(
      <DashboardLayout>
        <div>dashboard content</div>
      </DashboardLayout>,
    );
    expect(screen.getByText('dashboard content')).toBeInTheDocument();
  });
});
