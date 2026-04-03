/**
 * Tests for NotificationsPage — notification management.
 */

import { render, screen, fireEvent } from '@testing-library/react';
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
  {
    id: 'notif-4',
    type: 'reminder',
    title: 'Reminder notification',
    status: 'cancelled',
    scheduled_for: '2025-03-17T10:00:00Z',
  },
];

let mockIsLoading = false;
let mockData: typeof mockNotifications | null = mockNotifications;

const mockCancelMutate = vi.fn();
const mockRetryMutate = vi.fn();
const mockBulkRetryMutate = vi.fn();
const mockBulkCancelMutate = vi.fn();

vi.mock('@/hooks/useAdminNotifications', () => ({
  useAdminNotifications: () => ({
    data: mockIsLoading ? undefined : mockData,
    isLoading: mockIsLoading,
  }),
  useCancelNotification: () => ({ mutate: mockCancelMutate, isPending: false }),
  useRetryNotification: () => ({ mutate: mockRetryMutate, isPending: false }),
  useBulkRetryFailed: () => ({ mutate: mockBulkRetryMutate, isPending: false }),
  useBulkCancelPending: () => ({ mutate: mockBulkCancelMutate, isPending: false }),
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
    vi.clearAllMocks();
    mockIsReadOnly = false;
    mockIsLoading = false;
    mockData = mockNotifications;
  });

  describe('rendering', () => {
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
      expect(screen.getByText('reminder')).toBeInTheDocument();
    });

    it('shows status badges', () => {
      renderWithProviders(<NotificationsPage />);
      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('sent')).toBeInTheDocument();
      expect(screen.getByText('failed')).toBeInTheDocument();
      expect(screen.getByText('cancelled')).toBeInTheDocument();
    });

    it('shows cancel button only for pending notifications', () => {
      renderWithProviders(<NotificationsPage />);
      // Cancel button (XCircle) only for pending
      const cancelButtons = screen.getAllByTitle('Cancel');
      expect(cancelButtons).toHaveLength(1);
    });

    it('shows retry button only for failed notifications', () => {
      renderWithProviders(<NotificationsPage />);
      const retryButtons = screen.getAllByTitle('Retry');
      expect(retryButtons).toHaveLength(1);
    });
  });

  describe('loading state', () => {
    it('shows loading spinner when loading', () => {
      mockIsLoading = true;
      const { container } = renderWithProviders(<NotificationsPage />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
      expect(screen.queryByText('Pushpa 2 Release')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty state when no notifications', () => {
      mockData = [];
      renderWithProviders(<NotificationsPage />);
      expect(screen.getByText('No notifications found.')).toBeInTheDocument();
    });

    it('shows empty state when data is null', () => {
      mockData = null;
      renderWithProviders(<NotificationsPage />);
      expect(screen.getByText('No notifications found.')).toBeInTheDocument();
    });
  });

  describe('bulk action buttons', () => {
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

    it('links Compose to /notifications/compose', () => {
      renderWithProviders(<NotificationsPage />);
      const link = screen.getByText('Compose').closest('a');
      expect(link).toHaveAttribute('href', '/notifications/compose');
    });
  });

  describe('filter dropdowns', () => {
    it('shows filter dropdowns', () => {
      renderWithProviders(<NotificationsPage />);
      expect(screen.getByText('All Statuses')).toBeInTheDocument();
      expect(screen.getByText('All Types')).toBeInTheDocument();
    });

    it('renders status filter options', () => {
      renderWithProviders(<NotificationsPage />);
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Sent')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });

    it('renders type filter options', () => {
      renderWithProviders(<NotificationsPage />);
      expect(screen.getByText('Release')).toBeInTheDocument();
      expect(screen.getByText('Watchlist')).toBeInTheDocument();
      expect(screen.getByText('Trending')).toBeInTheDocument();
      expect(screen.getByText('Reminder')).toBeInTheDocument();
    });
  });

  describe('handleCancel', () => {
    it('calls cancelNotification.mutate when confirm returns true', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      renderWithProviders(<NotificationsPage />);
      fireEvent.click(screen.getByTitle('Cancel'));
      expect(mockCancelMutate).toHaveBeenCalledWith(
        'notif-1',
        expect.objectContaining({ onError: expect.any(Function) }),
      );
    });

    it('does not call cancelNotification.mutate when confirm returns false', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      renderWithProviders(<NotificationsPage />);
      fireEvent.click(screen.getByTitle('Cancel'));
      expect(mockCancelMutate).not.toHaveBeenCalled();
    });

    it('alerts on cancel error', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.spyOn(window, 'alert').mockImplementation(() => {});
      renderWithProviders(<NotificationsPage />);
      fireEvent.click(screen.getByTitle('Cancel'));
      const { onError } = mockCancelMutate.mock.calls[0][1];
      onError(new Error('cancel failed'));
      expect(window.alert).toHaveBeenCalledWith('cancel failed');
    });
  });

  describe('handleRetry', () => {
    it('calls retryNotification.mutate on retry button click', () => {
      renderWithProviders(<NotificationsPage />);
      fireEvent.click(screen.getByTitle('Retry'));
      expect(mockRetryMutate).toHaveBeenCalledWith(
        'notif-3',
        expect.objectContaining({ onError: expect.any(Function) }),
      );
    });

    it('alerts on retry error', () => {
      vi.spyOn(window, 'alert').mockImplementation(() => {});
      renderWithProviders(<NotificationsPage />);
      fireEvent.click(screen.getByTitle('Retry'));
      const { onError } = mockRetryMutate.mock.calls[0][1];
      onError(new Error('retry failed'));
      expect(window.alert).toHaveBeenCalledWith('retry failed');
    });
  });

  describe('handleBulkRetry', () => {
    it('calls bulkRetry.mutate when confirm returns true', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      renderWithProviders(<NotificationsPage />);
      fireEvent.click(screen.getByText('Retry All Failed'));
      expect(mockBulkRetryMutate).toHaveBeenCalled();
    });

    it('does not call bulkRetry.mutate when confirm returns false', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      renderWithProviders(<NotificationsPage />);
      fireEvent.click(screen.getByText('Retry All Failed'));
      expect(mockBulkRetryMutate).not.toHaveBeenCalled();
    });

    it('alerts on bulk retry error', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.spyOn(window, 'alert').mockImplementation(() => {});
      renderWithProviders(<NotificationsPage />);
      fireEvent.click(screen.getByText('Retry All Failed'));
      const { onError } = mockBulkRetryMutate.mock.calls[0][1];
      onError(new Error('bulk retry failed'));
      expect(window.alert).toHaveBeenCalledWith('bulk retry failed');
    });
  });

  describe('handleBulkCancel', () => {
    it('calls bulkCancel.mutate when confirm returns true', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      renderWithProviders(<NotificationsPage />);
      fireEvent.click(screen.getByText('Cancel All Pending'));
      expect(mockBulkCancelMutate).toHaveBeenCalled();
    });

    it('does not call bulkCancel.mutate when confirm returns false', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      renderWithProviders(<NotificationsPage />);
      fireEvent.click(screen.getByText('Cancel All Pending'));
      expect(mockBulkCancelMutate).not.toHaveBeenCalled();
    });

    it('alerts on bulk cancel error', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.spyOn(window, 'alert').mockImplementation(() => {});
      renderWithProviders(<NotificationsPage />);
      fireEvent.click(screen.getByText('Cancel All Pending'));
      const { onError } = mockBulkCancelMutate.mock.calls[0][1];
      onError(new Error('bulk cancel failed'));
      expect(window.alert).toHaveBeenCalledWith('bulk cancel failed');
    });
  });

  describe('unknown status/type fallback', () => {
    it('falls back to cancelled style for unknown status', () => {
      mockData = [
        {
          id: 'notif-unknown-status',
          type: 'release',
          title: 'Unknown Status Notif',
          status: 'custom_status',
          scheduled_for: '2025-03-20T10:00:00Z',
        },
      ];
      renderWithProviders(<NotificationsPage />);
      expect(screen.getByText('custom_status')).toBeInTheDocument();
    });

    it('falls back to release style for unknown type', () => {
      mockData = [
        {
          id: 'notif-unknown-type',
          type: 'custom_type',
          title: 'Unknown Type Notif',
          status: 'sent',
          scheduled_for: '2025-03-20T10:00:00Z',
        },
      ];
      renderWithProviders(<NotificationsPage />);
      expect(screen.getByText('custom_type')).toBeInTheDocument();
    });
  });

  describe('no actions for sent/cancelled status', () => {
    it('shows no action buttons for sent notifications', () => {
      mockData = [
        {
          id: 'notif-sent',
          type: 'release',
          title: 'Sent Notif',
          status: 'sent',
          scheduled_for: '2025-03-20T10:00:00Z',
        },
      ];
      renderWithProviders(<NotificationsPage />);
      expect(screen.queryByTitle('Cancel')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Retry')).not.toBeInTheDocument();
    });

    it('shows no action buttons for cancelled notifications', () => {
      mockData = [
        {
          id: 'notif-cancelled',
          type: 'release',
          title: 'Cancelled Notif',
          status: 'cancelled',
          scheduled_for: '2025-03-20T10:00:00Z',
        },
      ];
      renderWithProviders(<NotificationsPage />);
      expect(screen.queryByTitle('Cancel')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Retry')).not.toBeInTheDocument();
    });
  });

  describe('status filter interaction', () => {
    it('updates statusFilter when dropdown changes', () => {
      renderWithProviders(<NotificationsPage />);
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: 'pending' } });
      // No error means filter state updated correctly
      expect(selects[0]).toHaveValue('pending');
    });

    it('updates typeFilter when dropdown changes', () => {
      renderWithProviders(<NotificationsPage />);
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[1], { target: { value: 'release' } });
      expect(selects[1]).toHaveValue('release');
    });
  });
});
