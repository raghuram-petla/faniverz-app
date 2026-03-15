import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ComposeNotificationPage from '@/app/(dashboard)/notifications/compose/page';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';

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
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
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
  usePathname: () => '/notifications/compose',
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

vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChangesWarning: vi.fn(),
}));

vi.mock('@/hooks/useAdminNotifications', () => ({
  useCreateNotification: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));

vi.mock('@/hooks/useAdminMovies', () => ({
  useAllMovies: () => ({ data: [] }),
}));

vi.mock('@/components/notifications/MovieSearchField', () => ({
  MovieSearchField: () => <div data-testid="movie-search-field" />,
}));

vi.mock('@shared/constants', () => ({
  BROADCAST_USER_ID: '00000000-0000-0000-0000-000000000000',
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ComposeNotificationPage', () => {
  it('renders "Compose Notification" heading', () => {
    renderWithProviders(<ComposeNotificationPage />);
    expect(screen.getByText('Compose Notification')).toBeInTheDocument();
  });

  it('renders notification type dropdown', () => {
    renderWithProviders(<ComposeNotificationPage />);
    expect(screen.getByText('Select type...')).toBeInTheDocument();
  });

  it('renders title and message inputs', () => {
    renderWithProviders(<ComposeNotificationPage />);
    expect(screen.getByPlaceholderText('Notification title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Notification message body')).toBeInTheDocument();
  });

  it('calls useUnsavedChangesWarning hook', () => {
    renderWithProviders(<ComposeNotificationPage />);
    expect(useUnsavedChangesWarning).toHaveBeenCalled();
  });
});
