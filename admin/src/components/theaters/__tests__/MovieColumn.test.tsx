import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockOnToggle = vi.fn();
const mockOnRevert = vi.fn();
const mockOnDateChange = vi.fn();

vi.mock('@/components/theaters/MovieListItem', () => ({
  MovieListItem: ({
    id,
    title,
    isOn,
    pendingDate,
    onToggle,
    onRevert,
    onDateChange,
    dateLabel,
    subtitle,
  }: {
    id: string;
    title: string;
    posterUrl: string | null;
    releaseDate: string | null;
    isOn: boolean;
    pendingDate?: string;
    onToggle: (date: string) => void;
    onRevert: () => void;
    onDateChange: (date: string) => void;
    dateLabel?: string;
    maxDate?: string;
    minDate?: string;
    subtitle?: string;
  }) => (
    <div data-testid={`movie-item-${id}`}>
      <span data-testid={`title-${id}`}>{title}</span>
      <span data-testid={`ison-${id}`}>{isOn ? 'on' : 'off'}</span>
      {pendingDate && <span data-testid={`pending-date-${id}`}>{pendingDate}</span>}
      {subtitle && <span data-testid={`subtitle-${id}`}>{subtitle}</span>}
      {dateLabel && <span data-testid={`date-label-${id}`}>{dateLabel}</span>}
      <button onClick={() => onToggle('2025-01-01')} data-testid={`toggle-${id}`}>
        Toggle
      </button>
      <button onClick={onRevert} data-testid={`revert-${id}`}>
        Revert
      </button>
      <button onClick={() => onDateChange('2025-06-01')} data-testid={`date-change-${id}`}>
        Change Date
      </button>
    </div>
  ),
}));

import { MovieColumn } from '@/components/theaters/MovieColumn';
import type { Movie } from '@/lib/types';

const makeMovie = (id: string, title: string, overrides: Partial<Movie> = {}): Movie =>
  ({
    id,
    title,
    poster_url: null,
    release_date: '2024-01-01',
    in_theaters: false,
    tmdb_id: null,
    ...overrides,
  }) as Movie;

describe('MovieColumn', () => {
  const defaultProps = {
    title: 'In Theaters',
    movies: [],
    isLoading: false,
    emptyText: 'No movies in theaters',
    isEffectivelyOn: vi.fn(() => false),
    getPendingDate: vi.fn(() => undefined),
    onToggle: mockOnToggle,
    onRevert: mockOnRevert,
    onDateChange: mockOnDateChange,
    dateLabel: 'Start Date',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps.isEffectivelyOn.mockReturnValue(false);
    defaultProps.getPendingDate.mockReturnValue(undefined);
  });

  it('renders the column title', () => {
    render(<MovieColumn {...defaultProps} />);
    expect(screen.getByText('In Theaters')).toBeInTheDocument();
  });

  it('shows loading spinner when isLoading is true', () => {
    const { container } = render(<MovieColumn {...defaultProps} isLoading />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('hides movie count when loading', () => {
    render(<MovieColumn {...defaultProps} isLoading />);
    expect(screen.queryByText('(0)')).not.toBeInTheDocument();
  });

  it('shows movie count when not loading', () => {
    render(<MovieColumn {...defaultProps} />);
    expect(screen.getByText('(0)')).toBeInTheDocument();
  });

  it('shows correct count for multiple movies', () => {
    const movies = [makeMovie('m1', 'Movie 1'), makeMovie('m2', 'Movie 2')];
    render(<MovieColumn {...defaultProps} movies={movies} />);
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('shows empty text when movies list is empty', () => {
    render(<MovieColumn {...defaultProps} />);
    expect(screen.getByText('No movies in theaters')).toBeInTheDocument();
  });

  it('does not show empty text when loading', () => {
    render(<MovieColumn {...defaultProps} isLoading />);
    expect(screen.queryByText('No movies in theaters')).not.toBeInTheDocument();
  });

  it('renders movie list items when movies are present', () => {
    const movies = [makeMovie('m1', 'Action Movie'), makeMovie('m2', 'Drama Film')];
    render(<MovieColumn {...defaultProps} movies={movies} />);
    expect(screen.getByTestId('movie-item-m1')).toBeInTheDocument();
    expect(screen.getByTestId('movie-item-m2')).toBeInTheDocument();
  });

  it('passes isEffectivelyOn result to each movie item', () => {
    const movies = [makeMovie('m1', 'Movie A'), makeMovie('m2', 'Movie B')];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (defaultProps.isEffectivelyOn as any).mockImplementation((id: string) => id === 'm1');
    render(<MovieColumn {...defaultProps} movies={movies} />);
    expect(screen.getByTestId('ison-m1').textContent).toBe('on');
    expect(screen.getByTestId('ison-m2').textContent).toBe('off');
  });

  it('passes pendingDate to each movie item', () => {
    const movies = [makeMovie('m1', 'Movie A')];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (defaultProps.getPendingDate as any).mockImplementation((id: string) =>
      id === 'm1' ? '2025-03-01' : undefined,
    );
    render(<MovieColumn {...defaultProps} movies={movies} />);
    expect(screen.getByTestId('pending-date-m1').textContent).toBe('2025-03-01');
  });

  it('calls onToggle with movie and default date when toggle is clicked', () => {
    const movie = makeMovie('m1', 'Toggle Movie');
    render(<MovieColumn {...defaultProps} movies={[movie]} />);
    fireEvent.click(screen.getByTestId('toggle-m1'));
    expect(mockOnToggle).toHaveBeenCalledWith(movie, '2025-01-01');
  });

  it('calls onRevert with movieId when revert is clicked', () => {
    const movie = makeMovie('m1', 'Revert Movie');
    render(<MovieColumn {...defaultProps} movies={[movie]} />);
    fireEvent.click(screen.getByTestId('revert-m1'));
    expect(mockOnRevert).toHaveBeenCalledWith('m1');
  });

  it('calls onDateChange with movieId and date when date changes', () => {
    const movie = makeMovie('m1', 'Date Movie');
    render(<MovieColumn {...defaultProps} movies={[movie]} />);
    fireEvent.click(screen.getByTestId('date-change-m1'));
    expect(mockOnDateChange).toHaveBeenCalledWith('m1', '2025-06-01');
  });

  it('passes dateLabel to movie items', () => {
    const movies = [makeMovie('m1', 'Movie')];
    render(<MovieColumn {...defaultProps} movies={movies} dateLabel="Premiere Date" />);
    expect(screen.getByTestId('date-label-m1').textContent).toBe('Premiere Date');
  });

  it('passes getSubtitle result to movie items', () => {
    const movies = [makeMovie('m1', 'Movie')];
    const getSubtitle = vi.fn(() => 'Re-release');
    render(<MovieColumn {...defaultProps} movies={movies} getSubtitle={getSubtitle} />);
    expect(screen.getByTestId('subtitle-m1').textContent).toBe('Re-release');
    expect(getSubtitle).toHaveBeenCalledWith(movies[0]);
  });

  it('does not render subtitle when getSubtitle is not provided', () => {
    const movies = [makeMovie('m1', 'Movie')];
    render(<MovieColumn {...defaultProps} movies={movies} />);
    expect(screen.queryByTestId('subtitle-m1')).not.toBeInTheDocument();
  });

  it('uses section heading element', () => {
    const { container } = render(<MovieColumn {...defaultProps} />);
    expect(container.querySelector('section')).toBeInTheDocument();
    expect(container.querySelector('h2')).toBeInTheDocument();
  });
});
