import { render, screen, fireEvent } from '@testing-library/react';
import {
  PosterGalleryCard,
  PosterVariantStatus,
  SectionHeading,
} from '@/components/movie-edit/PosterGalleryCard';
import { Image } from 'lucide-react';

const mockVariants = [
  { label: 'Original', url: 'http://x/o.jpg', width: null, quality: null, status: 'ok' as const },
  { label: 'SM', url: 'http://x/sm.jpg', width: 200, quality: 80, status: 'ok' as const },
  { label: 'MD', url: 'http://x/md.jpg', width: 400, quality: 85, status: 'missing' as const },
  { label: 'LG', url: 'http://x/lg.jpg', width: 800, quality: 90, status: 'ok' as const },
];

vi.mock('@/hooks/useImageVariants', () => ({
  useImageVariants: () => ({
    variants: mockVariants,
    isChecking: false,
    readyCount: 3,
    totalCount: 4,
    recheck: vi.fn(),
  }),
}));

describe('SectionHeading', () => {
  it('renders icon and title', () => {
    render(<SectionHeading icon={Image} title="Test Section" />);
    expect(screen.getByText('Test Section')).toBeInTheDocument();
  });
});

describe('PosterGalleryCard', () => {
  const basePoster = {
    id: 'poster-1',
    image_url: 'https://example.com/poster.jpg',
    title: 'First Look',
    poster_date: '2025-06-01',
    is_main_poster: false,
    is_main_backdrop: false,
  };

  it('renders poster title and date', () => {
    render(<PosterGalleryCard poster={basePoster} onRemove={vi.fn()} />);
    expect(screen.getByText('First Look')).toBeInTheDocument();
    expect(screen.getByText('2025-06-01')).toBeInTheDocument();
  });

  it('renders thumbnail image', () => {
    render(<PosterGalleryCard poster={basePoster} onRemove={vi.fn()} />);
    expect(screen.getByAltText('First Look')).toBeInTheDocument();
  });

  it('does not show Set Main Poster button (removed from card)', () => {
    render(<PosterGalleryCard poster={basePoster} onRemove={vi.fn()} />);
    expect(screen.queryByText('Set Main Poster')).not.toBeInTheDocument();
  });

  it('does not show Set Main Backdrop button (removed from card)', () => {
    render(<PosterGalleryCard poster={basePoster} onRemove={vi.fn()} />);
    expect(screen.queryByText('Set Main Backdrop')).not.toBeInTheDocument();
  });

  it('calls onRemove when remove button is clicked', () => {
    const onRemove = vi.fn();
    render(<PosterGalleryCard poster={basePoster} onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText('Remove First Look'));
    expect(onRemove).toHaveBeenCalledWith('poster-1', false);
  });

  it('disables remove button for main poster', () => {
    render(
      <PosterGalleryCard poster={{ ...basePoster, is_main_poster: true }} onRemove={vi.fn()} />,
    );
    expect(screen.getByLabelText('Remove First Look')).toBeDisabled();
  });

  it('disables remove button for main backdrop', () => {
    render(
      <PosterGalleryCard poster={{ ...basePoster, is_main_backdrop: true }} onRemove={vi.fn()} />,
    );
    expect(screen.getByLabelText('Remove First Look')).toBeDisabled();
  });

  it('renders compact variant status', () => {
    render(<PosterGalleryCard poster={basePoster} onRemove={vi.fn()} />);
    expect(screen.getByTestId('poster-variant-status')).toBeInTheDocument();
  });

  it('does not show date when poster_date is null', () => {
    render(<PosterGalleryCard poster={{ ...basePoster, poster_date: null }} onRemove={vi.fn()} />);
    expect(screen.queryByText('2025-06-01')).not.toBeInTheDocument();
  });
});

describe('PosterVariantStatus', () => {
  it('renders all variant labels', () => {
    render(<PosterVariantStatus imageUrl="https://example.com/poster.jpg" />);
    expect(screen.getByText('Original')).toBeInTheDocument();
    expect(screen.getByText('SM')).toBeInTheDocument();
    expect(screen.getByText('MD')).toBeInTheDocument();
    expect(screen.getByText('LG')).toBeInTheDocument();
  });

  it('shows status in title attribute', () => {
    render(<PosterVariantStatus imageUrl="https://example.com/poster.jpg" />);
    expect(screen.getByTitle('MD: missing')).toBeInTheDocument();
    expect(screen.getByTitle('SM: ok')).toBeInTheDocument();
  });
});
