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
    is_main: false,
  };

  it('renders poster title and date', () => {
    render(<PosterGalleryCard poster={basePoster} onSetMain={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText('First Look')).toBeInTheDocument();
    expect(screen.getByText('2025-06-01')).toBeInTheDocument();
  });

  it('renders thumbnail image', () => {
    render(<PosterGalleryCard poster={basePoster} onSetMain={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByAltText('First Look')).toBeInTheDocument();
  });

  it('shows Set Main button for non-main posters', () => {
    render(<PosterGalleryCard poster={basePoster} onSetMain={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText('Set Main')).toBeInTheDocument();
  });

  it('hides Set Main button for main poster', () => {
    render(
      <PosterGalleryCard
        poster={{ ...basePoster, is_main: true }}
        onSetMain={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.queryByText('Set Main')).not.toBeInTheDocument();
  });

  it('shows Main badge for main poster', () => {
    render(
      <PosterGalleryCard
        poster={{ ...basePoster, is_main: true }}
        onSetMain={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText('Main')).toBeInTheDocument();
  });

  it('calls onSetMain when Set Main is clicked', () => {
    const onSetMain = vi.fn();
    render(<PosterGalleryCard poster={basePoster} onSetMain={onSetMain} onRemove={vi.fn()} />);
    fireEvent.click(screen.getByText('Set Main'));
    expect(onSetMain).toHaveBeenCalledWith('poster-1');
  });

  it('calls onRemove when remove button is clicked', () => {
    const onRemove = vi.fn();
    render(<PosterGalleryCard poster={basePoster} onSetMain={vi.fn()} onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText('Remove First Look'));
    expect(onRemove).toHaveBeenCalledWith('poster-1', false);
  });

  it('renders compact variant status', () => {
    render(<PosterGalleryCard poster={basePoster} onSetMain={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByTestId('poster-variant-status')).toBeInTheDocument();
  });

  it('does not show date when poster_date is null', () => {
    render(
      <PosterGalleryCard
        poster={{ ...basePoster, poster_date: null }}
        onSetMain={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
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
