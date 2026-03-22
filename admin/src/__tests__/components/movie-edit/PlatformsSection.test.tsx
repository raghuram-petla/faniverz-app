import { render, screen, fireEvent } from '@testing-library/react';
import { PlatformsSection } from '@/components/movie-edit/PlatformsSection';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

vi.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string) => url,
}));

vi.mock('@shared/colors', () => ({
  colors: { zinc900: '#18181B' },
}));

const mockAddMutate = vi.fn();
const mockRemoveMutate = vi.fn();

vi.mock('@/hooks/useAdminPlatforms', () => ({
  useAdminPlatforms: () => ({
    data: [
      {
        id: 'netflix',
        name: 'Netflix',
        logo: 'N',
        logo_url: null,
        color: '#E50914',
        display_order: 1,
        regions: ['IN'],
      },
      {
        id: 'prime',
        name: 'Amazon Prime',
        logo: 'P',
        logo_url: null,
        color: '#00A8E1',
        display_order: 2,
        regions: ['IN'],
      },
    ],
  }),
}));

const mockUseMovieAvailability = vi.fn();

vi.mock('@/hooks/useAdminMovieAvailability', () => ({
  useMovieAvailability: () => mockUseMovieAvailability(),
  useCountries: () => ({
    data: [
      { code: 'IN', name: 'India', display_order: 1 },
      { code: 'US', name: 'United States', display_order: 2 },
    ],
  }),
  useAddMovieAvailability: () => ({ mutate: mockAddMutate }),
  useRemoveMovieAvailability: () => ({ mutate: mockRemoveMutate }),
}));

const mockUsePermissions = vi.fn();
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => mockUsePermissions(),
}));

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('PlatformsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePermissions.mockReturnValue({ isReadOnly: false });
    mockUseMovieAvailability.mockReturnValue({ data: [] });
  });

  it('renders without crashing when no availability', () => {
    renderWithProviders(<PlatformsSection movieId="movie-1" />);
    expect(document.querySelector('[class*="space-y"]')).toBeInTheDocument();
  });

  it('renders "Add Country" button when not read-only', () => {
    renderWithProviders(<PlatformsSection movieId="movie-1" />);
    expect(screen.getByText('Add Country')).toBeInTheDocument();
  });

  it('hides "Add Country" button when read-only', () => {
    mockUsePermissions.mockReturnValue({ isReadOnly: true });
    renderWithProviders(<PlatformsSection movieId="movie-1" />);
    expect(screen.queryByText('Add Country')).not.toBeInTheDocument();
  });

  it('shows empty state message when no availability data', () => {
    renderWithProviders(<PlatformsSection movieId="movie-1" />);
    expect(screen.getByText(/No OTT availability data/)).toBeInTheDocument();
  });

  it('renders country dropdown when availability data exists', () => {
    mockUseMovieAvailability.mockReturnValue({
      data: [
        {
          id: 'a1',
          movie_id: 'movie-1',
          platform_id: 'netflix',
          country_code: 'IN',
          availability_type: 'flatrate',
          available_from: null,
          streaming_url: null,
          tmdb_display_priority: null,
          created_at: '2024-01-01',
          platform: {
            id: 'netflix',
            name: 'Netflix',
            logo: 'N',
            logo_url: null,
            color: '#E50914',
            display_order: 1,
          },
        },
      ],
    });
    renderWithProviders(<PlatformsSection movieId="movie-1" />);
    // Should show country selector and platform data
    expect(screen.getByText('Netflix')).toBeInTheDocument();
  });

  it('renders "Add platform" button inside CountryAvailabilityPanel', () => {
    mockUseMovieAvailability.mockReturnValue({
      data: [
        {
          id: 'a1',
          movie_id: 'movie-1',
          platform_id: 'netflix',
          country_code: 'IN',
          availability_type: 'flatrate',
          available_from: null,
          streaming_url: null,
          tmdb_display_priority: null,
          created_at: '2024-01-01',
          platform: {
            id: 'netflix',
            name: 'Netflix',
            logo: 'N',
            logo_url: null,
            color: '#E50914',
            display_order: 1,
          },
        },
      ],
    });
    renderWithProviders(<PlatformsSection movieId="movie-1" />);
    expect(screen.getByText('Add platform')).toBeInTheDocument();
  });
});
