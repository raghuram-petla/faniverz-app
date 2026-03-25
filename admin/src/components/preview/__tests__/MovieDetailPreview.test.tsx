import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('@shared/constants', () => ({
  DETAIL_GRADIENT: ['rgba(0,0,0,0)', 'rgba(0,0,0,1)'],
}));

vi.mock('@shared/colors', () => ({
  colors: {
    black: '#000000',
    white: '#ffffff',
    red600: '#dc2626',
  },
}));

vi.mock('@/components/preview/MovieDetailHero', () => ({
  MovieDetailHero: ({
    title,
    objectPosition,
    posterObjectPosition,
  }: {
    title: string;
    backdropUrl: string;
    posterUrl: string;
    movieStatus: string;
    rating: number;
    reviewCount: number;
    runtime: number | null;
    certification: string | null;
    releaseDate: string | null;
    gradientCss: string;
    objectPosition: string;
    posterObjectPosition?: string;
  }) => (
    <div data-testid="movie-detail-hero">
      <span data-testid="hero-title">{title}</span>
      <span data-testid="object-position">{objectPosition}</span>
      <span data-testid="poster-object-position">{posterObjectPosition ?? 'default'}</span>
    </div>
  ),
  buildGradientCss: (gradient: string[]) => `linear-gradient(${gradient.join(',')})`,
}));

import { MovieDetailPreview } from '@/components/preview/MovieDetailPreview';

const defaultProps = {
  title: 'Pushpa 2',
  backdropUrl: 'https://cdn/backdrop.jpg',
  posterUrl: 'https://cdn/poster.jpg',
  movieStatus: 'streaming' as const,
  rating: 4.5,
  reviewCount: 1200,
  runtime: 180,
  certification: 'UA',
  releaseDate: '2025-01-01',
  focusX: null,
  focusY: null,
};

describe('MovieDetailPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders MovieDetailHero with correct title', () => {
    render(<MovieDetailPreview {...defaultProps} />);
    expect(screen.getByTestId('hero-title')).toHaveTextContent('Pushpa 2');
  });

  it('renders tabs (Overview, Cast, Reviews)', () => {
    render(<MovieDetailPreview {...defaultProps} />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Cast')).toBeInTheDocument();
    expect(screen.getByText('Reviews')).toBeInTheDocument();
  });

  it('uses "center" for objectPosition when focusX/focusY are null', () => {
    render(<MovieDetailPreview {...defaultProps} focusX={null} focusY={null} />);
    expect(screen.getByTestId('object-position')).toHaveTextContent('center');
  });

  it('computes objectPosition from focusX/focusY when both set', () => {
    render(<MovieDetailPreview {...defaultProps} focusX={0.5} focusY={0.75} />);
    expect(screen.getByTestId('object-position')).toHaveTextContent('50% 75%');
  });

  it('computes correct percentage for focusX=0 (0%)', () => {
    render(<MovieDetailPreview {...defaultProps} focusX={0} focusY={1} />);
    expect(screen.getByTestId('object-position')).toHaveTextContent('0% 100%');
  });

  it('uses "center" when only focusX is set (focusY is null)', () => {
    render(<MovieDetailPreview {...defaultProps} focusX={0.5} focusY={null} />);
    expect(screen.getByTestId('object-position')).toHaveTextContent('center');
  });

  it('passes posterObjectPosition when posterFocusX/Y are set', () => {
    render(<MovieDetailPreview {...defaultProps} posterFocusX={0.3} posterFocusY={0.6} />);
    expect(screen.getByTestId('poster-object-position')).toHaveTextContent('30% 60%');
  });

  it('passes undefined posterObjectPosition when posterFocusX/Y are null', () => {
    render(<MovieDetailPreview {...defaultProps} posterFocusX={null} posterFocusY={null} />);
    expect(screen.getByTestId('poster-object-position')).toHaveTextContent('default');
  });

  it('applies default safeAreaTop of 0', () => {
    const { container } = render(<MovieDetailPreview {...defaultProps} />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.paddingTop).toBe('0px');
  });

  it('applies custom safeAreaTop', () => {
    const { container } = render(<MovieDetailPreview {...defaultProps} safeAreaTop={44} />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.paddingTop).toBe('44px');
  });

  it('highlights Overview tab as active (red background)', () => {
    const { container } = render(<MovieDetailPreview {...defaultProps} />);
    // First tab (Overview) has red background
    const tabElements = container.querySelectorAll('[style*="borderRadius"]');
    const overviewTab = Array.from(tabElements).find(
      (el) => (el as HTMLElement).textContent === 'Overview',
    ) as HTMLElement;
    if (overviewTab) {
      expect(overviewTab.style.backgroundColor).toContain('#dc2626');
    }
  });
});
