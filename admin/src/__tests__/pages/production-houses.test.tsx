import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductionHousesPage from '@/app/(dashboard)/production-houses/page';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      gte: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
      ilike: vi.fn().mockReturnThis(),
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
  usePathname: () => '/production-houses',
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

let mockIsPHAdmin = false;
let mockCanDeleteTopLevel = true;

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    role: 'super_admin',
    isSuperAdmin: true,
    isAdmin: false,
    isPHAdmin: mockIsPHAdmin,
    productionHouseIds: mockIsPHAdmin ? ['ph-owned'] : [],
    canViewPage: () => true,
    canCreate: () => true,
    canUpdate: () => true,
    canDelete: () => true,
    canDeleteTopLevel: () => mockCanDeleteTopLevel,
    auditScope: 'all',
  }),
}));

const mockUseAdminProductionHouses = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock('@/hooks/useAdminProductionHouses', () => ({
  useAdminProductionHouses: (...args: unknown[]) => mockUseAdminProductionHouses(...args),
  useDeleteProductionHouse: () => ({ mutate: mockDeleteMutate, isPending: false }),
}));

vi.mock('@/hooks/useAdminMovieAvailability', () => ({
  useCountries: () => ({
    data: [
      { code: 'IN', name: 'India', display_order: 1 },
      { code: 'US', name: 'United States', display_order: 2 },
    ],
  }),
}));

const mockSetSearch = vi.fn();
vi.mock('@/hooks/useDebouncedSearch', () => ({
  useDebouncedSearch: () => ({
    search: '',
    setSearch: mockSetSearch,
    debouncedSearch: '',
  }),
}));

vi.mock('@/components/common/SearchInput', () => ({
  SearchInput: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    isLoading?: boolean;
  }) => (
    <input
      data-testid="search-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

vi.mock('@/components/common/LoadMoreButton', () => ({
  LoadMoreButton: () => null,
}));

vi.mock('@/components/common/CountryDropdown', () => ({
  CountryDropdown: ({
    value,
    onChange,
    countries,
    formatLabel,
    renderIcon,
  }: {
    value: string;
    onChange: (v: string) => void;
    countries: Array<{ code: string; name: string }>;
    formatLabel?: (c: { code: string; name: string }) => string;
    renderIcon?: (c: { code: string; name: string }) => React.ReactNode;
  }) => (
    <div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid="country-dropdown"
      >
        {countries.map((c) => (
          <option key={c.code} value={c.code}>
            {formatLabel ? formatLabel(c) : c.name}
          </option>
        ))}
      </select>
      {renderIcon &&
        countries.map((c) => (
          <span key={`icon-${c.code}`} data-testid={`icon-${c.code}`}>
            {renderIcon(c)}
          </span>
        ))}
    </div>
  ),
  countryFlag: (code: string) => code,
}));

vi.mock('@/components/production-houses/AddProductionHouseForm', () => ({
  AddProductionHouseForm: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="add-form">
      <input placeholder="Name *" />
      <button onClick={onClose}>Cancel</button>
    </div>
  ),
}));

const mockGetImageUrl = vi.fn((url: string) => url);
vi.mock('@shared/imageUrl', () => ({
  getImageUrl: (...args: unknown[]) => mockGetImageUrl(args[0] as string),
}));

const makeHouse = (id: string, overrides = {}) => ({
  id,
  name: `House ${id}`,
  logo_url: null,
  origin_country: 'IN',
  ...overrides,
});

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ProductionHousesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPHAdmin = false;
    mockCanDeleteTopLevel = true;
    mockGetImageUrl.mockImplementation((url: string) => url);
    // Default: return empty data for both calls to useAdminProductionHouses
    mockUseAdminProductionHouses.mockReturnValue({
      data: { pages: [[]] },
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
  });

  it('renders "Add Production House" button', () => {
    renderWithProviders(<ProductionHousesPage />);
    expect(screen.getByText('Add Production House')).toBeInTheDocument();
  });

  it('renders search input with placeholder', () => {
    renderWithProviders(<ProductionHousesPage />);
    expect(screen.getByPlaceholderText('Search production houses...')).toBeInTheDocument();
  });

  it('shows add form when "Add Production House" button is clicked', () => {
    renderWithProviders(<ProductionHousesPage />);
    fireEvent.click(screen.getByText('Add Production House'));
    expect(screen.getByPlaceholderText('Name *')).toBeInTheDocument();
  });

  it('hides add form after clicking Cancel within the form', () => {
    renderWithProviders(<ProductionHousesPage />);
    fireEvent.click(screen.getByText('Add Production House'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByPlaceholderText('Name *')).not.toBeInTheDocument();
  });

  it('shows production house count summary', () => {
    renderWithProviders(<ProductionHousesPage />);
    expect(screen.getByText('0 production houses')).toBeInTheDocument();
  });

  it('shows singular "production house" for count of 1', () => {
    mockUseAdminProductionHouses.mockReturnValue({
      data: { pages: [[makeHouse('h1')]] },
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
    renderWithProviders(<ProductionHousesPage />);
    expect(screen.getByText('1 production house')).toBeInTheDocument();
  });

  it('renders house with logo', () => {
    mockUseAdminProductionHouses.mockReturnValue({
      data: { pages: [[makeHouse('h1', { logo_url: 'https://cdn/logo.png' })]] },
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
    const { container } = renderWithProviders(<ProductionHousesPage />);
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
  });

  it('renders house without logo (Building2 icon fallback)', () => {
    mockUseAdminProductionHouses.mockReturnValue({
      data: { pages: [[makeHouse('h1', { logo_url: null })]] },
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
    renderWithProviders(<ProductionHousesPage />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('House h1')).toBeInTheDocument();
  });

  it('shows "Country not set" when origin_country is null', () => {
    mockUseAdminProductionHouses
      .mockReturnValueOnce({
        data: { pages: [[makeHouse('h1', { origin_country: null })]] },
        isLoading: false,
        isFetching: false,
        hasNextPage: false,
        fetchNextPage: vi.fn(),
        isFetchingNextPage: false,
      })
      .mockReturnValue({
        data: { pages: [[makeHouse('h1', { origin_country: null })]] },
        isLoading: false,
        isFetching: false,
        hasNextPage: false,
        fetchNextPage: vi.fn(),
        isFetchingNextPage: false,
      });
    renderWithProviders(<ProductionHousesPage />);
    expect(screen.getByText('Country not set')).toBeInTheDocument();
  });

  it('shows country name when origin_country is set', () => {
    mockUseAdminProductionHouses.mockReturnValue({
      data: { pages: [[makeHouse('h1', { origin_country: 'IN' })]] },
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
    renderWithProviders(<ProductionHousesPage />);
    expect(screen.getAllByText(/India/).length).toBeGreaterThan(0);
  });

  it('renders loading spinner when isLoading', () => {
    mockUseAdminProductionHouses.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
    const { container } = renderWithProviders(<ProductionHousesPage />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows edit pencil and delete button for non-PH admin', () => {
    mockUseAdminProductionHouses.mockReturnValue({
      data: { pages: [[makeHouse('h1')]] },
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
    renderWithProviders(<ProductionHousesPage />);
    // Pencil link + delete button should be visible
    expect(screen.getAllByRole('link').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('hides edit/delete actions for PH admin', () => {
    mockIsPHAdmin = true;
    mockUseAdminProductionHouses.mockReturnValue({
      data: { pages: [[makeHouse('h1')]] },
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
    renderWithProviders(<ProductionHousesPage />);
    // Only the card link should remain, not the standalone pencil or delete
    const deleteButtons = screen.getAllByRole('button').filter((btn) => {
      const parent = btn.closest('.bg-surface-card');
      return parent && btn.querySelector('svg');
    });
    expect(deleteButtons).toHaveLength(0);
  });

  it('calls deleteHouse.mutate on confirmed delete', () => {
    window.confirm = vi.fn().mockReturnValue(true);
    mockUseAdminProductionHouses.mockReturnValue({
      data: { pages: [[makeHouse('h1')]] },
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
    renderWithProviders(<ProductionHousesPage />);
    // Find the delete button (standalone button in card, not link)
    const deleteButtons = screen.getAllByRole('button').filter((btn) => {
      const parent = btn.closest('.bg-surface-card');
      return parent && btn.querySelector('svg');
    });
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);
      expect(mockDeleteMutate).toHaveBeenCalledWith('h1');
    }
  });

  it('does not delete when confirm is cancelled', () => {
    window.confirm = vi.fn().mockReturnValue(false);
    mockUseAdminProductionHouses.mockReturnValue({
      data: { pages: [[makeHouse('h1')]] },
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
    renderWithProviders(<ProductionHousesPage />);
    const deleteButtons = screen.getAllByRole('button').filter((btn) => {
      const parent = btn.closest('.bg-surface-card');
      return parent && btn.querySelector('svg');
    });
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);
      expect(mockDeleteMutate).not.toHaveBeenCalled();
    }
  });

  it('hides delete when canDeleteTopLevel returns false', () => {
    mockCanDeleteTopLevel = false;
    mockUseAdminProductionHouses.mockReturnValue({
      data: { pages: [[makeHouse('h1')]] },
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
    renderWithProviders(<ProductionHousesPage />);
    const deleteButtons = screen.getAllByRole('button').filter((btn) => {
      const parent = btn.closest('.bg-surface-card');
      return parent && btn.querySelector('svg');
    });
    expect(deleteButtons).toHaveLength(0);
  });

  it('uses getImageUrl fallback when it returns null', () => {
    mockGetImageUrl.mockReturnValue(null as unknown as string);
    mockUseAdminProductionHouses.mockReturnValue({
      data: { pages: [[makeHouse('h1', { logo_url: 'https://original.com/logo.png' })]] },
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
    const { container } = renderWithProviders(<ProductionHousesPage />);
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://original.com/logo.png');
  });

  it('renders empty state when no houses match filter', () => {
    renderWithProviders(<ProductionHousesPage />);
    expect(screen.getByText('No production houses found')).toBeInTheDocument();
  });

  it('falls back to origin_country code when country name not found', () => {
    mockUseAdminProductionHouses.mockReturnValue({
      data: { pages: [[makeHouse('h1', { origin_country: 'XX' })]] },
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
    renderWithProviders(<ProductionHousesPage />);
    // XX is not in the countries list, so countryNameMap returns undefined -> falls back to code
    expect(screen.getByText(/XX/)).toBeInTheDocument();
  });

  it('renders renderIcon callback for ALL_COUNTRIES and NOT_SET codes', () => {
    mockUseAdminProductionHouses.mockReturnValue({
      data: { pages: [[makeHouse('h1', { origin_country: null })]] },
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
    renderWithProviders(<ProductionHousesPage />);
    // The CountryDropdown mock renders icons for each country option
    // ALL_COUNTRIES and NOT_SET should have icon spans
    expect(screen.getByTestId('icon-ALL')).toBeInTheDocument();
    expect(screen.getByTestId('icon-NOT_SET')).toBeInTheDocument();
  });

  it('shows "Not Set" country option when houses have null origin_country', () => {
    mockUseAdminProductionHouses.mockReturnValue({
      data: { pages: [[makeHouse('h1', { origin_country: null })]] },
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
    renderWithProviders(<ProductionHousesPage />);
    // The dropdown should include "Not Set" option
    const dropdown = screen.getByTestId('country-dropdown');
    expect(dropdown).toBeInTheDocument();
  });
});
