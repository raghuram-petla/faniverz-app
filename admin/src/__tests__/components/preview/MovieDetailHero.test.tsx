import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MovieDetailHero, buildGradientCss } from '@/components/preview/MovieDetailHero';
import type { MovieStatus } from '@shared/types';

vi.mock('@shared/constants', () => ({
  HERO_HEIGHT: 600,
  MOVIE_STATUS_CONFIG: {
    announced: { label: 'Announced', color: '#F59E0B' },
    upcoming: { label: 'Coming Soon', color: '#2563EB' },
    in_theaters: { label: 'In Theaters', color: '#DC2626' },
    streaming: { label: 'Streaming', color: '#9333EA' },
    released: { label: 'Released', color: '#6B7280' },
  },
  DETAIL_GRADIENT: {
    colors: ['transparent', 'rgba(0,0,0,0.8)'],
    locations: [0, 1],
  },
}));

vi.mock('@shared/colors', () => ({
  colors: {
    white: '#fff',
    black50: 'rgba(0,0,0,0.5)',
    yellow400: '#FACC15',
  },
}));

const defaultProps = {
  title: 'Pushpa 2',
  backdropUrl: 'https://example.com/backdrop.jpg',
  posterUrl: 'https://example.com/poster.jpg',
  movieStatus: 'in_theaters' as MovieStatus,
  rating: 4.2,
  reviewCount: 150,
  runtime: 145,
  certification: 'U/A',
  releaseDate: '2024-12-05',
  gradientCss: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.8) 100%)',
  objectPosition: 'center 30%',
};

describe('MovieDetailHero', () => {
  it('renders movie title', () => {
    render(<MovieDetailHero {...defaultProps} />);
    expect(screen.getByText('Pushpa 2')).toBeInTheDocument();
  });

  it('renders status badge with correct label', () => {
    render(<MovieDetailHero {...defaultProps} />);
    expect(screen.getByText('In Theaters')).toBeInTheDocument();
  });

  it('renders different status badges', () => {
    render(<MovieDetailHero {...defaultProps} movieStatus="streaming" />);
    expect(screen.getByText('Streaming')).toBeInTheDocument();
  });

  it('renders backdrop image', () => {
    const { container } = render(<MovieDetailHero {...defaultProps} />);
    const img = container.querySelector('img[src="https://example.com/backdrop.jpg"]');
    expect(img).toBeInTheDocument();
  });

  it('renders poster image', () => {
    const { container } = render(<MovieDetailHero {...defaultProps} />);
    const img = container.querySelector('img[src="https://example.com/poster.jpg"]');
    expect(img).toBeInTheDocument();
  });

  it('falls back to posterUrl when backdropUrl is empty', () => {
    const { container } = render(<MovieDetailHero {...defaultProps} backdropUrl="" />);
    const imgs = container.querySelectorAll('img');
    // First img should use posterUrl as backdrop fallback
    expect(imgs[0]).toHaveAttribute('src', 'https://example.com/poster.jpg');
  });

  it('renders rating when > 0', () => {
    render(<MovieDetailHero {...defaultProps} />);
    expect(screen.getByText('4.2')).toBeInTheDocument();
    expect(screen.getByText('(150 reviews)')).toBeInTheDocument();
  });

  it('does not render rating when 0', () => {
    render(<MovieDetailHero {...defaultProps} rating={0} reviewCount={0} />);
    expect(screen.queryByText('reviews')).not.toBeInTheDocument();
  });

  it('renders year from release date', () => {
    render(<MovieDetailHero {...defaultProps} />);
    expect(screen.getByText('2024')).toBeInTheDocument();
  });

  it('does not render year when releaseDate is null', () => {
    render(<MovieDetailHero {...defaultProps} releaseDate={null} />);
    expect(screen.queryByText('2024')).not.toBeInTheDocument();
  });

  it('renders runtime', () => {
    render(<MovieDetailHero {...defaultProps} />);
    expect(screen.getByText('145m')).toBeInTheDocument();
  });

  it('does not render runtime when null', () => {
    render(<MovieDetailHero {...defaultProps} runtime={null} />);
    expect(screen.queryByText('145m')).not.toBeInTheDocument();
  });

  it('renders certification', () => {
    render(<MovieDetailHero {...defaultProps} />);
    expect(screen.getByText('U/A')).toBeInTheDocument();
  });

  it('does not render certification when null', () => {
    render(<MovieDetailHero {...defaultProps} certification={null} />);
    expect(screen.queryByText('U/A')).not.toBeInTheDocument();
  });

  it('does not render any image when both backdrop and poster are empty', () => {
    const { container } = render(<MovieDetailHero {...defaultProps} backdropUrl="" posterUrl="" />);
    // Only poster section image should also not render
    const imgs = container.querySelectorAll('img');
    expect(imgs.length).toBe(0);
  });
});

describe('buildGradientCss', () => {
  it('builds correct CSS gradient string', () => {
    const config = {
      colors: ['transparent', 'rgba(0,0,0,0.8)'],
      locations: [0, 1],
    };
    const result = buildGradientCss(config);
    expect(result).toBe('linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.8) 100%)');
  });

  it('handles multiple stops', () => {
    const config = {
      colors: ['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)'],
      locations: [0, 0.5, 1],
    };
    const result = buildGradientCss(config);
    expect(result).toBe(
      'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.8) 100%)',
    );
  });
});
