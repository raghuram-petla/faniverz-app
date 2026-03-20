import { render, screen } from '@testing-library/react';
import { MovieColumn } from '@/components/theaters/MovieColumn';
import type { Movie } from '@/lib/types';

vi.mock('@/components/theaters/MovieListItem', () => ({
  MovieListItem: ({ title, dateLabel }: { title: string; dateLabel: string }) => (
    <div data-testid={`movie-item-${title}`}>
      {title} — {dateLabel}
    </div>
  ),
}));

const mockMovie: Movie = {
  id: 'movie-1',
  tmdb_id: null,
  title: 'Test Movie',
  poster_url: null,
  backdrop_url: null,
  release_date: '2026-03-01',
  runtime: 120,
  genres: [],
  certification: null,
  synopsis: null,
  director: null,
  in_theaters: true,
  premiere_date: null,
  original_language: 'te',
  backdrop_focus_x: null,
  backdrop_focus_y: null,
  poster_focus_x: null,
  poster_focus_y: null,
  spotlight_focus_x: null,
  spotlight_focus_y: null,
  detail_focus_x: null,
  detail_focus_y: null,
  rating: 0,
  review_count: 0,
  is_featured: false,
  tmdb_last_synced_at: null,
  trailer_url: null,
  created_at: '',
  updated_at: '',
};

const defaultProps = {
  title: 'In Theaters',
  movies: [] as Movie[],
  isLoading: false,
  emptyText: 'No movies',
  isEffectivelyOn: () => true,
  getPendingDate: () => undefined,
  onToggle: vi.fn(),
  onRevert: vi.fn(),
  onDateChange: vi.fn(),
  dateLabel: 'End date',
};

describe('MovieColumn', () => {
  it('renders title', () => {
    render(<MovieColumn {...defaultProps} />);
    expect(screen.getByText('In Theaters')).toBeInTheDocument();
  });

  it('shows loading spinner when isLoading', () => {
    render(<MovieColumn {...defaultProps} isLoading={true} />);
    expect(screen.queryByText('No movies')).not.toBeInTheDocument();
  });

  it('shows empty text when no movies', () => {
    render(<MovieColumn {...defaultProps} />);
    expect(screen.getByText('No movies')).toBeInTheDocument();
  });

  it('renders count when not loading', () => {
    render(<MovieColumn {...defaultProps} movies={[mockMovie]} />);
    expect(screen.getByText('(1)')).toBeInTheDocument();
  });

  it('renders movie items', () => {
    render(<MovieColumn {...defaultProps} movies={[mockMovie]} />);
    expect(screen.getByTestId('movie-item-Test Movie')).toBeInTheDocument();
  });

  it('passes dateLabel to movie items', () => {
    render(<MovieColumn {...defaultProps} movies={[mockMovie]} />);
    expect(screen.getByText('Test Movie — End date')).toBeInTheDocument();
  });
});
