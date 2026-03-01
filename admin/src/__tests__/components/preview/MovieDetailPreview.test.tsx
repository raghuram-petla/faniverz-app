import { render, screen } from '@testing-library/react';
import { MovieDetailPreview } from '@/components/preview/MovieDetailPreview';

const defaultProps = {
  title: 'Pushpa 2',
  backdropUrl: 'https://example.com/backdrop.jpg',
  posterUrl: 'https://example.com/poster.jpg',
  releaseType: 'theatrical' as const,
  rating: 8.5,
  reviewCount: 42,
  runtime: 148,
  certification: 'UA',
  releaseDate: '2024-12-05',
  focusX: null,
  focusY: null,
};

describe('MovieDetailPreview', () => {
  it('renders movie title', () => {
    render(<MovieDetailPreview {...defaultProps} />);
    expect(screen.getByText('Pushpa 2')).toBeInTheDocument();
  });

  it('renders poster image', () => {
    const { container } = render(<MovieDetailPreview {...defaultProps} />);
    const imgs = container.querySelectorAll('img');
    const posterImg = Array.from(imgs).find((img) => img.src.includes('poster'));
    expect(posterImg).toBeTruthy();
  });

  it('renders release type badge', () => {
    render(<MovieDetailPreview {...defaultProps} />);
    expect(screen.getByText('In Theaters')).toBeInTheDocument();
  });

  it('renders rating and review count', () => {
    render(<MovieDetailPreview {...defaultProps} />);
    expect(screen.getByText('8.5')).toBeInTheDocument();
    expect(screen.getByText('(42 reviews)')).toBeInTheDocument();
  });

  it('renders tabs bar', () => {
    render(<MovieDetailPreview {...defaultProps} />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Cast')).toBeInTheDocument();
    expect(screen.getByText('Reviews')).toBeInTheDocument();
  });

  it('applies object-position from focal point', () => {
    const { container } = render(
      <MovieDetailPreview {...defaultProps} focusX={0.25} focusY={0.75} />,
    );
    const backdropImg = container.querySelector('img[style*="object-position"]');
    expect(backdropImg?.getAttribute('style')).toContain('25% 75%');
  });

  it('renders navigation buttons', () => {
    render(<MovieDetailPreview {...defaultProps} />);
    // Back button character
    expect(screen.getByText('‹')).toBeInTheDocument();
  });
});
