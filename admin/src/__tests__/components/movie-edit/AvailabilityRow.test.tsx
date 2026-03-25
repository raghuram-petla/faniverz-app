import { render, screen, fireEvent } from '@testing-library/react';
import { AvailabilityRow } from '@/components/movie-edit/AvailabilityRow';
import type { MoviePlatformAvailability } from '@shared/types';

const mockGetImageUrl = vi.fn((url: string) => url);
vi.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string) => mockGetImageUrl(url),
}));

vi.mock('@shared/colors', () => ({
  colors: { zinc900: '#18181B' },
}));

function makeRow(overrides: Partial<MoviePlatformAvailability> = {}): MoviePlatformAvailability {
  return {
    id: 'avail-1',
    movie_id: 'movie-1',
    platform_id: 'plat-1',
    country_code: 'IN',
    availability_type: 'flatrate',
    available_from: null,
    streaming_url: null,
    tmdb_display_priority: null,
    created_at: '2024-01-01',
    platform: {
      id: 'plat-1',
      name: 'Netflix',
      logo: 'N',
      logo_url: null,
      color: '#E50914',
      display_order: 1,
    },
    ...overrides,
  };
}

describe('AvailabilityRow', () => {
  const onRemove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders platform name', () => {
    render(<AvailabilityRow row={makeRow()} onRemove={onRemove} isReadOnly={false} />);
    expect(screen.getByText('Netflix')).toBeInTheDocument();
  });

  it('shows platform_id when platform name is not available', () => {
    render(
      <AvailabilityRow
        row={makeRow({ platform: undefined })}
        onRemove={onRemove}
        isReadOnly={false}
      />,
    );
    expect(screen.getByText('plat-1')).toBeInTheDocument();
  });

  it('renders available_from date when present', () => {
    render(
      <AvailabilityRow
        row={makeRow({ available_from: '2024-06-15' })}
        onRemove={onRemove}
        isReadOnly={false}
      />,
    );
    expect(screen.getByText('from 2024-06-15')).toBeInTheDocument();
  });

  it('does not render date when available_from is null', () => {
    render(<AvailabilityRow row={makeRow()} onRemove={onRemove} isReadOnly={false} />);
    expect(screen.queryByText(/from/)).not.toBeInTheDocument();
  });

  it('renders streaming URL when present', () => {
    render(
      <AvailabilityRow
        row={makeRow({ streaming_url: 'https://netflix.com/watch/123' })}
        onRemove={onRemove}
        isReadOnly={false}
      />,
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://netflix.com/watch/123');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('does not render streaming URL when null', () => {
    render(<AvailabilityRow row={makeRow()} onRemove={onRemove} isReadOnly={false} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders remove button when not read-only', () => {
    render(<AvailabilityRow row={makeRow()} onRemove={onRemove} isReadOnly={false} />);
    const removeBtn = screen.getByRole('button', { name: 'Remove Netflix' });
    expect(removeBtn).toBeInTheDocument();
  });

  it('hides remove button when read-only', () => {
    render(<AvailabilityRow row={makeRow()} onRemove={onRemove} isReadOnly={true} />);
    expect(screen.queryByRole('button', { name: 'Remove Netflix' })).not.toBeInTheDocument();
  });

  it('calls onRemove with correct args when remove is clicked', () => {
    render(<AvailabilityRow row={makeRow()} onRemove={onRemove} isReadOnly={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Netflix' }));
    expect(onRemove).toHaveBeenCalledWith('avail-1', 'movie-1');
  });

  it('renders platform logo image when logo_url is present', () => {
    const row = makeRow({
      platform: {
        id: 'plat-1',
        name: 'Netflix',
        logo: 'N',
        logo_url: 'https://example.com/logo.png',
        color: '#E50914',
        display_order: 1,
      },
    });
    render(<AvailabilityRow row={row} onRemove={onRemove} isReadOnly={false} />);
    const img = document.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/logo.png');
  });

  it('does not render img tag when no logo_url', () => {
    render(<AvailabilityRow row={makeRow()} onRemove={onRemove} isReadOnly={false} />);
    expect(document.querySelector('img')).not.toBeInTheDocument();
  });

  it('falls back to raw logo_url when getImageUrl returns null', () => {
    mockGetImageUrl.mockReturnValue(null as unknown as string);
    const row = makeRow({
      platform: {
        id: 'plat-1',
        name: 'Netflix',
        logo: 'N',
        logo_url: 'https://raw.example.com/logo.png',
        color: '#E50914',
        display_order: 1,
      },
    });
    render(<AvailabilityRow row={row} onRemove={onRemove} isReadOnly={false} />);
    const img = document.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://raw.example.com/logo.png');
  });
});
