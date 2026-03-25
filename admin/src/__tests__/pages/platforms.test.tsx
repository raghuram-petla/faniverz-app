import { render, screen, fireEvent } from '@testing-library/react';
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

const mockGetImageUrl = vi.fn((url: string) => url);
vi.mock('@shared/imageUrl', () => ({
  getImageUrl: (...args: unknown[]) => mockGetImageUrl(...(args as [string])),
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

  it('renders platform logo when logo_url is provided', () => {
    mockUseAdminPlatforms.mockReturnValue({
      data: [
        {
          id: 'aha',
          name: 'aha',
          logo: 'A',
          logo_url: 'https://r2.dev/aha.png',
          color: '#000',
          display_order: 1,
          tmdb_provider_id: null,
          regions: ['IN'],
        },
      ],
      isLoading: false,
    });
    renderWithProviders(<PlatformsPage />);
    const img = screen.getByAltText('aha');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://r2.dev/aha.png');
  });

  it('shows singular "platform" text for 1 platform', () => {
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
      ],
      isLoading: false,
    });
    renderWithProviders(<PlatformsPage />);
    expect(screen.getByText('1 platform')).toBeInTheDocument();
  });

  it('calls delete mutation when delete button clicked and confirmed', () => {
    window.confirm = vi.fn().mockReturnValue(true);
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
    fireEvent.click(screen.getByTitle('Delete platform'));
    expect(mockDeleteMutate).toHaveBeenCalledWith('netflix');
  });

  it('does not delete when confirm is cancelled', () => {
    window.confirm = vi.fn().mockReturnValue(false);
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
    fireEvent.click(screen.getByTitle('Delete platform'));
    expect(mockDeleteMutate).not.toHaveBeenCalled();
  });

  it('handles platforms with null regions gracefully', () => {
    mockUseAdminPlatforms.mockReturnValue({
      data: [
        {
          id: 'no-regions',
          name: 'No Regions',
          logo: 'N',
          logo_url: null,
          color: '#000',
          display_order: 1,
          tmdb_provider_id: null,
          regions: null,
        },
      ],
      isLoading: false,
    });
    renderWithProviders(<PlatformsPage />);
    // Should not crash and platform should not match any country
    expect(screen.getByText(/No platforms/)).toBeInTheDocument();
  });

  it('renders fallback when getImageUrl returns null', () => {
    mockGetImageUrl.mockReturnValue(null as unknown as string);
    mockUseAdminPlatforms.mockReturnValue({
      data: [
        {
          id: 'logo-test',
          name: 'Logo Test',
          logo: 'L',
          logo_url: 'https://original.com/logo.png',
          color: '#000',
          display_order: 1,
          tmdb_provider_id: null,
          regions: ['IN'],
        },
      ],
      isLoading: false,
    });
    renderWithProviders(<PlatformsPage />);
    const img = screen.getByAltText('Logo Test');
    // Falls back to the original logo_url
    expect(img).toHaveAttribute('src', 'https://original.com/logo.png');
  });

  it('includes country query param in Add Platform link', () => {
    renderWithProviders(<PlatformsPage />);
    const addLink = screen.getByText('Add Platform').closest('a');
    expect(addLink).toHaveAttribute('href', '/platforms/new?country=IN');
  });
});
