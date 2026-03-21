/**
 * Tests for NotificationsPage — notification management.
 */

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NotificationsPage from '@/app/(dashboard)/notifications/page';

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
  usePathname: () => '/notifications',
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

let mockIsReadOnly = false;

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    role: 'super_admin',
    isSuperAdmin: true,
    isReadOnly: mockIsReadOnly,
    canViewPage: () => true,
  }),
}));

const mockNotifications = [
  {
    id: 'notif-1',
    type: 'release',
    title: 'Pushpa 2 Release',
    status: 'pending',
    scheduled_for: '2025-03-20T10:00:00Z',
  },
  {
    id: 'notif-2',
    type: 'watchlist',
    title: 'Your watchlist movie is out',
    status: 'sent',
    scheduled_for: '2025-03-18T10:00:00Z',
  },
  {
    id: 'notif-3',
    type: 'trending',
    title: 'Trending now',
    status: 'failed',
    scheduled_for: '2025-03-19T10:00:00Z',
  },
];

let mockIsLoading = false;
let mockData: typeof mockNotifications | null = mockNotifications;

vi.mock('@/hooks/useAdminNotifications', () => ({
  useAdminNotifications: () => ({
    data: mockIsLoading ? undefined : mockData,
    isLoading: mockIsLoading,
  }),
  useCancelNotification: () => ({ mutate: vi.fn(), isPending: false }),
  useRetryNotification: () => ({ mutate: vi.fn(), isPending: false }),
  useBulkRetryFailed: () => ({ mutate: vi.fn(), isPending: false }),
  useBulkCancelPending: () => ({ mutate: vi.fn(), isPending: false }),
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

describe('NotificationsPage', () => {
  beforeEach(() => {
    mockIsReadOnly = false;
    mockIsLoading = false;
    mockData = mockNotifications;
  });

  it('renders notification table with entries', () => {
    renderWithProviders(<NotificationsPage />);

    expect(screen.getByText('Pushpa 2 Release')).toBeInTheDocument();
    expect(screen.getByText('Your watchlist movie is out')).toBeInTheDocument();
    expect(screen.getByText('Trending now')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    renderWithProviders(<NotificationsPage />);

    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Scheduled For')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('shows type badges', () => {
    renderWithProviders(<NotificationsPage />);

    expect(screen.getByText('release')).toBeInTheDocument();
    expect(screen.getByText('watchlist')).toBeInTheDocument();
    expect(screen.getByText('trending')).toBeInTheDocument();
  });

  it('shows status badges', () => {
    renderWithProviders(<NotificationsPage />);

    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('sent')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    mockIsLoading = true;
    renderWithProviders(<NotificationsPage />);

    expect(screen.queryByText('Pushpa 2 Release')).not.toBeInTheDocument();
  });

  it('shows empty state when no notifications', () => {
    mockData = [];
    renderWithProviders(<NotificationsPage />);

    expect(screen.getByText('No notifications found.')).toBeInTheDocument();
  });

  it('shows bulk action buttons for non-readonly users', () => {
    renderWithProviders(<NotificationsPage />);

    expect(screen.getByText('Retry All Failed')).toBeInTheDocument();
    expect(screen.getByText('Cancel All Pending')).toBeInTheDocument();
    expect(screen.getByText('Compose')).toBeInTheDocument();
  });

  it('hides bulk action buttons for read-only users', () => {
    mockIsReadOnly = true;
    renderWithProviders(<NotificationsPage />);

    expect(screen.queryByText('Retry All Failed')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancel All Pending')).not.toBeInTheDocument();
    expect(screen.queryByText('Compose')).not.toBeInTheDocument();
  });

  it('shows filter dropdowns', () => {
    renderWithProviders(<NotificationsPage />);

    expect(screen.getByText('All Statuses')).toBeInTheDocument();
    expect(screen.getByText('All Types')).toBeInTheDocument();
  });

  it('links Compose to /notifications/compose', () => {
    renderWithProviders(<NotificationsPage />);
    const link = screen.getByText('Compose').closest('a');
    expect(link).toHaveAttribute('href', '/notifications/compose');
  });
});
