import { render, screen } from '@testing-library/react';
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

vi.mock('@/hooks/useAdminPlatforms', () => ({
  useAdminPlatforms: () => ({ data: [] }),
}));

vi.mock('@/hooks/useAdminMovieAvailability', () => ({
  useMovieAvailability: () => ({ data: [] }),
  useCountries: () => ({ data: [{ code: 'IN', name: 'India', display_order: 1 }] }),
  useAddMovieAvailability: () => ({ mutate: vi.fn() }),
  useRemoveMovieAvailability: () => ({ mutate: vi.fn() }),
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

describe('PlatformsSection', () => {
  it('renders country tabs area', () => {
    renderWithProviders(<PlatformsSection movieId="movie-1" />);
    // Should render without crashing — no platforms, no country tabs shown
    expect(document.querySelector('[class*="space-y"]')).toBeInTheDocument();
  });

  it('renders add platform button when not read-only', () => {
    renderWithProviders(<PlatformsSection movieId="movie-1" />);
    expect(screen.getByText('Add platform')).toBeInTheDocument();
  });
});
