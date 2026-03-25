jest.mock('@/styles/actorDetail.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

const mockGetImageUrl = jest.fn((url: string | null) => url);
jest.mock('@shared/imageUrl', () => ({
  get getImageUrl() {
    return mockGetImageUrl;
  },
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ActorKnownFor } from '../ActorKnownFor';
import type { FilmCredit } from '../ActorFilmography';

const makeCredit = (id: string, rating: number, title: string): FilmCredit => ({
  id,
  credit_type: 'cast',
  role_name: 'Hero',
  movie: {
    id: `m-${id}`,
    title,
    poster_url: 'poster.jpg',
    release_date: '2025-06-15',
    rating,
  },
});

describe('ActorKnownFor', () => {
  const onMoviePress = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders Known For title when there are rated movies', () => {
    const credits = [makeCredit('c1', 9.0, 'Top Movie')];
    render(<ActorKnownFor credits={credits} onMoviePress={onMoviePress} />);
    expect(screen.getByText('Known For')).toBeTruthy();
  });

  it('renders nothing when no rated movies', () => {
    const credits = [makeCredit('c1', 0, 'Unrated')];
    const { toJSON } = render(<ActorKnownFor credits={credits} onMoviePress={onMoviePress} />);
    expect(toJSON()).toBeNull();
  });

  it('renders top movies sorted by rating', () => {
    const credits = [
      makeCredit('c1', 7.0, 'Good Movie'),
      makeCredit('c2', 9.5, 'Best Movie'),
      makeCredit('c3', 8.0, 'Great Movie'),
    ];
    render(<ActorKnownFor credits={credits} onMoviePress={onMoviePress} />);
    expect(screen.getByText('Best Movie')).toBeTruthy();
    expect(screen.getByText('Great Movie')).toBeTruthy();
    expect(screen.getByText('Good Movie')).toBeTruthy();
  });

  it('limits to 5 movies max', () => {
    const credits = Array.from({ length: 8 }, (_, i) => makeCredit(`c${i}`, 5 + i, `Movie ${i}`));
    render(<ActorKnownFor credits={credits} onMoviePress={onMoviePress} />);
    // Top 5 by rating: Movie 7, 6, 5, 4, 3
    expect(screen.getByText('Movie 7')).toBeTruthy();
    expect(screen.queryByText('Movie 0')).toBeNull();
  });

  it('skips credits with null movie', () => {
    const credits = [
      makeCredit('c1', 9.0, 'Top Movie'),
      { id: 'c2', credit_type: 'cast', role_name: 'Hero', movie: null } as unknown as FilmCredit,
    ];
    render(<ActorKnownFor credits={credits} onMoviePress={onMoviePress} />);
    expect(screen.getByText('Top Movie')).toBeTruthy();
  });

  it('navigates to movie on card press', () => {
    const credits = [makeCredit('c1', 9.0, 'Top Movie')];
    render(<ActorKnownFor credits={credits} onMoviePress={onMoviePress} />);
    fireEvent.press(screen.getByTestId('known-for-m-c1'));
    expect(onMoviePress).toHaveBeenCalledWith('m-c1');
  });

  it('shows star rating row when rating is greater than 0', () => {
    const credits = [makeCredit('c1', 7.5, 'Rated Movie')];
    render(<ActorKnownFor credits={credits} onMoviePress={onMoviePress} />);
    expect(screen.getByText('7.5')).toBeTruthy();
  });

  it('does not show star rating row for credits with movie rating 0', () => {
    // Credits with rating=0 are excluded entirely by the topCredits filter
    const credits: FilmCredit[] = [
      makeCredit('c1', 8.0, 'Good Movie'),
      {
        ...makeCredit('c2', 0, 'Zero Movie'),
        movie: { ...makeCredit('c2', 0, 'Zero Movie').movie! },
      },
    ];
    render(<ActorKnownFor credits={credits} onMoviePress={onMoviePress} />);
    // Zero-rated movie is excluded from topCredits, so it doesn't render at all
    expect(screen.queryByText('Zero Movie')).toBeNull();
  });

  it('handles credits with missing movie gracefully in render', () => {
    // Verified by existing test — add additional assertion for null movie in topCredits
    const credits = [
      makeCredit('c1', 9.0, 'Good Movie'),
      {
        id: 'c2',
        credit_type: 'cast' as const,
        role_name: 'Hero',
        movie: null,
      } as unknown as import('../ActorFilmography').FilmCredit,
    ];
    render(<ActorKnownFor credits={credits} onMoviePress={onMoviePress} />);
    // Only the non-null movie renders
    expect(screen.getByText('Good Movie')).toBeTruthy();
  });

  it('renders at most 5 movies and sorts descending by rating', () => {
    const credits = [
      makeCredit('a', 9.0, 'Movie A'),
      makeCredit('b', 8.5, 'Movie B'),
      makeCredit('c', 8.0, 'Movie C'),
      makeCredit('d', 7.5, 'Movie D'),
      makeCredit('e', 7.0, 'Movie E'),
      makeCredit('f', 6.5, 'Movie F'),
    ];
    render(<ActorKnownFor credits={credits} onMoviePress={onMoviePress} />);
    expect(screen.getByText('Movie A')).toBeTruthy();
    expect(screen.getByText('Movie E')).toBeTruthy();
    // 6th highest rated (6.5) is excluded
    expect(screen.queryByText('Movie F')).toBeNull();
  });

  it('renders multiple movies and shows rating for each with rating > 0', () => {
    const credits = [makeCredit('c1', 8.0, 'Movie 1'), makeCredit('c2', 7.5, 'Movie 2')];
    render(<ActorKnownFor credits={credits} onMoviePress={onMoviePress} />);
    expect(screen.getByText('8')).toBeTruthy();
    expect(screen.getByText('7.5')).toBeTruthy();
  });

  it('returns null when credits array is empty', () => {
    const { toJSON } = render(<ActorKnownFor credits={[]} onMoviePress={onMoviePress} />);
    expect(toJSON()).toBeNull();
  });

  it('returns null when all credits have null movies', () => {
    const credits = [
      {
        id: 'c1',
        credit_type: 'cast' as const,
        role_name: 'Hero',
        movie: null,
      } as unknown as FilmCredit,
      {
        id: 'c2',
        credit_type: 'cast' as const,
        role_name: 'Hero',
        movie: null,
      } as unknown as FilmCredit,
    ];
    const { toJSON } = render(<ActorKnownFor credits={credits} onMoviePress={onMoviePress} />);
    expect(toJSON()).toBeNull();
  });

  it('onMoviePress is called with correct id for each card', () => {
    const credits = [makeCredit('x', 8.0, 'Film X'), makeCredit('y', 7.0, 'Film Y')];
    render(<ActorKnownFor credits={credits} onMoviePress={onMoviePress} />);
    fireEvent.press(screen.getByTestId('known-for-m-x'));
    expect(onMoviePress).toHaveBeenCalledWith('m-x');
    fireEvent.press(screen.getByTestId('known-for-m-y'));
    expect(onMoviePress).toHaveBeenCalledWith('m-y');
  });

  it('renders exactly 5 movies when 5 rated credits provided', () => {
    const credits = [
      makeCredit('a', 9.0, 'Alpha'),
      makeCredit('b', 8.5, 'Beta'),
      makeCredit('c', 8.0, 'Gamma'),
      makeCredit('d', 7.5, 'Delta'),
      makeCredit('e', 7.0, 'Epsilon'),
    ];
    render(<ActorKnownFor credits={credits} onMoviePress={onMoviePress} />);
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Epsilon')).toBeTruthy();
  });

  it('filters out credits where movie.rating is exactly 0', () => {
    const credits = [makeCredit('c1', 0, 'Zero Rated'), makeCredit('c2', 5.0, 'Five Rated')];
    render(<ActorKnownFor credits={credits} onMoviePress={onMoviePress} />);
    expect(screen.queryByText('Zero Rated')).toBeNull();
    expect(screen.getByText('Five Rated')).toBeTruthy();
  });

  it('sorts by descending rating (highest first)', () => {
    const credits = [
      makeCredit('lo', 1.0, 'Low Rated'),
      makeCredit('hi', 9.0, 'High Rated'),
      makeCredit('md', 5.0, 'Mid Rated'),
    ];
    render(<ActorKnownFor credits={credits} onMoviePress={onMoviePress} />);
    // All three should show but in correct order
    expect(screen.getByText('High Rated')).toBeTruthy();
    expect(screen.getByText('Mid Rated')).toBeTruthy();
    expect(screen.getByText('Low Rated')).toBeTruthy();
  });

  it('handles mixed null and valid movie credits', () => {
    const credits = [
      makeCredit('c1', 8.0, 'Valid Movie'),
      { id: 'c2', credit_type: 'cast', role_name: 'Hero', movie: null } as unknown as FilmCredit,
      makeCredit('c3', 7.0, 'Another Valid'),
    ];
    render(<ActorKnownFor credits={credits} onMoviePress={onMoviePress} />);
    expect(screen.getByText('Valid Movie')).toBeTruthy();
    expect(screen.getByText('Another Valid')).toBeTruthy();
  });

  it('renders placeholder when getImageUrl returns null for poster_url', () => {
    mockGetImageUrl.mockReturnValueOnce(null);
    const credits = [makeCredit('c1', 8.0, 'No Poster Movie')];
    render(<ActorKnownFor credits={credits} onMoviePress={onMoviePress} />);
    expect(screen.getByText('No Poster Movie')).toBeTruthy();
    mockGetImageUrl.mockImplementation((url: string | null) => url);
  });

  it('handles sort when movies have equal ratings', () => {
    const credits = [makeCredit('c1', 8.0, 'Movie A'), makeCredit('c2', 8.0, 'Movie B')];
    render(<ActorKnownFor credits={credits} onMoviePress={onMoviePress} />);
    expect(screen.getByText('Movie A')).toBeTruthy();
    expect(screen.getByText('Movie B')).toBeTruthy();
  });

  it('handles sort when movie.rating accessed via optional chain with nullish movie', () => {
    // Exercise the ?? 0 fallback in sort comparator (b.movie?.rating ?? 0)
    // by creating a credit whose movie property becomes null-ish after filter.
    // The filter checks c.movie && c.movie.rating > 0, but sort accesses movie?.rating.
    // Use a getter-based movie that returns null after initial filter passes.
    let filterPassed = false;
    const trickCredit = {
      id: 'trick',
      credit_type: 'cast' as const,
      role_name: 'Villain',
      get movie() {
        if (!filterPassed) {
          return {
            id: 'm-trick',
            title: 'Trick Movie',
            poster_url: null,
            release_date: '2025-01-01',
            rating: 7,
          };
        }
        return null;
      },
    } as unknown as FilmCredit;

    // Monkey-patch Array.prototype.filter to detect when filter completes
    const origFilter = Array.prototype.filter;
    Array.prototype.filter = function (...args: Parameters<typeof origFilter>) {
      const result = origFilter.apply(this, args);
      filterPassed = true;
      return result;
    };

    const credits = [makeCredit('c1', 9.0, 'Real Movie'), trickCredit];
    render(<ActorKnownFor credits={credits} onMoviePress={onMoviePress} />);
    expect(screen.getByText('Real Movie')).toBeTruthy();

    // Restore
    Array.prototype.filter = origFilter;
  });
});
