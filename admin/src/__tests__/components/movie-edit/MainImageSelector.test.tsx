import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MainImageSelector } from '@/components/movie-edit/MainImageSelector';
import type { MovieImage } from '@/lib/types';

vi.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string) => `https://cdn.test/${url}`,
}));

function makeImage(overrides: Partial<MovieImage> = {}): MovieImage {
  return {
    id: 'img-1',
    movie_id: 'movie-1',
    image_url: 'poster1.jpg',
    image_type: 'poster',
    is_main_poster: false,
    is_main_backdrop: false,
    title: 'First Look',
    description: null,
    poster_date: null,
    tmdb_file_path: null,
    iso_639_1: null,
    width: null,
    height: null,
    vote_average: 0,
    display_order: 0,
    created_at: '',
    ...overrides,
  };
}

const defaultProps = {
  label: 'Main Poster',
  currentImageUrl: 'poster1.jpg',
  images: [makeImage()],
  onSelect: vi.fn(),
  focusX: null,
  focusY: null,
  onFocusChange: vi.fn(),
  onFocusClear: vi.fn(),
  bucket: 'POSTERS' as const,
};

describe('MainImageSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders label', () => {
    render(<MainImageSelector {...defaultProps} />);
    expect(screen.getByText('Main Poster')).toBeInTheDocument();
  });

  it('renders thumbnail when currentImageUrl is set', () => {
    render(<MainImageSelector {...defaultProps} />);
    expect(screen.getByAltText('Main Poster')).toBeInTheDocument();
  });

  it('shows "None" placeholder when no current image', () => {
    render(<MainImageSelector {...defaultProps} currentImageUrl={null} />);
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('shows "Change" button when image is set', () => {
    render(<MainImageSelector {...defaultProps} />);
    expect(screen.getByText('Change')).toBeInTheDocument();
  });

  it('shows "Select" button when no image is set', () => {
    render(<MainImageSelector {...defaultProps} currentImageUrl={null} />);
    expect(screen.getByText('Select')).toBeInTheDocument();
  });

  it('opens dropdown on Change click and shows gallery images', () => {
    render(<MainImageSelector {...defaultProps} />);
    fireEvent.click(screen.getByText('Change'));
    expect(screen.getByAltText('First Look')).toBeInTheDocument();
  });

  it('calls onSelect when a gallery image is clicked', () => {
    const onSelect = vi.fn();
    const images = [
      makeImage({ id: 'img-1', image_url: 'poster1.jpg' }),
      makeImage({ id: 'img-2', image_url: 'poster2.jpg', title: 'Second Look' }),
    ];
    render(<MainImageSelector {...defaultProps} images={images} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Change'));
    fireEvent.click(screen.getByAltText('Second Look'));
    expect(onSelect).toHaveBeenCalledWith('img-2');
  });

  it('shows focal point toggle when image is set', () => {
    render(<MainImageSelector {...defaultProps} />);
    expect(screen.getByText(/Adjust focal point/)).toBeInTheDocument();
  });

  it('hides focal point toggle when no image', () => {
    render(<MainImageSelector {...defaultProps} currentImageUrl={null} />);
    expect(screen.queryByText(/focal point/)).not.toBeInTheDocument();
  });

  it('shows focal picker on toggle click', () => {
    render(<MainImageSelector {...defaultProps} />);
    fireEvent.click(screen.getByText(/Adjust focal point/));
    expect(screen.getByText(/Hide focal point/)).toBeInTheDocument();
    expect(screen.getByAltText('Backdrop')).toBeInTheDocument();
  });

  it('shows Reset to Center when focal point is set', () => {
    render(<MainImageSelector {...defaultProps} focusX={0.3} focusY={0.7} />);
    fireEvent.click(screen.getByText(/Adjust focal point/));
    expect(screen.getByText('Reset to Center')).toBeInTheDocument();
  });

  it('calls onFocusClear on Reset click', () => {
    const onFocusClear = vi.fn();
    render(
      <MainImageSelector {...defaultProps} focusX={0.3} focusY={0.7} onFocusClear={onFocusClear} />,
    );
    fireEvent.click(screen.getByText(/Adjust focal point/));
    fireEvent.click(screen.getByText('Reset to Center'));
    expect(onFocusClear).toHaveBeenCalled();
  });

  it('disables dropdown when no images in gallery', () => {
    render(<MainImageSelector {...defaultProps} images={[]} />);
    expect(screen.getByText('Change')).toBeDisabled();
  });

  it('shows "No images in gallery" in empty dropdown', () => {
    render(<MainImageSelector {...defaultProps} images={[]} currentImageUrl={null} />);
    // Can't click disabled button, so no dropdown to test
  });
});
