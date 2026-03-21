/**
 * Tests for FeedPage — feed management with drag-and-drop.
 */

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FeedPage from '@/app/(dashboard)/feed/page';

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
  usePathname: () => '/feed',
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
    canCreate: () => true,
    canUpdate: () => true,
    canDelete: () => true,
  }),
}));

const mockFeedItems = [
  {
    id: 'feed-1',
    type: 'news',
    title: 'New Movie Released',
    is_pinned: false,
    is_featured: true,
    display_order: 0,
    created_at: '2025-03-15T10:00:00Z',
  },
  {
    id: 'feed-2',
    type: 'update',
    title: 'Actor Interview',
    is_pinned: true,
    is_featured: false,
    display_order: 1,
    created_at: '2025-03-14T10:00:00Z',
  },
];

let mockIsLoading = false;
let mockData = mockFeedItems;

vi.mock('@/hooks/useAdminFeed', () => ({
  useAdminFeed: () => ({
    data: mockIsLoading ? undefined : mockData,
    isLoading: mockIsLoading,
  }),
  useDeleteFeedItem: () => ({ mutate: vi.fn(), isPending: false }),
  useTogglePinFeed: () => ({ mutate: vi.fn() }),
  useToggleFeatureFeed: () => ({ mutate: vi.fn() }),
  useReorderFeed: () => ({ mutate: vi.fn() }),
}));

vi.mock('@/components/feed/FeedFilterTabs', () => ({
  FeedFilterTabs: ({ selected, onChange }: { selected: string; onChange: (v: string) => void }) => (
    <div data-testid="filter-tabs">{selected}</div>
  ),
}));

vi.mock('@/components/feed/SortableFeedList', () => ({
  SortableFeedList: ({ items }: { items: Array<{ id: string; title: string }> }) => (
    <div data-testid="sortable-list">
      {items.map((item) => (
        <div key={item.id}>{item.title}</div>
      ))}
    </div>
  ),
}));

vi.mock('@/components/feed/FeedMobilePreview', () => ({
  FeedMobilePreview: () => <div data-testid="mobile-preview" />,
}));

vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: vi.fn((arr: unknown[], from: number, to: number) => {
    const result = [...arr];
    const [item] = result.splice(from, 1);
    result.splice(to, 0, item);
    return result;
  }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('FeedPage', () => {
  beforeEach(() => {
    mockIsReadOnly = false;
    mockIsLoading = false;
    mockData = mockFeedItems;
  });

  it('renders feed items', () => {
    renderWithProviders(<FeedPage />);
    expect(screen.getByText('New Movie Released')).toBeInTheDocument();
    expect(screen.getByText('Actor Interview')).toBeInTheDocument();
  });

  it('renders filter tabs', () => {
    renderWithProviders(<FeedPage />);
    expect(screen.getByTestId('filter-tabs')).toBeInTheDocument();
  });

  it('renders mobile preview', () => {
    renderWithProviders(<FeedPage />);
    expect(screen.getByTestId('mobile-preview')).toBeInTheDocument();
  });

  it('shows Add Update button for non-readonly users', () => {
    renderWithProviders(<FeedPage />);
    expect(screen.getByText('Add Update')).toBeInTheDocument();
  });

  it('hides Add Update button for read-only users', () => {
    mockIsReadOnly = true;
    renderWithProviders(<FeedPage />);
    expect(screen.queryByText('Add Update')).not.toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    mockIsLoading = true;
    renderWithProviders(<FeedPage />);
    expect(screen.queryByTestId('sortable-list')).not.toBeInTheDocument();
  });

  it('renders empty feed list when no items', () => {
    mockData = [];
    renderWithProviders(<FeedPage />);
    expect(screen.getByTestId('sortable-list')).toBeInTheDocument();
  });

  it('links Add Update to /feed/new', () => {
    renderWithProviders(<FeedPage />);
    const link = screen.getByText('Add Update').closest('a');
    expect(link).toHaveAttribute('href', '/feed/new');
  });
});
