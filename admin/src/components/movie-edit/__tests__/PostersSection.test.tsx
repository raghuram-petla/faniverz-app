import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockOnAdd = vi.fn();
const mockOnRemove = vi.fn();
const mockOnSelectMainPoster = vi.fn();
const mockOnSelectMainBackdrop = vi.fn();
const mockOnPendingMainChange = vi.fn();
const mockSetForm = vi.fn();
const mockUpdateField = vi.fn();

vi.mock('@/components/common/Button', () => ({
  Button: ({
    children,
    onClick,
    icon,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    icon?: React.ReactNode;
  }) => (
    <button onClick={onClick} data-testid="add-btn">
      {icon}
      {children}
    </button>
  ),
}));

vi.mock('@/components/movie-edit/PosterGalleryCard', () => ({
  SectionHeading: ({
    title,
    action,
  }: {
    title: string;
    action?: React.ReactNode;
    icon?: unknown;
  }) => (
    <div>
      <h2 data-testid={`heading-${title.toLowerCase().replace(' ', '-')}`}>{title}</h2>
      {action}
    </div>
  ),
  PosterGalleryCard: ({
    poster,
    onRemove,
  }: {
    poster: { id: string; title?: string | null };
    onRemove: (id: string, isPending: boolean) => void;
  }) => (
    <div data-testid={`poster-card-${poster.id}`}>
      <span>{poster.title ?? poster.id}</span>
      <button onClick={() => onRemove(poster.id, false)} data-testid={`remove-${poster.id}`}>
        Remove
      </button>
    </div>
  ),
}));

vi.mock('@/components/movie-edit/PosterAddForm', () => ({
  PosterAddForm: ({
    onConfirm,
    onCancel,
  }: {
    hasNoPosters: boolean;
    posterCount: number;
    onConfirm: (poster: unknown, pendingId: string) => void;
    onCancel: () => void;
    onPendingMainChange: (url: string | null) => void;
  }) => (
    <div data-testid="poster-add-form">
      <button
        onClick={() =>
          onConfirm(
            {
              is_main_poster: false,
              image_url: 'https://cdn/img.jpg',
              image_type: 'poster',
              title: null,
              description: null,
              poster_date: null,
              is_main_backdrop: false,
              display_order: 0,
            },
            'pending-uuid',
          )
        }
        data-testid="confirm-add-btn"
      >
        Confirm Add
      </button>
      <button
        onClick={() =>
          onConfirm(
            {
              is_main_poster: true,
              image_url: 'https://cdn/main.jpg',
              image_type: 'poster',
              title: null,
              description: null,
              poster_date: null,
              is_main_backdrop: false,
              display_order: 0,
            },
            'main-pending-uuid',
          )
        }
        data-testid="confirm-add-main-btn"
      >
        Confirm Add Main
      </button>
      <button onClick={onCancel} data-testid="cancel-add-btn">
        Cancel
      </button>
    </div>
  ),
}));

vi.mock('@/components/movie-edit/MainImageSelector', () => ({
  MainImageSelector: ({
    label,
    currentImageUrl,
    onFocusChange,
    onFocusClear,
  }: {
    label: string;
    currentImageUrl: string;
    images: unknown[];
    onSelect: (id: string) => void;
    focusX?: number | null;
    focusY?: number | null;
    onFocusChange?: (x: number, y: number) => void;
    onFocusClear?: () => void;
    bucket?: string;
    aspectClass?: string;
    widthClass?: string;
    focalTargetAspect?: number;
    focalHideGradient?: boolean;
  }) => (
    <div data-testid={`main-image-${label.toLowerCase().replace(' ', '-')}`}>
      <span>{label}</span>
      <span>{currentImageUrl || 'no-image'}</span>
      {onFocusChange && (
        <button
          data-testid={`focus-change-${label.toLowerCase().replace(' ', '-')}`}
          onClick={() => onFocusChange(0.5, 0.3)}
        >
          Set Focus
        </button>
      )}
      {onFocusClear && (
        <button
          data-testid={`focus-clear-${label.toLowerCase().replace(' ', '-')}`}
          onClick={() => onFocusClear()}
        >
          Clear Focus
        </button>
      )}
    </div>
  ),
}));

import { PostersSection } from '@/components/movie-edit/PostersSection';
import type { MovieForm } from '@/hooks/useMovieEditState';

const makeForm = (overrides: Partial<MovieForm> = {}): MovieForm => ({
  title: 'Test',
  poster_url: '',
  backdrop_url: '',
  release_date: '',
  runtime: '',
  genres: [],
  certification: '',
  synopsis: '',
  in_theaters: false,
  premiere_date: '',
  original_language: '',
  is_featured: false,
  tmdb_id: '',
  tagline: '',
  backdrop_focus_x: null,
  backdrop_focus_y: null,
  poster_focus_x: null,
  poster_focus_y: null,
  ...overrides,
});

const makePoster = (id: string, type: 'poster' | 'backdrop' = 'poster', isMain = false) => ({
  id,
  movie_id: 'movie-1',
  image_url: `https://cdn/${id}.jpg`,
  title: null,
  description: null,
  poster_date: null,
  is_main_poster: isMain,
  is_main_backdrop: false,
  image_type: type,
  tmdb_file_path: null,
  iso_639_1: null,
  width: null,
  height: null,
  vote_average: 0,
  display_order: 0,
  created_at: '2024-01-01T00:00:00Z',
});

describe('PostersSection', () => {
  const defaultProps = {
    visiblePosters: [],
    onAdd: mockOnAdd,
    onRemove: mockOnRemove,
    onSelectMainPoster: mockOnSelectMainPoster,
    onSelectMainBackdrop: mockOnSelectMainBackdrop,
    savedMainPosterId: null,
    onPendingMainChange: mockOnPendingMainChange,
    form: makeForm(),
    setForm: mockSetForm,
    updateField: mockUpdateField,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Main Images section heading', () => {
    render(<PostersSection {...defaultProps} />);
    expect(screen.getByTestId('heading-main-images')).toBeInTheDocument();
  });

  it('renders Images section heading', () => {
    render(<PostersSection {...defaultProps} />);
    expect(screen.getByTestId('heading-images')).toBeInTheDocument();
  });

  it('renders Main Poster and Main Backdrop selectors', () => {
    render(<PostersSection {...defaultProps} />);
    expect(screen.getByTestId('main-image-main-poster')).toBeInTheDocument();
    expect(screen.getByTestId('main-image-main-backdrop')).toBeInTheDocument();
  });

  it('shows "No images added yet." when visiblePosters is empty', () => {
    render(<PostersSection {...defaultProps} />);
    expect(screen.getByText('No images added yet.')).toBeInTheDocument();
  });

  it('shows Add button when form is not showing', () => {
    render(<PostersSection {...defaultProps} />);
    expect(screen.getByTestId('add-btn')).toBeInTheDocument();
  });

  it('clicking Add shows PosterAddForm', () => {
    render(<PostersSection {...defaultProps} />);
    fireEvent.click(screen.getByTestId('add-btn'));
    expect(screen.getByTestId('poster-add-form')).toBeInTheDocument();
  });

  it('hides Add button while add form is open', () => {
    render(<PostersSection {...defaultProps} />);
    fireEvent.click(screen.getByTestId('add-btn'));
    expect(screen.queryByTestId('add-btn')).not.toBeInTheDocument();
  });

  it('clicking Cancel in PosterAddForm hides the form', () => {
    render(<PostersSection {...defaultProps} />);
    fireEvent.click(screen.getByTestId('add-btn'));
    expect(screen.getByTestId('poster-add-form')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cancel-add-btn'));
    expect(screen.queryByTestId('poster-add-form')).not.toBeInTheDocument();
  });

  it('confirming add calls onAdd and hides form', () => {
    render(<PostersSection {...defaultProps} />);
    fireEvent.click(screen.getByTestId('add-btn'));
    fireEvent.click(screen.getByTestId('confirm-add-btn'));
    expect(mockOnAdd).toHaveBeenCalled();
    expect(screen.queryByTestId('poster-add-form')).not.toBeInTheDocument();
  });

  it('confirming add with is_main_poster=false does not call onSelectMainPoster', () => {
    // The mocked PosterAddForm confirm button uses is_main_poster: false
    render(<PostersSection {...defaultProps} />);
    fireEvent.click(screen.getByTestId('add-btn'));
    fireEvent.click(screen.getByTestId('confirm-add-btn'));
    expect(mockOnSelectMainPoster).not.toHaveBeenCalled();
  });

  it('renders poster gallery cards when visiblePosters is non-empty', () => {
    const posters = [makePoster('img-1'), makePoster('img-2')];
    render(<PostersSection {...defaultProps} visiblePosters={posters} />);
    expect(screen.getByTestId('poster-card-img-1')).toBeInTheDocument();
    expect(screen.getByTestId('poster-card-img-2')).toBeInTheDocument();
  });

  it('passes onRemove to gallery cards', () => {
    const posters = [makePoster('img-1')];
    render(<PostersSection {...defaultProps} visiblePosters={posters} />);
    fireEvent.click(screen.getByTestId('remove-img-1'));
    expect(mockOnRemove).toHaveBeenCalledWith('img-1', false);
  });

  it('renders filter tabs: All, Posters, Backdrops', () => {
    render(<PostersSection {...defaultProps} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Posters')).toBeInTheDocument();
    expect(screen.getByText('Backdrops')).toBeInTheDocument();
  });

  it('clicking Posters tab filters to poster type only', () => {
    const posters = [makePoster('poster-1', 'poster'), makePoster('backdrop-1', 'backdrop')];
    render(<PostersSection {...defaultProps} visiblePosters={posters} />);
    fireEvent.click(screen.getByText('Posters'));
    expect(screen.getByTestId('poster-card-poster-1')).toBeInTheDocument();
    expect(screen.queryByTestId('poster-card-backdrop-1')).not.toBeInTheDocument();
  });

  it('clicking Backdrops tab filters to backdrop type only', () => {
    const posters = [makePoster('poster-1', 'poster'), makePoster('backdrop-1', 'backdrop')];
    render(<PostersSection {...defaultProps} visiblePosters={posters} />);
    fireEvent.click(screen.getByText('Backdrops'));
    expect(screen.getByTestId('poster-card-backdrop-1')).toBeInTheDocument();
    expect(screen.queryByTestId('poster-card-poster-1')).not.toBeInTheDocument();
  });

  it('clicking All tab shows all posters after filtering', () => {
    const posters = [makePoster('poster-1', 'poster'), makePoster('backdrop-1', 'backdrop')];
    render(<PostersSection {...defaultProps} visiblePosters={posters} />);
    fireEvent.click(screen.getByText('Posters'));
    fireEvent.click(screen.getByText('All'));
    expect(screen.getByTestId('poster-card-poster-1')).toBeInTheDocument();
    expect(screen.getByTestId('poster-card-backdrop-1')).toBeInTheDocument();
  });

  it('savedMainPosterId poster appears first in sorted order', () => {
    const posters = [
      { ...makePoster('img-a'), created_at: '2024-01-01T00:00:00Z' },
      { ...makePoster('img-b'), created_at: '2024-01-02T00:00:00Z' },
    ];
    const { container } = render(
      <PostersSection {...defaultProps} visiblePosters={posters} savedMainPosterId="img-a" />,
    );
    const cards = container.querySelectorAll('[data-testid^="poster-card-"]');
    expect(cards[0].getAttribute('data-testid')).toBe('poster-card-img-a');
  });

  it('sorts non-main poster after savedMainPosterId poster', () => {
    const posters = [
      { ...makePoster('img-new'), created_at: '2024-12-01T00:00:00Z' },
      { ...makePoster('img-main'), created_at: '2024-01-01T00:00:00Z' },
    ];
    const { container } = render(
      <PostersSection {...defaultProps} visiblePosters={posters} savedMainPosterId="img-main" />,
    );
    const cards = container.querySelectorAll('[data-testid^="poster-card-"]');
    expect(cards[0].getAttribute('data-testid')).toBe('poster-card-img-main');
    expect(cards[1].getAttribute('data-testid')).toBe('poster-card-img-new');
  });

  it('confirming add with is_main_poster=true calls onSelectMainPoster with pendingId', () => {
    render(<PostersSection {...defaultProps} />);
    fireEvent.click(screen.getByTestId('add-btn'));
    fireEvent.click(screen.getByTestId('confirm-add-main-btn'));
    expect(mockOnAdd).toHaveBeenCalled();
    expect(mockOnSelectMainPoster).toHaveBeenCalledWith('main-pending-uuid');
    expect(screen.queryByTestId('poster-add-form')).not.toBeInTheDocument();
  });

  it('renders poster count text via visible gallery', () => {
    const posters = [
      makePoster('p1', 'poster'),
      makePoster('p2', 'poster'),
      makePoster('p3', 'backdrop'),
    ];
    render(<PostersSection {...defaultProps} visiblePosters={posters} />);
    // All 3 visible in 'all' filter
    expect(screen.getByTestId('poster-card-p1')).toBeInTheDocument();
    expect(screen.getByTestId('poster-card-p2')).toBeInTheDocument();
    expect(screen.getByTestId('poster-card-p3')).toBeInTheDocument();
  });

  it('pending poster (no image_type) counts as poster in filter', () => {
    // A pending add has image_type as property in the pending add object
    // When image_type is undefined, it defaults to 'poster' in the filter
    const pendingPoster = {
      id: 'pending-1',
      movie_id: 'movie-1',
      image_url: 'https://cdn/pending.jpg',
      title: null,
      description: null,
      poster_date: null,
      is_main_poster: false,
      is_main_backdrop: false,
      tmdb_file_path: null,
      iso_639_1: null,
      width: null,
      height: null,
      vote_average: 0,
      display_order: 0,
      created_at: '2024-01-01T00:00:00Z',
      // no image_type — tests the 'poster' fallback in filter
    };
    render(
      <PostersSection
        {...defaultProps}
        visiblePosters={[
          pendingPoster as Parameters<typeof PostersSection>[0]['visiblePosters'][number],
        ]}
      />,
    );
    // Click "Posters" filter — pending poster (no image_type) should be included
    fireEvent.click(screen.getByText('Posters'));
    expect(screen.getByTestId('poster-card-pending-1')).toBeInTheDocument();
  });

  it('updateField prop is accepted without error', () => {
    expect(() =>
      render(<PostersSection {...defaultProps} updateField={mockUpdateField} />),
    ).not.toThrow();
  });

  it('calls setForm with poster focus coordinates when poster focus changes', () => {
    render(<PostersSection {...defaultProps} />);
    fireEvent.click(screen.getByTestId('focus-change-main-poster'));
    expect(mockSetForm).toHaveBeenCalled();
    // Verify the setForm updater produces correct result
    const updater = mockSetForm.mock.calls[0][0];
    const result = updater(makeForm());
    expect(result.poster_focus_x).toBe(0.5);
    expect(result.poster_focus_y).toBe(0.3);
  });

  it('calls setForm to clear poster focus', () => {
    render(<PostersSection {...defaultProps} />);
    fireEvent.click(screen.getByTestId('focus-clear-main-poster'));
    expect(mockSetForm).toHaveBeenCalled();
    const updater = mockSetForm.mock.calls[0][0];
    const result = updater(makeForm({ poster_focus_x: 0.5, poster_focus_y: 0.3 }));
    expect(result.poster_focus_x).toBeNull();
    expect(result.poster_focus_y).toBeNull();
  });

  it('calls setForm with backdrop focus coordinates when backdrop focus changes', () => {
    render(<PostersSection {...defaultProps} />);
    fireEvent.click(screen.getByTestId('focus-change-main-backdrop'));
    expect(mockSetForm).toHaveBeenCalled();
    const updater = mockSetForm.mock.calls[0][0];
    const result = updater(makeForm());
    expect(result.backdrop_focus_x).toBe(0.5);
    expect(result.backdrop_focus_y).toBe(0.3);
  });

  it('calls setForm to clear backdrop focus', () => {
    render(<PostersSection {...defaultProps} />);
    fireEvent.click(screen.getByTestId('focus-clear-main-backdrop'));
    expect(mockSetForm).toHaveBeenCalled();
    const updater = mockSetForm.mock.calls[0][0];
    const result = updater(makeForm({ backdrop_focus_x: 0.5, backdrop_focus_y: 0.3 }));
    expect(result.backdrop_focus_x).toBeNull();
    expect(result.backdrop_focus_y).toBeNull();
  });
});
