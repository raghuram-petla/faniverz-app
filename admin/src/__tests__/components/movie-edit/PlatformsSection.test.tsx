import { render, screen, fireEvent } from '@testing-library/react';
import { PlatformsSection } from '@/components/movie-edit/PlatformsSection';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { MoviePlatformAvailability, OTTPlatform } from '@shared/types';

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

vi.mock('@shared/imageUrl', () => ({ getImageUrl: (url: string) => url }));
vi.mock('@shared/colors', () => ({ colors: { zinc900: '#18181B' } }));

const mockPlatforms: OTTPlatform[] = [
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
    regions: ['IN', 'US'],
  },
];

vi.mock('@/hooks/useAdminPlatforms', () => ({
  useAdminPlatforms: () => ({ data: mockPlatforms }),
}));

vi.mock('@/hooks/useAdminMovieAvailability', () => ({
  useCountries: () => ({
    data: [
      { code: 'IN', name: 'India', display_order: 1 },
      { code: 'US', name: 'United States', display_order: 2 },
    ],
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPanel = vi.fn((_props?: any) => <div data-testid="country-panel" />);
vi.mock('@/components/movie-edit/CountryAvailabilityPanel', () => ({
  CountryAvailabilityPanel: (props: Record<string, unknown>) => {
    mockPanel(props);
    return <div data-testid="country-panel" />;
  },
}));

vi.mock('@/components/common/CountryDropdown', () => ({
  CountryDropdown: ({
    countries,
    value,
    onChange,
    formatLabel,
  }: {
    countries: { code: string; name: string; display_order: number }[];
    value: string;
    onChange: (code: string) => void;
    formatLabel: (c: { code: string; name: string }) => string;
  }) => (
    <div data-testid="country-dropdown">
      {countries.map((c) => (
        <button key={c.code} onClick={() => onChange(c.code)}>
          {formatLabel(c)}
        </button>
      ))}
      <span data-testid="active-country">{value}</span>
    </div>
  ),
}));

vi.mock('@/components/common/MultiCountrySelector', () => ({
  MultiCountrySelector: () => <div data-testid="multi-country-selector" />,
}));

vi.mock('@/components/common/FormField', () => ({
  INPUT_CLASSES: { compact: 'compact-class' },
}));

vi.mock('@/components/common/Button', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

const mockUsePermissions = vi.fn();
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => mockUsePermissions(),
}));

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

function makeAvailability(
  overrides: Partial<MoviePlatformAvailability> = {},
): MoviePlatformAvailability {
  return {
    id: 'a1',
    movie_id: 'movie-1',
    platform_id: 'netflix',
    country_code: 'IN',
    availability_type: 'flatrate',
    available_from: null,
    streaming_url: null,
    tmdb_display_priority: null,
    created_at: '2024-01-01',
    platform: mockPlatforms[0],
    ...overrides,
  };
}

const defaultProps = {
  visibleAvailability: [] as MoviePlatformAvailability[],
  pendingIds: new Set<string>(),
  showAddForm: false,
  onCloseAddForm: vi.fn(),
  onAdd: vi.fn(),
  onRemove: vi.fn(),
};

describe('PlatformsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePermissions.mockReturnValue({ isReadOnly: false });
  });

  it('shows empty state when no availability and add form closed', () => {
    renderWithProviders(<PlatformsSection {...defaultProps} />);
    expect(screen.getByText(/No OTT availability data/)).toBeInTheDocument();
  });

  it('renders country dropdown when availability exists', () => {
    renderWithProviders(
      <PlatformsSection {...defaultProps} visibleAvailability={[makeAvailability()]} />,
    );
    expect(screen.getByTestId('country-dropdown')).toBeInTheDocument();
  });

  it('renders CountryAvailabilityPanel with active rows', () => {
    const availability = [makeAvailability()];
    renderWithProviders(<PlatformsSection {...defaultProps} visibleAvailability={availability} />);
    expect(screen.getByTestId('country-panel')).toBeInTheDocument();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastCall = (mockPanel.mock.calls as any[]).at(-1)?.[0];
    expect(lastCall.rows).toEqual(availability);
  });

  it('shows add form with multi-country selector when showAddForm is true', () => {
    renderWithProviders(<PlatformsSection {...defaultProps} showAddForm={true} />);
    expect(screen.getByTestId('multi-country-selector')).toBeInTheDocument();
    expect(screen.getByText('Select platform…')).toBeInTheDocument();
  });

  it('hides add form when showAddForm is false', () => {
    renderWithProviders(<PlatformsSection {...defaultProps} showAddForm={false} />);
    expect(screen.queryByTestId('multi-country-selector')).not.toBeInTheDocument();
  });

  it('hides add form when read-only even if showAddForm is true', () => {
    mockUsePermissions.mockReturnValue({ isReadOnly: true });
    renderWithProviders(<PlatformsSection {...defaultProps} showAddForm={true} />);
    expect(screen.queryByTestId('multi-country-selector')).not.toBeInTheDocument();
  });

  it('calls onCloseAddForm when Cancel is clicked', () => {
    const onCloseAddForm = vi.fn();
    renderWithProviders(
      <PlatformsSection {...defaultProps} showAddForm={true} onCloseAddForm={onCloseAddForm} />,
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCloseAddForm).toHaveBeenCalled();
  });

  it('shows country label with count in dropdown', () => {
    const availability = [
      makeAvailability({ id: 'a1' }),
      makeAvailability({ id: 'a2', platform_id: 'prime' }),
    ];
    renderWithProviders(<PlatformsSection {...defaultProps} visibleAvailability={availability} />);
    expect(screen.getByText('India (2)')).toBeInTheDocument();
  });

  it('switches country when dropdown option is clicked', () => {
    const availability = [
      makeAvailability({ id: 'a1', country_code: 'IN' }),
      makeAvailability({ id: 'a2', country_code: 'US', platform_id: 'prime' }),
    ];
    renderWithProviders(<PlatformsSection {...defaultProps} visibleAvailability={availability} />);
    fireEvent.click(screen.getByText('United States (1)'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastCall = (mockPanel.mock.calls as any[]).at(-1)?.[0];
    expect(lastCall.rows).toEqual([availability[1]]);
  });

  it('disables Add button when no platform or no countries selected', () => {
    renderWithProviders(<PlatformsSection {...defaultProps} showAddForm={true} />);
    expect(screen.getByText('Add')).toBeDisabled();
  });
});
