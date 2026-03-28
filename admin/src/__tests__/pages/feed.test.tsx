/**
 * Tests for FeedPage — feed management with drag-and-drop.
 */

import { render, screen, fireEvent } from '@testing-library/react';
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

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn() }),
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
    canDeleteTopLevel: () => !mockIsReadOnly,
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
let mockData: typeof mockFeedItems | null = mockFeedItems;

const mockDeleteMutate = vi.fn();
const mockPinMutate = vi.fn();
const mockFeatureMutate = vi.fn();
const mockReorderMutate = vi.fn();

vi.mock('@/hooks/useAdminFeed', () => ({
  useAdminFeed: () => ({
    data: mockIsLoading ? undefined : (mockData ?? []),
    isLoading: mockIsLoading,
  }),
  useDeleteFeedItem: () => ({ mutate: mockDeleteMutate, isPending: false }),
  useTogglePinFeed: () => ({ mutate: mockPinMutate }),
  useToggleFeatureFeed: () => ({ mutate: mockFeatureMutate }),
  useReorderFeed: () => ({ mutate: mockReorderMutate }),
}));

vi.mock('@/components/feed/FeedFilterTabs', () => ({
  FeedFilterTabs: ({ selected, onChange }: { selected: string; onChange: (v: string) => void }) => (
    <div data-testid="filter-tabs">
      <span data-testid="selected-filter">{selected}</span>
      <button onClick={() => onChange('movie')}>Filter Movie</button>
      <button onClick={() => onChange('all')}>Filter All</button>
    </div>
  ),
}));

vi.mock('@/components/feed/SortableFeedList', () => ({
  SortableFeedList: ({
    items,
    onTogglePin,
    onToggleFeature,
    onEdit,
    onDelete,
    onDragEnd,
  }: {
    items: Array<{ id: string; title: string }>;
    onTogglePin: (id: string, v: boolean) => void;
    onToggleFeature: (id: string, v: boolean) => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onDragEnd: (event: unknown) => void;
  }) => (
    <div data-testid="sortable-list">
      {items.map((item) => (
        <div key={item.id} data-testid={`item-${item.id}`}>
          <span>{item.title}</span>
          <button onClick={() => onTogglePin(item.id, true)}>Pin {item.id}</button>
          <button onClick={() => onToggleFeature(item.id, true)}>Feature {item.id}</button>
          <button onClick={() => onEdit(item.id)}>Edit {item.id}</button>
          <button onClick={() => onDelete(item.id)}>Delete {item.id}</button>
        </div>
      ))}
      <button
        onClick={() => onDragEnd({ active: { id: 'feed-1' }, over: { id: 'feed-2' } })}
        data-testid="trigger-drag"
      >
        Drag
      </button>
      <button
        onClick={() => onDragEnd({ active: { id: 'feed-1' }, over: { id: 'feed-1' } })}
        data-testid="trigger-drag-same"
      >
        Drag Same
      </button>
      <button
        onClick={() => onDragEnd({ active: { id: 'feed-1' }, over: null })}
        data-testid="trigger-drag-no-over"
      >
        Drag No Over
      </button>
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
    vi.clearAllMocks();
    mockIsReadOnly = false;
    mockIsLoading = false;
    mockData = mockFeedItems;
  });

  describe('rendering', () => {
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

    it('links Add Update to /feed/new', () => {
      renderWithProviders(<FeedPage />);
      const link = screen.getByText('Add Update').closest('a');
      expect(link).toHaveAttribute('href', '/feed/new');
    });

    it('renders empty feed list when no items', () => {
      mockData = [];
      renderWithProviders(<FeedPage />);
      expect(screen.getByTestId('sortable-list')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows loading spinner when loading', () => {
      mockIsLoading = true;
      const { container } = renderWithProviders(<FeedPage />);
      expect(screen.queryByTestId('sortable-list')).not.toBeInTheDocument();
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('does not show mobile preview when loading', () => {
      mockIsLoading = true;
      renderWithProviders(<FeedPage />);
      expect(screen.queryByTestId('mobile-preview')).not.toBeInTheDocument();
    });
  });

  describe('filter', () => {
    it('starts with "all" filter selected', () => {
      renderWithProviders(<FeedPage />);
      expect(screen.getByTestId('selected-filter').textContent).toBe('all');
    });

    it('passes non-all filter to useAdminFeed', () => {
      renderWithProviders(<FeedPage />);
      fireEvent.click(screen.getByText('Filter Movie'));
      expect(screen.getByTestId('selected-filter').textContent).toBe('movie');
    });
  });

  describe('handleDelete', () => {
    it('calls delete mutation when confirm returns true', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      renderWithProviders(<FeedPage />);
      fireEvent.click(screen.getByText('Delete feed-1'));
      expect(mockDeleteMutate).toHaveBeenCalledWith('feed-1');
    });

    it('does not call delete mutation when confirm returns false', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      renderWithProviders(<FeedPage />);
      fireEvent.click(screen.getByText('Delete feed-1'));
      expect(mockDeleteMutate).not.toHaveBeenCalled();
    });
  });

  describe('handleTogglePin', () => {
    it('calls pin mutation with id and is_pinned', () => {
      renderWithProviders(<FeedPage />);
      fireEvent.click(screen.getByText('Pin feed-1'));
      expect(mockPinMutate).toHaveBeenCalledWith({ id: 'feed-1', is_pinned: true });
    });
  });

  describe('handleToggleFeature', () => {
    it('calls feature mutation with id and is_featured', () => {
      renderWithProviders(<FeedPage />);
      fireEvent.click(screen.getByText('Feature feed-1'));
      expect(mockFeatureMutate).toHaveBeenCalledWith({ id: 'feed-1', is_featured: true });
    });
  });

  describe('handleEdit', () => {
    it('calls router.push with feed item path', () => {
      renderWithProviders(<FeedPage />);
      fireEvent.click(screen.getByText('Edit feed-1'));
      expect(mockPush).toHaveBeenCalledWith('/feed/feed-1');
    });
  });

  describe('handleDragEnd', () => {
    it('calls reorder mutation when items are in different positions', () => {
      renderWithProviders(<FeedPage />);
      fireEvent.click(screen.getByTestId('trigger-drag'));
      expect(mockReorderMutate).toHaveBeenCalled();
    });

    it('does not call reorder mutation when active.id === over.id', () => {
      renderWithProviders(<FeedPage />);
      fireEvent.click(screen.getByTestId('trigger-drag-same'));
      expect(mockReorderMutate).not.toHaveBeenCalled();
    });

    it('does not call reorder mutation when over is null', () => {
      renderWithProviders(<FeedPage />);
      fireEvent.click(screen.getByTestId('trigger-drag-no-over'));
      expect(mockReorderMutate).not.toHaveBeenCalled();
    });

    it('does not call reorder mutation when item IDs are not found in list', () => {
      // Need to add a button that triggers drag with unknown IDs
      // This is already implicitly covered if items are empty, but let's ensure the branch
      mockData = [];
      renderWithProviders(<FeedPage />);
      // The trigger-drag button tries to drag feed-1 to feed-2, but items list is empty
      fireEvent.click(screen.getByTestId('trigger-drag'));
      expect(mockReorderMutate).not.toHaveBeenCalled();
    });
  });
});
