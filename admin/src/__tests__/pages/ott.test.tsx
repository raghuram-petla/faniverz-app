import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OttReleasesPage from '@/app/(dashboard)/ott/page';

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
      in: vi.fn().mockReturnThis(),
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
  usePathname: () => '/ott',
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

const mockRelease = {
  movie_id: 'movie-id',
  platform_id: 'platform-id',
  available_from: '2026-04-01',
  streaming_url: 'https://example.com/watch',
  movie: { id: 'movie-id', title: 'Test Movie', poster_url: null },
  platform: { id: 'platform-id', name: 'aha', color: '#FF5722', logo: 'a', logo_url: null },
};

vi.mock('@/hooks/useAdminOtt', () => ({
  useAdminOttReleases: vi.fn(),
  useDeleteOttRelease: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

import { useAdminOttReleases } from '@/hooks/useAdminOtt';

const mockedUseAdminOttReleases = vi.mocked(useAdminOttReleases);

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('OttReleasesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseAdminOttReleases.mockReturnValue({
      data: [mockRelease],
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAdminOttReleases>);
  });

  it('renders "Add Release" button', () => {
    renderWithProviders(<OttReleasesPage />);
    expect(screen.getByText('Add Release')).toBeInTheDocument();
  });

  it('shows movie title in the table', () => {
    renderWithProviders(<OttReleasesPage />);
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
  });

  it('shows platform name in the table', () => {
    renderWithProviders(<OttReleasesPage />);
    expect(screen.getByText('aha')).toBeInTheDocument();
  });

  it('shows available_from date in the table', () => {
    renderWithProviders(<OttReleasesPage />);
    expect(screen.getByText('2026-04-01')).toBeInTheDocument();
  });

  it('renders edit link with Pencil icon for each release', () => {
    renderWithProviders(<OttReleasesPage />);
    const editLink = screen.getByTitle('Edit');
    expect(editLink).toBeInTheDocument();
    expect(editLink).toHaveAttribute('href', '/ott/movie-id~platform-id');
    expect(editLink.tagName).toBe('A');
  });

  it('renders delete button for each release', () => {
    renderWithProviders(<OttReleasesPage />);
    expect(screen.getByTitle('Delete release')).toBeInTheDocument();
  });

  it('shows empty state when no releases exist', () => {
    mockedUseAdminOttReleases.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useAdminOttReleases>);

    renderWithProviders(<OttReleasesPage />);
    expect(screen.getByText('No OTT releases found. Add one to get started.')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    mockedUseAdminOttReleases.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as ReturnType<typeof useAdminOttReleases>);

    const { container } = renderWithProviders(<OttReleasesPage />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows "Live now" when available_from is null', () => {
    mockedUseAdminOttReleases.mockReturnValue({
      data: [{ ...mockRelease, available_from: null }],
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAdminOttReleases>);

    renderWithProviders(<OttReleasesPage />);
    expect(screen.getByText('Live now')).toBeInTheDocument();
  });
});
