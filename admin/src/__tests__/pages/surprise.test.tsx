/**
 * Tests for SurpriseContentPage — surprise content management.
 */

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SurpriseContentPage from '@/app/(dashboard)/surprise/page';

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
  usePathname: () => '/surprise',
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

const mockSurpriseItems = [
  { id: 'surprise-1', title: 'Behind the Scenes', category: 'bts', views: 1500 },
  { id: 'surprise-2', title: 'Song Promo', category: 'song', views: 3200 },
  { id: 'surprise-3', title: 'Actor Interview', category: 'interview', views: 800 },
  { id: 'surprise-4', title: 'Unknown Category', category: 'custom', views: 100 },
];

let mockIsLoading = false;
let mockData: typeof mockSurpriseItems | null = mockSurpriseItems;

vi.mock('@/hooks/useAdminSurprise', () => ({
  useAdminSurprise: () => ({
    data: mockIsLoading ? undefined : mockData,
    isLoading: mockIsLoading,
  }),
  useDeleteSurprise: () => ({ mutate: vi.fn(), isPending: false }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('SurpriseContentPage', () => {
  beforeEach(() => {
    mockIsReadOnly = false;
    mockIsLoading = false;
    mockData = mockSurpriseItems;
  });

  it('renders surprise content table with items', () => {
    renderWithProviders(<SurpriseContentPage />);

    expect(screen.getByText('Behind the Scenes')).toBeInTheDocument();
    expect(screen.getByText('Song Promo')).toBeInTheDocument();
    expect(screen.getByText('Actor Interview')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    renderWithProviders(<SurpriseContentPage />);

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Views')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('renders category badges', () => {
    renderWithProviders(<SurpriseContentPage />);

    expect(screen.getByText('bts')).toBeInTheDocument();
    expect(screen.getByText('song')).toBeInTheDocument();
    expect(screen.getByText('interview')).toBeInTheDocument();
  });

  it('renders formatted view counts', () => {
    renderWithProviders(<SurpriseContentPage />);

    expect(screen.getByText('1,500')).toBeInTheDocument();
    expect(screen.getByText('3,200')).toBeInTheDocument();
    expect(screen.getByText('800')).toBeInTheDocument();
  });

  it('handles unknown category gracefully', () => {
    renderWithProviders(<SurpriseContentPage />);

    expect(screen.getByText('custom')).toBeInTheDocument();
    expect(screen.getByText('Unknown Category')).toBeInTheDocument();
  });

  it('shows Add Content button for non-readonly users', () => {
    renderWithProviders(<SurpriseContentPage />);
    expect(screen.getByText('Add Content')).toBeInTheDocument();
  });

  it('hides Add Content button for read-only users', () => {
    mockIsReadOnly = true;
    renderWithProviders(<SurpriseContentPage />);
    expect(screen.queryByText('Add Content')).not.toBeInTheDocument();
  });

  it('links Add Content to /surprise/new', () => {
    renderWithProviders(<SurpriseContentPage />);
    const link = screen.getByText('Add Content').closest('a');
    expect(link).toHaveAttribute('href', '/surprise/new');
  });

  it('shows loading spinner when loading', () => {
    mockIsLoading = true;
    renderWithProviders(<SurpriseContentPage />);

    expect(screen.queryByText('Behind the Scenes')).not.toBeInTheDocument();
  });

  it('shows empty state when no items', () => {
    mockData = [];
    renderWithProviders(<SurpriseContentPage />);

    expect(screen.getByText(/No surprise content found/)).toBeInTheDocument();
  });

  it('renders edit links for each item', () => {
    renderWithProviders(<SurpriseContentPage />);

    const editLinks = screen.getAllByTitle('Edit');
    expect(editLinks).toHaveLength(4);
    expect(editLinks[0].closest('a')).toHaveAttribute('href', '/surprise/surprise-1');
  });

  it('shows delete buttons for non-readonly users', () => {
    renderWithProviders(<SurpriseContentPage />);

    const deleteButtons = screen.getAllByTitle('Delete');
    expect(deleteButtons).toHaveLength(4);
  });

  it('hides delete buttons for read-only users', () => {
    mockIsReadOnly = true;
    renderWithProviders(<SurpriseContentPage />);

    expect(screen.queryByTitle('Delete')).not.toBeInTheDocument();
  });
});
