jest.mock('@/styles/actorDetail.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string | null) => url,
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

  it('navigates to movie on card press', () => {
    const credits = [makeCredit('c1', 9.0, 'Top Movie')];
    render(<ActorKnownFor credits={credits} onMoviePress={onMoviePress} />);
    fireEvent.press(screen.getByTestId('known-for-m-c1'));
    expect(onMoviePress).toHaveBeenCalledWith('m-c1');
  });
});
