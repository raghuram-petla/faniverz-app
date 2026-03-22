import { render, screen, fireEvent } from '@testing-library/react';
import { CountryAvailabilityPanel } from '@/components/movie-edit/CountryAvailabilityPanel';
import type { MoviePlatformAvailability, OTTPlatform } from '@shared/types';

vi.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string) => url,
}));

vi.mock('@shared/colors', () => ({
  colors: { zinc900: '#18181B' },
}));

vi.mock('@/components/common/FormField', () => ({
  INPUT_CLASSES: { compact: 'compact-class' },
}));

vi.mock('@/components/common/Button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

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
    regions: ['IN'],
  },
];

function makeAvailRow(
  overrides: Partial<MoviePlatformAvailability> = {},
): MoviePlatformAvailability {
  return {
    id: 'avail-1',
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

describe('CountryAvailabilityPanel', () => {
  const onAdd = vi.fn();
  const onRemove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Add platform" button when not read-only', () => {
    render(
      <CountryAvailabilityPanel
        countryCode="IN"
        rows={[]}
        movieId="movie-1"
        allPlatforms={mockPlatforms}
        isReadOnly={false}
        onAdd={onAdd}
        onRemove={onRemove}
      />,
    );
    expect(screen.getByText('Add platform')).toBeInTheDocument();
  });

  it('hides "Add platform" button when read-only', () => {
    render(
      <CountryAvailabilityPanel
        countryCode="IN"
        rows={[]}
        movieId="movie-1"
        allPlatforms={mockPlatforms}
        isReadOnly={true}
        onAdd={onAdd}
        onRemove={onRemove}
      />,
    );
    expect(screen.queryByText('Add platform')).not.toBeInTheDocument();
  });

  it('renders availability type sections with counts', () => {
    const rows = [
      makeAvailRow({ id: '1', availability_type: 'flatrate' }),
      makeAvailRow({
        id: '2',
        availability_type: 'flatrate',
        platform_id: 'prime',
        platform: mockPlatforms[1],
      }),
    ];
    render(
      <CountryAvailabilityPanel
        countryCode="IN"
        rows={rows}
        movieId="movie-1"
        allPlatforms={mockPlatforms}
        isReadOnly={false}
        onAdd={onAdd}
        onRemove={onRemove}
      />,
    );
    expect(screen.getByText('Stream (2)')).toBeInTheDocument();
  });

  it('renders platform names in availability rows', () => {
    const rows = [makeAvailRow()];
    render(
      <CountryAvailabilityPanel
        countryCode="IN"
        rows={rows}
        movieId="movie-1"
        allPlatforms={mockPlatforms}
        isReadOnly={false}
        onAdd={onAdd}
        onRemove={onRemove}
      />,
    );
    expect(screen.getByText('Netflix')).toBeInTheDocument();
  });

  it('shows add form when "Add platform" is clicked', () => {
    render(
      <CountryAvailabilityPanel
        countryCode="IN"
        rows={[]}
        movieId="movie-1"
        allPlatforms={mockPlatforms}
        isReadOnly={false}
        onAdd={onAdd}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByText('Add platform'));
    expect(screen.getByText('Select platform\u2026')).toBeInTheDocument();
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('hides add form when Cancel is clicked', () => {
    render(
      <CountryAvailabilityPanel
        countryCode="IN"
        rows={[]}
        movieId="movie-1"
        allPlatforms={mockPlatforms}
        isReadOnly={false}
        onAdd={onAdd}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByText('Add platform'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Select platform\u2026')).not.toBeInTheDocument();
  });

  it('calls onAdd with correct data when adding a platform', () => {
    render(
      <CountryAvailabilityPanel
        countryCode="IN"
        rows={[]}
        movieId="movie-1"
        allPlatforms={mockPlatforms}
        isReadOnly={false}
        onAdd={onAdd}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByText('Add platform'));
    // Select a platform from the dropdown
    const select = screen.getAllByRole('combobox')[0];
    fireEvent.change(select, { target: { value: 'netflix' } });
    fireEvent.click(screen.getByText('Add'));
    expect(onAdd).toHaveBeenCalledWith({
      platform_id: 'netflix',
      country_code: 'IN',
      availability_type: 'flatrate',
      available_from: null,
      streaming_url: null,
    });
  });

  it('collapses/expands availability type sections on click', () => {
    const rows = [makeAvailRow()];
    render(
      <CountryAvailabilityPanel
        countryCode="IN"
        rows={rows}
        movieId="movie-1"
        allPlatforms={mockPlatforms}
        isReadOnly={false}
        onAdd={onAdd}
        onRemove={onRemove}
      />,
    );
    // Stream section is expanded (has items)
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    // Click to collapse
    fireEvent.click(screen.getByText('Stream (1)'));
    // Netflix should no longer be visible
    expect(screen.queryByText('Netflix')).not.toBeInTheDocument();
  });

  it('renders multiple availability types', () => {
    const rows = [
      makeAvailRow({ id: '1', availability_type: 'flatrate' }),
      makeAvailRow({
        id: '2',
        availability_type: 'rent',
        platform_id: 'prime',
        platform: mockPlatforms[1],
      }),
    ];
    render(
      <CountryAvailabilityPanel
        countryCode="IN"
        rows={rows}
        movieId="movie-1"
        allPlatforms={mockPlatforms}
        isReadOnly={false}
        onAdd={onAdd}
        onRemove={onRemove}
      />,
    );
    expect(screen.getByText('Stream (1)')).toBeInTheDocument();
    expect(screen.getByText('Rent (1)')).toBeInTheDocument();
  });
});
