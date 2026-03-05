import { render, screen, fireEvent } from '@testing-library/react';
import { PlatformsSection } from '@/components/movie-edit/PlatformsSection';
import type { OTTPlatform, MoviePlatform } from '@/lib/types';

const mockPlatform: OTTPlatform = {
  id: 'netflix',
  name: 'Netflix',
  logo: 'N',
  logo_url: 'https://cdn.example.com/netflix.png',
  color: '#e50914',
  display_order: 1,
};

const mockPlatformNoLogo: OTTPlatform = {
  id: 'newplatform',
  name: 'New Platform',
  logo: 'N',
  logo_url: null,
  color: '#333333',
  display_order: 0,
};

const allPlatforms: OTTPlatform[] = [
  mockPlatform,
  mockPlatformNoLogo,
  {
    id: 'prime',
    name: 'Prime Video',
    logo: 'P',
    logo_url: 'https://cdn.example.com/prime.png',
    color: '#146eb9',
    display_order: 2,
  },
];

describe('PlatformsSection', () => {
  const defaultProps = {
    visiblePlatforms: [] as (Pick<MoviePlatform, 'movie_id' | 'platform_id' | 'available_from'> & {
      platform?: OTTPlatform;
    })[],
    allPlatforms,
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    pendingPlatformAdds: [],
  };

  it('renders "Add OTT Platform" section', () => {
    render(<PlatformsSection {...defaultProps} />);
    expect(screen.getByText('Add OTT Platform')).toBeInTheDocument();
  });

  it('renders platform logo image when logo_url is present', () => {
    const { container } = render(
      <PlatformsSection
        {...defaultProps}
        visiblePlatforms={[
          {
            movie_id: 'm1',
            platform_id: 'netflix',
            available_from: null,
            platform: mockPlatform,
          },
        ]}
      />,
    );
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/netflix.png');
  });

  it('renders Film icon fallback when logo_url is null', () => {
    const { container } = render(
      <PlatformsSection
        {...defaultProps}
        visiblePlatforms={[
          {
            movie_id: 'm1',
            platform_id: 'newplatform',
            available_from: null,
            platform: mockPlatformNoLogo,
          },
        ]}
      />,
    );
    // No img tag should be rendered for this platform
    expect(container.querySelector('img')).toBeNull();
    // The Film icon SVG should be present
    expect(screen.getByText('New Platform')).toBeInTheDocument();
  });

  it('renders platform name for visible platforms', () => {
    render(
      <PlatformsSection
        {...defaultProps}
        visiblePlatforms={[
          {
            movie_id: 'm1',
            platform_id: 'netflix',
            available_from: null,
            platform: mockPlatform,
          },
        ]}
      />,
    );
    expect(screen.getByText('Netflix')).toBeInTheDocument();
  });

  it('shows available_from date when set', () => {
    render(
      <PlatformsSection
        {...defaultProps}
        visiblePlatforms={[
          {
            movie_id: 'm1',
            platform_id: 'netflix',
            available_from: '2026-04-01',
            platform: mockPlatform,
          },
        ]}
      />,
    );
    expect(screen.getByText('from 2026-04-01')).toBeInTheDocument();
  });

  it('calls onRemove when remove button clicked', () => {
    const onRemove = vi.fn();
    render(
      <PlatformsSection
        {...defaultProps}
        onRemove={onRemove}
        visiblePlatforms={[
          {
            movie_id: 'm1',
            platform_id: 'netflix',
            available_from: null,
            platform: mockPlatform,
          },
        ]}
      />,
    );
    fireEvent.click(screen.getByLabelText('Remove Netflix'));
    expect(onRemove).toHaveBeenCalledWith('netflix', false);
  });

  it('filters out already-selected platforms from dropdown', () => {
    render(
      <PlatformsSection
        {...defaultProps}
        visiblePlatforms={[
          {
            movie_id: 'm1',
            platform_id: 'netflix',
            available_from: null,
            platform: mockPlatform,
          },
        ]}
      />,
    );
    const select = screen.getByRole('combobox');
    const options = Array.from(select.querySelectorAll('option'));
    const optionTexts = options.map((o) => o.textContent);
    expect(optionTexts).not.toContain('Netflix');
    expect(optionTexts).toContain('Prime Video');
  });

  it('calls onAdd with selected platform', () => {
    const onAdd = vi.fn();
    render(<PlatformsSection {...defaultProps} onAdd={onAdd} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'netflix' } });

    fireEvent.click(screen.getByText('Add'));
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        platform_id: 'netflix',
        available_from: null,
      }),
    );
  });

  it('disables Add button when no platform selected', () => {
    render(<PlatformsSection {...defaultProps} />);
    expect(screen.getByText('Add')).toBeDisabled();
  });
});
