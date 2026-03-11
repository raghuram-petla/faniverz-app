jest.mock('@/styles/actorDetail.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string | null) => url,
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ActorFilmography } from '../ActorFilmography';
import type { FilmCredit } from '../ActorFilmography';

const makeCredit = (overrides: Partial<FilmCredit> = {}): FilmCredit => ({
  id: 'c1',
  credit_type: 'cast',
  role_name: 'Hero',
  movie: {
    id: 'm1',
    title: 'Test Movie',
    poster_url: 'poster.jpg',
    release_date: '2025-06-15',
    rating: 8.0,
  },
  ...overrides,
});

describe('ActorFilmography', () => {
  const onMoviePress = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders filmography title and count badge', () => {
    render(<ActorFilmography credits={[makeCredit()]} onMoviePress={onMoviePress} />);
    expect(screen.getByText('Filmography')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('renders empty state when no credits', () => {
    render(<ActorFilmography credits={[]} onMoviePress={onMoviePress} />);
    expect(screen.getByText('No movies found')).toBeTruthy();
  });

  it('renders movie title and year', () => {
    render(<ActorFilmography credits={[makeCredit()]} onMoviePress={onMoviePress} />);
    expect(screen.getByText('Test Movie')).toBeTruthy();
    expect(screen.getByText('2025')).toBeTruthy();
  });

  it('shows "as Role" for cast credits', () => {
    render(<ActorFilmography credits={[makeCredit()]} onMoviePress={onMoviePress} />);
    expect(screen.getByText('as Hero')).toBeTruthy();
  });

  it('shows role name without "as" for crew credits', () => {
    render(
      <ActorFilmography
        credits={[makeCredit({ credit_type: 'crew', role_name: 'Director' })]}
        onMoviePress={onMoviePress}
      />,
    );
    expect(screen.getByText('Director')).toBeTruthy();
  });

  it('navigates to movie on card press', () => {
    render(<ActorFilmography credits={[makeCredit()]} onMoviePress={onMoviePress} />);
    fireEvent.press(screen.getByTestId('film-card-m1'));
    expect(onMoviePress).toHaveBeenCalledWith('m1');
  });

  it('shows rating when > 0', () => {
    render(<ActorFilmography credits={[makeCredit()]} onMoviePress={onMoviePress} />);
    expect(screen.getByText('8')).toBeTruthy();
  });

  it('skips credits with no movie', () => {
    render(
      <ActorFilmography credits={[makeCredit({ movie: null })]} onMoviePress={onMoviePress} />,
    );
    expect(screen.queryByTestId('film-card-m1')).toBeNull();
  });
});
