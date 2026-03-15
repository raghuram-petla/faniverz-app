import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EditFeedItemPage from '@/app/(dashboard)/feed/[id]/page';
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
  usePathname: () => '/feed/1',
  useParams: () => ({ id: '1' }),
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

vi.mock('@/hooks/useAdminFeed', () => ({
  useAdminFeedItem: vi.fn(),
  useUpdateFeedItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteFeedItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { useAdminFeedItem } from '@/hooks/useAdminFeed';

const mockedUseAdminFeedItem = vi.mocked(useAdminFeedItem);

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('EditFeedItemPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading spinner when loading', () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    const { container } = renderWithProviders(<EditFeedItemPage />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders "Edit Feed Item" heading when data is loaded', async () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: {
        id: '1',
        title: 'Test Feed',
        description: 'desc',
        is_pinned: false,
        is_featured: false,
        feed_type: 'update',
        content_type: 'update',
        youtube_id: null,
        thumbnail_url: null,
        source_table: null,
        movie: null,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => {
      expect(screen.getByText('Edit Feed Item')).toBeInTheDocument();
    });
  });

  it('renders title input with loaded value', async () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: {
        id: '1',
        title: 'Test Feed',
        description: 'desc',
        is_pinned: false,
        is_featured: false,
        feed_type: 'update',
        content_type: 'update',
        youtube_id: null,
        thumbnail_url: null,
        source_table: null,
        movie: null,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Feed')).toBeInTheDocument();
    });
  });

  it('calls useUnsavedChangesWarning hook', () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: {
        id: '1',
        title: 'Test Feed',
        description: 'desc',
        is_pinned: false,
        is_featured: false,
        feed_type: 'update',
        content_type: 'update',
        youtube_id: null,
        thumbnail_url: null,
        source_table: null,
        movie: null,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    expect(useUnsavedChangesWarning).toHaveBeenCalled();
  });
});
