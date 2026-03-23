jest.mock('@/styles/tabs/calendar.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/components/movie/MovieListItem', () => ({
  MovieListItem: ({ movie }: { movie: { title: string } }) => {
    const { Text } = require('react-native');
    return <Text>{movie.title}</Text>;
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { DateGroupItem } from '../DateGroupItem';

const makeMovie = (id: string, title: string) => ({
  id,
  title,
  in_theaters: true,
  premiere_date: null,
  release_date: '2025-03-15',
  poster_url: null,
  backdrop_url: null,
  rating: 4.0,
  review_count: 5,
  is_featured: false,
  genres: ['Action'],
  certification: 'UA' as const,
  runtime: 150,
  synopsis: '',
  director: 'Director',
  tmdb_id: null,
  tmdb_last_synced_at: null,
  original_language: null,
  backdrop_focus_x: null,
  backdrop_focus_y: null,
  poster_focus_x: null,
  poster_focus_y: null,
  poster_image_type: 'poster' as const,
  backdrop_image_type: 'backdrop' as const,
  spotlight_focus_x: null,
  spotlight_focus_y: null,
  detail_focus_x: null,
  detail_focus_y: null,
  imdb_id: null,
  title_te: null,
  synopsis_te: null,
  tagline: null,
  tmdb_status: null,
  tmdb_vote_average: null,
  tmdb_vote_count: null,
  budget: null,
  revenue: null,
  tmdb_popularity: null,
  spoken_languages: null,
  collection_id: null,
  collection_name: null,
  language_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
});

const baseProps = {
  item: {
    date: '2025-03-15',
    movies: [makeMovie('1', 'Pushpa 2'), makeMovie('2', 'Kalki')],
    movieDate: new Date('2025-03-15'),
  },
  today: (() => {
    const d = new Date('2025-03-15');
    d.setHours(0, 0, 0, 0);
    return d;
  })(),
  platformMap: {} as Record<string, never[]>,
};

describe('DateGroupItem', () => {
  it('renders the weekday name from the date', () => {
    render(<DateGroupItem {...baseProps} />);
    const weekday = baseProps.item.movieDate.toLocaleDateString('en-US', { weekday: 'long' });
    expect(screen.getByText(weekday)).toBeTruthy();
  });

  it('renders the full date string', () => {
    render(<DateGroupItem {...baseProps} />);
    const fullDate = baseProps.item.movieDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    expect(screen.getByText(fullDate)).toBeTruthy();
  });

  it('renders all movie cards', () => {
    render(<DateGroupItem {...baseProps} />);
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
    expect(screen.getByText('Kalki')).toBeTruthy();
  });

  it('shows today badge when movieDate matches today', () => {
    render(<DateGroupItem {...baseProps} />);
    expect(screen.getByText('TODAY')).toBeTruthy();
  });

  it('does not show today badge for past dates', () => {
    const pastProps = {
      ...baseProps,
      item: {
        ...baseProps.item,
        movieDate: new Date('2024-01-10'),
      },
      today: new Date('2025-03-15'),
    };
    render(<DateGroupItem {...pastProps} />);
    expect(screen.queryByText('TODAY')).toBeNull();
  });

  it('does not show today badge for future dates', () => {
    const futureProps = {
      ...baseProps,
      item: {
        ...baseProps.item,
        movieDate: new Date('2026-06-20'),
      },
      today: new Date('2025-03-15'),
    };
    render(<DateGroupItem {...futureProps} />);
    expect(screen.queryByText('TODAY')).toBeNull();
  });

  it('renders release count for single movie', () => {
    const singleMovieProps = {
      ...baseProps,
      item: {
        ...baseProps.item,
        movies: [makeMovie('1', 'Pushpa 2')],
      },
    };
    render(<DateGroupItem {...singleMovieProps} />);
    expect(screen.getByText('1 release')).toBeTruthy();
  });

  it('renders release count for multiple movies', () => {
    render(<DateGroupItem {...baseProps} />);
    expect(screen.getByText('2 releases')).toBeTruthy();
  });

  it('renders the day number from movieDate', () => {
    render(<DateGroupItem {...baseProps} />);
    expect(screen.getByText(String(baseProps.item.movieDate.getDate()))).toBeTruthy();
  });

  it('renders the abbreviated month from movieDate', () => {
    render(<DateGroupItem {...baseProps} />);
    const month = baseProps.item.movieDate
      .toLocaleDateString('en-US', { month: 'short' })
      .toUpperCase();
    expect(screen.getByText(month)).toBeTruthy();
  });
});
