import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PlatformsPage from '@/app/(dashboard)/platforms/page';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
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

vi.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string) => url,
}));

const mockUseAdminPlatforms = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock('@/hooks/useAdminPlatforms', () => ({
  useAdminPlatforms: () => mockUseAdminPlatforms(),
  useDeletePlatform: () => ({ mutate: mockDeleteMutate, isPending: false }),
}));

vi.mock('@/hooks/useAdminMovieAvailability', () => ({
  useCountries: () => ({
    data: [
      { code: 'IN', name: 'India', display_order: 1 },
      { code: 'US', name: 'United States', display_order: 2 },
    ],
  }),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    isReadOnly: false,
    canDeleteTopLevel: () => true,
  }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('PlatformsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdminPlatforms.mockReturnValue({ data: [], isLoading: false });
  });

  it('renders empty state when no platforms match country', () => {
    renderWithProviders(<PlatformsPage />);
    expect(screen.getByText(/No platforms/)).toBeInTheDocument();
  });

  it('renders Add Platform button', () => {
    renderWithProviders(<PlatformsPage />);
    expect(screen.getByText('Add Platform')).toBeInTheDocument();
  });

  it('renders platform list when platforms exist for selected country', () => {
    mockUseAdminPlatforms.mockReturnValue({
      data: [
        {
          id: 'netflix',
          name: 'Netflix',
          logo: 'N',
          logo_url: null,
          color: '#E50914',
          display_order: 1,
          tmdb_provider_id: 8,
          regions: ['IN'],
        },
      ],
      isLoading: false,
    });
    renderWithProviders(<PlatformsPage />);
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText('TMDB #8')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    mockUseAdminPlatforms.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    renderWithProviders(<PlatformsPage />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows TMDB ID not set for platforms without tmdb_provider_id', () => {
    mockUseAdminPlatforms.mockReturnValue({
      data: [
        {
          id: 'custom',
          name: 'Custom',
          logo: 'C',
          logo_url: null,
          color: '#000',
          display_order: 1,
          tmdb_provider_id: null,
          regions: ['IN'],
        },
      ],
      isLoading: false,
    });
    renderWithProviders(<PlatformsPage />);
    expect(screen.getByText('TMDB ID not set')).toBeInTheDocument();
  });

  it('renders platform count text', () => {
    mockUseAdminPlatforms.mockReturnValue({
      data: [
        {
          id: 'p1',
          name: 'P1',
          logo: 'P',
          logo_url: null,
          color: '#000',
          display_order: 1,
          tmdb_provider_id: null,
          regions: ['IN'],
        },
        {
          id: 'p2',
          name: 'P2',
          logo: 'P',
          logo_url: null,
          color: '#000',
          display_order: 2,
          tmdb_provider_id: null,
          regions: ['IN'],
        },
      ],
      isLoading: false,
    });
    renderWithProviders(<PlatformsPage />);
    expect(screen.getByText('2 platforms')).toBeInTheDocument();
  });

  it('renders edit links for each platform', () => {
    mockUseAdminPlatforms.mockReturnValue({
      data: [
        {
          id: 'netflix',
          name: 'Netflix',
          logo: 'N',
          logo_url: null,
          color: '#E50914',
          display_order: 1,
          tmdb_provider_id: 8,
          regions: ['IN'],
        },
      ],
      isLoading: false,
    });
    renderWithProviders(<PlatformsPage />);
    const editLink = screen.getByTitle('Edit platform');
    expect(editLink).toHaveAttribute('href', '/platforms/netflix');
  });
});
