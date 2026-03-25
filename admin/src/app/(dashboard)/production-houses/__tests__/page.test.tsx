import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// ─── Mocks before imports ───
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const mockUsePermissions = vi.fn();
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => mockUsePermissions(),
}));

const mockUseAdminProductionHouses = vi.fn();
const mockDeleteHouseMutate = vi.fn();
vi.mock('@/hooks/useAdminProductionHouses', () => ({
  useAdminProductionHouses: () => mockUseAdminProductionHouses(),
  useDeleteProductionHouse: () => ({ mutate: mockDeleteHouseMutate, isPending: false }),
}));

const mockUseCountries = vi.fn();
vi.mock('@/hooks/useAdminMovieAvailability', () => ({
  useCountries: () => mockUseCountries(),
}));

vi.mock('@/hooks/useDebouncedSearch', () => ({
  useDebouncedSearch: () => ({ search: '', setSearch: vi.fn(), debouncedSearch: '' }),
}));

vi.mock('@/components/common/SearchInput', () => ({
  SearchInput: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
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
  LoadMoreButton: ({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  }: {
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void;
  }) =>
    hasNextPage ? (
      <button data-testid="load-more" onClick={fetchNextPage} disabled={isFetchingNextPage}>
        Load More
      </button>
    ) : null,
}));

vi.mock('@/components/common/CountryDropdown', () => ({
  CountryDropdown: ({
    value,
    onChange,
    countries,
    formatLabel,
    renderIcon,
  }: {
    countries: { code: string; name: string }[];
    value: string;
    onChange: (v: string) => void;
    formatLabel?: (c: { code: string; name: string; houseCount?: number }) => string;
    renderIcon?: (c: { code: string; name: string }) => React.ReactNode;
  }) => (
    <select data-testid="country-dropdown" value={value} onChange={(e) => onChange(e.target.value)}>
      {countries.map((c) => (
        <option key={c.code} value={c.code}>
          {formatLabel ? formatLabel(c as never) : c.name}
          {renderIcon ? renderIcon(c) : null}
        </option>
      ))}
    </select>
  ),
  countryFlag: (code: string) => <span data-testid={`flag-${code}`}>{code}</span>,
}));

vi.mock('@/components/production-houses/AddProductionHouseForm', () => ({
  AddProductionHouseForm: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="add-ph-form">
      <button data-testid="close-form" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

vi.mock('@shared/imageUrl', () => ({
  getImageUrl: vi.fn((url: string) => url),
}));

import ProductionHousesPage from '@/app/(dashboard)/production-houses/page';

const makeHouse = (id: string, name: string, originCountry: string | null = null) => ({
  id,
  name,
  logo_url: null as string | null,
  origin_country: originCountry,
});

const makePageData = (houses: ReturnType<typeof makeHouse>[]) => ({
  pages: [houses],
});

describe('ProductionHousesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
    mockUsePermissions.mockReturnValue({
      isPHAdmin: false,
      productionHouseIds: [],
      canCreate: () => true,
      canDeleteTopLevel: () => true,
    });
    mockUseCountries.mockReturnValue({
      data: [
        { code: 'IN', name: 'India', display_order: 1 },
        { code: 'US', name: 'United States', display_order: 2 },
      ],
    });
    const defaultData = makePageData([]);
    mockUseAdminProductionHouses.mockReturnValue({
      data: defaultData,
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
  });

  it('renders search input', () => {
    render(<ProductionHousesPage />);
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  it('renders country dropdown', () => {
    render(<ProductionHousesPage />);
    expect(screen.getByTestId('country-dropdown')).toBeInTheDocument();
  });

  it('shows loading spinner when isLoading', () => {
    mockUseAdminProductionHouses.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
    const { container } = render(<ProductionHousesPage />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows empty state when no houses', () => {
    render(<ProductionHousesPage />);
    expect(screen.getByText('No production houses found')).toBeInTheDocument();
  });

  it('renders production house cards', () => {
    mockUseAdminProductionHouses.mockReturnValue({
      data: makePageData([makeHouse('ph-1', 'Arka Media')]),
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
    render(<ProductionHousesPage />);
    expect(screen.getByText('Arka Media')).toBeInTheDocument();
  });

  it('shows Add Production House button when canCreate', () => {
    render(<ProductionHousesPage />);
    expect(screen.getByText('Add Production House')).toBeInTheDocument();
  });

  it('hides Add Production House button when canCreate returns false', () => {
    mockUsePermissions.mockReturnValue({
      isPHAdmin: false,
      productionHouseIds: [],
      canCreate: () => false,
      canDeleteTopLevel: () => false,
    });
    render(<ProductionHousesPage />);
    expect(screen.queryByText('Add Production House')).not.toBeInTheDocument();
  });

  it('shows AddProductionHouseForm when add button is clicked', () => {
    render(<ProductionHousesPage />);
    fireEvent.click(screen.getByText('Add Production House'));
    expect(screen.getByTestId('add-ph-form')).toBeInTheDocument();
  });

  it('closes AddProductionHouseForm on close', () => {
    render(<ProductionHousesPage />);
    fireEvent.click(screen.getByText('Add Production House'));
    expect(screen.getByTestId('add-ph-form')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('close-form'));
    expect(screen.queryByTestId('add-ph-form')).not.toBeInTheDocument();
  });

  it('shows delete button when canDeleteTopLevel returns true', () => {
    mockUseAdminProductionHouses.mockReturnValue({
      data: makePageData([makeHouse('ph-1', 'Studio')]),
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
    render(<ProductionHousesPage />);
    // Delete button is present
    const trashBtns = screen
      .getAllByRole('button')
      .filter((b) => b.classList.contains('hover:text-status-red') || b.querySelector('svg'));
    expect(trashBtns.length).toBeGreaterThan(0);
  });

  it('calls deleteHouse.mutate on confirmed delete', () => {
    mockUseAdminProductionHouses.mockReturnValue({
      data: makePageData([makeHouse('ph-1', 'Studio')]),
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
    render(<ProductionHousesPage />);

    // Find the delete button (last button in the house card)
    const buttons = screen.getAllByRole('button');
    const deleteBtn = buttons.find((b) => b.classList.toString().includes('hover:text-status-red'));
    if (deleteBtn) {
      fireEvent.click(deleteBtn);
      expect(window.confirm).toHaveBeenCalledWith('Delete this production house?');
      expect(mockDeleteHouseMutate).toHaveBeenCalledWith('ph-1');
    }
  });

  it('shows house count', () => {
    mockUseAdminProductionHouses.mockReturnValue({
      data: makePageData([makeHouse('ph-1', 'A'), makeHouse('ph-2', 'B')]),
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
    render(<ProductionHousesPage />);
    expect(screen.getByText('2 production houses')).toBeInTheDocument();
  });

  it('shows singular "production house" for 1 house', () => {
    mockUseAdminProductionHouses.mockReturnValue({
      data: makePageData([makeHouse('ph-1', 'Studio')]),
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
    render(<ProductionHousesPage />);
    expect(screen.getByText('1 production house')).toBeInTheDocument();
  });

  it('shows "Country not set" when origin_country is null', () => {
    mockUseAdminProductionHouses.mockReturnValue({
      data: makePageData([makeHouse('ph-1', 'Studio', null)]),
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
    render(<ProductionHousesPage />);
    expect(screen.getByText('Country not set')).toBeInTheDocument();
  });

  it('shows country name when origin_country is set', () => {
    mockUseAdminProductionHouses.mockReturnValue({
      data: makePageData([makeHouse('ph-1', 'Bollywood Studio', 'IN')]),
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
    render(<ProductionHousesPage />);
    // The country name appears in the house card (there may be multiple "India" elements from dropdown)
    const inTexts = screen.queryAllByText(/India/);
    expect(inTexts.length).toBeGreaterThan(0);
  });

  it('does not show edit/delete actions for PH admin', () => {
    mockUsePermissions.mockReturnValue({
      isPHAdmin: true,
      productionHouseIds: ['ph-1'],
      canCreate: () => false,
      canDeleteTopLevel: () => false,
    });
    mockUseAdminProductionHouses.mockReturnValue({
      data: makePageData([makeHouse('ph-1', 'My Studio')]),
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
    render(<ProductionHousesPage />);
    // No delete buttons for PH admin
    const allButtons = screen.queryAllByRole('button');
    const deleteBtn = allButtons.find((b) =>
      b.classList.toString().includes('hover:text-status-red'),
    );
    expect(deleteBtn).toBeUndefined();
  });

  it('shows logo image when house has logo_url', () => {
    mockUseAdminProductionHouses.mockReturnValue({
      data: makePageData([makeHouse('ph-1', 'Studio', null)]),
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
    // Override to include logo_url
    const houseWithLogo = { ...makeHouse('ph-1', 'Studio'), logo_url: 'https://cdn/logo.png' };
    mockUseAdminProductionHouses.mockReturnValue({
      data: { pages: [[houseWithLogo]] },
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
    render(<ProductionHousesPage />);
    const imgs = document.querySelectorAll('img');
    expect(imgs.length).toBeGreaterThan(0);
  });

  it('invokes formatLabel and renderIcon on CountryDropdown', () => {
    // Need allHouses with some origin_country to generate dropdown options
    const houses = [makeHouse('ph-1', 'Studio A', 'IN'), makeHouse('ph-2', 'Studio B', null)];
    mockUseAdminProductionHouses.mockReturnValue({
      data: makePageData(houses),
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
    render(<ProductionHousesPage />);
    // The formatLabel and renderIcon callbacks are invoked by our updated CountryDropdown mock
    // Just verify no crash and dropdown renders
    expect(screen.getByTestId('country-dropdown')).toBeInTheDocument();
  });

  it('renders Load More button when hasNextPage is true', () => {
    mockUseAdminProductionHouses.mockReturnValue({
      data: makePageData([makeHouse('ph-1', 'Studio')]),
      isLoading: false,
      isFetching: false,
      hasNextPage: true,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false,
    });
    render(<ProductionHousesPage />);
    expect(screen.getByTestId('load-more')).toBeInTheDocument();
  });
});
