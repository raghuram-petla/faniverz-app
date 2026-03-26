import { render, screen, fireEvent } from '@testing-library/react';
import { CountryAvailabilityPanel } from '@/components/movie-edit/CountryAvailabilityPanel';
import type { MoviePlatformAvailability, AvailabilityType } from '@shared/types';

vi.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string) => url,
}));

vi.mock('@shared/colors', () => ({
  colors: { zinc900: '#18181B' },
}));

function makeRow(overrides: Partial<MoviePlatformAvailability> = {}): MoviePlatformAvailability {
  return {
    id: 'row-1',
    movie_id: 'movie-1',
    platform_id: 'netflix',
    country_code: 'IN',
    availability_type: 'flatrate' as AvailabilityType,
    available_from: null,
    streaming_url: null,
    tmdb_display_priority: null,
    created_at: '2025-01-01',
    platform: {
      id: 'netflix',
      name: 'Netflix',
      logo: 'N',
      logo_url: null,
      color: '#E50914',
      display_order: 1,
      regions: ['IN'],
    },
    ...overrides,
  };
}

describe('CountryAvailabilityPanel', () => {
  it('shows empty message when no rows', () => {
    render(
      <CountryAvailabilityPanel
        rows={[]}
        isReadOnly={false}
        pendingIds={new Set()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText(/No platforms for this country/)).toBeInTheDocument();
  });

  it('renders rows grouped by availability type', () => {
    const rows = [
      makeRow({ id: 'r1', availability_type: 'flatrate' }),
      makeRow({
        id: 'r2',
        availability_type: 'rent',
        platform: {
          id: 'prime',
          name: 'Prime',
          logo: 'P',
          logo_url: null,
          color: '#00A8E1',
          display_order: 2,
          regions: ['IN'],
        },
      }),
    ];
    render(
      <CountryAvailabilityPanel
        rows={rows}
        isReadOnly={false}
        pendingIds={new Set()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText(/Stream \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Rent \(1\)/)).toBeInTheDocument();
  });

  it('calls onRemove when remove button is clicked', () => {
    const onRemove = vi.fn();
    const rows = [makeRow()];
    render(
      <CountryAvailabilityPanel
        rows={rows}
        isReadOnly={false}
        pendingIds={new Set()}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByLabelText('Remove Netflix'));
    expect(onRemove).toHaveBeenCalledWith('row-1', false);
  });

  it('hides remove button when read-only', () => {
    render(
      <CountryAvailabilityPanel
        rows={[makeRow()]}
        isReadOnly={true}
        pendingIds={new Set()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText('Remove Netflix')).not.toBeInTheDocument();
  });

  it('collapses and expands availability type sections', () => {
    const rows = [makeRow()];
    render(
      <CountryAvailabilityPanel
        rows={rows}
        isReadOnly={false}
        pendingIds={new Set()}
        onRemove={vi.fn()}
      />,
    );
    // Stream section should be expanded by default (has rows)
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    // Collapse it
    fireEvent.click(screen.getByText(/Stream \(1\)/));
    expect(screen.queryByText('Netflix')).not.toBeInTheDocument();
    // Expand it again
    fireEvent.click(screen.getByText(/Stream \(1\)/));
    expect(screen.getByText('Netflix')).toBeInTheDocument();
  });

  it('marks pending rows with isPending', () => {
    const onRemove = vi.fn();
    render(
      <CountryAvailabilityPanel
        rows={[makeRow()]}
        isReadOnly={false}
        pendingIds={new Set(['row-1'])}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByLabelText('Remove Netflix'));
    expect(onRemove).toHaveBeenCalledWith('row-1', true);
  });
});
