import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string) => url,
}));

const mockUseImageVariants = vi.fn();

vi.mock('@/hooks/useImageVariants', () => ({
  useImageVariants: (...args: unknown[]) => mockUseImageVariants(...args),
}));

vi.mock('lucide-react', () => ({
  Calendar: () => <span data-testid="calendar-icon" />,
  X: () => <span data-testid="x-icon" />,
  Loader2: ({ className }: { className?: string }) => (
    <span data-testid="loader" className={className} />
  ),
}));

import {
  PosterGalleryCard,
  PosterVariantStatus,
  SectionHeading,
} from '@/components/movie-edit/PosterGalleryCard';

const makeIdleVariants = () => ({
  variants: [],
  isChecking: false,
  readyCount: 0,
  totalCount: 0,
  recheck: vi.fn(),
});

const makePoster = (overrides = {}) => ({
  id: 'poster-1',
  image_url: 'https://cdn.example.com/poster.jpg',
  title: 'Test Poster',
  image_type: 'poster' as const,
  poster_date: null,
  is_main_poster: false,
  is_main_backdrop: false,
  ...overrides,
});

describe('PosterGalleryCard', () => {
  const onRemove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseImageVariants.mockReturnValue(makeIdleVariants());
  });

  it('renders poster image with alt text from title', () => {
    render(<PosterGalleryCard poster={makePoster()} onRemove={onRemove} />);
    const img = screen.getByAltText('Test Poster');
    expect(img).toBeInTheDocument();
  });

  it('uses "Image" as alt text when title is null', () => {
    render(<PosterGalleryCard poster={makePoster({ title: null })} onRemove={onRemove} />);
    expect(screen.getByAltText('Image')).toBeInTheDocument();
  });

  it('shows title in info section', () => {
    render(<PosterGalleryCard poster={makePoster()} onRemove={onRemove} />);
    expect(screen.getByText('Test Poster')).toBeInTheDocument();
  });

  it('shows "Untitled" when title is null', () => {
    render(<PosterGalleryCard poster={makePoster({ title: null })} onRemove={onRemove} />);
    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('shows poster_date when present', () => {
    render(
      <PosterGalleryCard poster={makePoster({ poster_date: '2024-01-15' })} onRemove={onRemove} />,
    );
    expect(screen.getByText('2024-01-15')).toBeInTheDocument();
  });

  it('does not show calendar icon when poster_date is null', () => {
    render(<PosterGalleryCard poster={makePoster({ poster_date: null })} onRemove={onRemove} />);
    expect(screen.queryByTestId('calendar-icon')).not.toBeInTheDocument();
  });

  it('calls onRemove with id and false (non-pending) when remove button clicked', () => {
    render(<PosterGalleryCard poster={makePoster({ id: 'poster-1' })} onRemove={onRemove} />);
    fireEvent.click(screen.getByRole('button', { name: /Remove Test Poster/i }));
    expect(onRemove).toHaveBeenCalledWith('poster-1', false);
  });

  it('calls onRemove with isPending=true for pending poster IDs', () => {
    render(
      <PosterGalleryCard poster={makePoster({ id: 'pending-poster-123' })} onRemove={onRemove} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Remove Test Poster/i }));
    expect(onRemove).toHaveBeenCalledWith('pending-poster-123', true);
  });

  it('disables remove button when poster is_main_poster', () => {
    render(<PosterGalleryCard poster={makePoster({ is_main_poster: true })} onRemove={onRemove} />);
    const btn = screen.getByRole('button', { name: /Remove/i });
    expect(btn).toBeDisabled();
  });

  it('disables remove button when poster is_main_backdrop', () => {
    render(
      <PosterGalleryCard poster={makePoster({ is_main_backdrop: true })} onRemove={onRemove} />,
    );
    const btn = screen.getByRole('button', { name: /Remove/i });
    expect(btn).toBeDisabled();
  });

  it('does not disable remove button for non-main poster', () => {
    render(<PosterGalleryCard poster={makePoster()} onRemove={onRemove} />);
    const btn = screen.getByRole('button', { name: /Remove/i });
    expect(btn).not.toBeDisabled();
  });

  it('uses aspect-video class for backdrop type', () => {
    render(
      <PosterGalleryCard poster={makePoster({ image_type: 'backdrop' })} onRemove={onRemove} />,
    );
    const img = screen.getByAltText('Test Poster');
    expect(img.className).toContain('aspect-video');
  });

  it('uses aspect-[2/3] class for poster type', () => {
    render(<PosterGalleryCard poster={makePoster({ image_type: 'poster' })} onRemove={onRemove} />);
    const img = screen.getByAltText('Test Poster');
    expect(img.className).toContain('aspect-[2/3]');
  });
});

describe('PosterVariantStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseImageVariants.mockReturnValue(makeIdleVariants());
  });

  it('shows loading spinner when isChecking and no variants yet', () => {
    mockUseImageVariants.mockReturnValue({
      variants: [],
      isChecking: true,
      readyCount: 0,
      totalCount: 0,
      recheck: vi.fn(),
    });
    render(<PosterVariantStatus imageUrl="https://example.com/img.jpg" imageType="poster" />);
    expect(screen.getByText('Checking...')).toBeInTheDocument();
  });

  it('does NOT show loading spinner when variants are present (even if isChecking)', () => {
    mockUseImageVariants.mockReturnValue({
      variants: [
        { label: 'SM', url: 'https://example.com/sm.jpg', width: 200, quality: 80, status: 'ok' },
      ],
      isChecking: true,
      readyCount: 1,
      totalCount: 1,
      recheck: vi.fn(),
    });
    render(<PosterVariantStatus imageUrl="https://example.com/img.jpg" imageType="poster" />);
    expect(screen.queryByText('Checking...')).not.toBeInTheDocument();
  });

  it('renders variant status dots when variants are available', () => {
    mockUseImageVariants.mockReturnValue({
      variants: [
        { label: 'SM', url: 'https://example.com/sm.jpg', width: 200, quality: 80, status: 'ok' },
        {
          label: 'MD',
          url: 'https://example.com/md.jpg',
          width: 400,
          quality: 80,
          status: 'missing',
        },
        {
          label: 'LG',
          url: 'https://example.com/lg.jpg',
          width: 800,
          quality: 80,
          status: 'error',
        },
      ],
      isChecking: false,
      readyCount: 1,
      totalCount: 3,
      recheck: vi.fn(),
    });
    render(<PosterVariantStatus imageUrl="https://example.com/img.jpg" imageType="poster" />);
    expect(screen.getByText('SM')).toBeInTheDocument();
    expect(screen.getByText('MD')).toBeInTheDocument();
    expect(screen.getByText('LG')).toBeInTheDocument();
  });

  it('shows spinner for variants with "checking" status', () => {
    mockUseImageVariants.mockReturnValue({
      variants: [
        {
          label: 'SM',
          url: 'https://example.com/sm.jpg',
          width: 200,
          quality: 80,
          status: 'checking',
        },
      ],
      isChecking: true,
      readyCount: 0,
      totalCount: 1,
      recheck: vi.fn(),
    });
    render(<PosterVariantStatus imageUrl="https://example.com/img.jpg" imageType="poster" />);
    // Variants exist so no "Checking..." text — the inline loader per-variant appears
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('uses BACKDROPS bucket when imageType is backdrop', () => {
    render(<PosterVariantStatus imageUrl="https://example.com/img.jpg" imageType="backdrop" />);
    expect(mockUseImageVariants).toHaveBeenCalledWith(
      'https://example.com/img.jpg',
      'backdrop',
      'BACKDROPS',
    );
  });

  it('uses POSTERS bucket when imageType is poster', () => {
    render(<PosterVariantStatus imageUrl="https://example.com/img.jpg" imageType="poster" />);
    expect(mockUseImageVariants).toHaveBeenCalledWith(
      'https://example.com/img.jpg',
      'poster',
      'POSTERS',
    );
  });

  it('renders empty variant list container when variants are empty and not checking', () => {
    render(<PosterVariantStatus imageUrl="https://example.com/img.jpg" imageType="poster" />);
    expect(screen.getByTestId('poster-variant-status')).toBeInTheDocument();
  });

  it('uses bucket override when provided', () => {
    render(
      <PosterVariantStatus
        imageUrl="https://example.com/img.jpg"
        bucket="PLATFORMS"
        variantType="photo"
      />,
    );
    expect(mockUseImageVariants).toHaveBeenCalledWith(
      'https://example.com/img.jpg',
      'photo',
      'PLATFORMS',
    );
  });
});

describe('SectionHeading', () => {
  it('renders title text', () => {
    const Icon = () => <svg data-testid="icon" />;
    render(<SectionHeading icon={Icon} title="My Section" />);
    expect(screen.getByText('My Section')).toBeInTheDocument();
  });

  it('renders action slot when provided', () => {
    const Icon = () => <svg />;
    render(<SectionHeading icon={Icon} title="Section" action={<button>Add</button>} />);
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('does not render action slot when not provided', () => {
    const Icon = () => <svg />;
    render(<SectionHeading icon={Icon} title="Section" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
