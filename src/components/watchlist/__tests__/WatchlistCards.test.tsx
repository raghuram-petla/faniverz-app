import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AvailableCard, UpcomingCard, WatchedCard } from '../WatchlistCards';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('@/features/watchlist/hooks', () => ({
  useWatchlistMutations: () => ({
    remove: { mutate: jest.fn() },
    markWatched: { mutate: jest.fn() },
    moveBack: { mutate: jest.fn() },
  }),
}));
jest.mock('@shared/movieStatus', () => ({
  deriveMovieStatus: () => 'in_theaters',
}));
jest.mock('@/constants', () => ({
  getMovieStatusLabel: () => 'In Theaters',
  getMovieStatusColor: () => '#dc2626',
}));

const mockStyles = new Proxy({}, { get: () => ({}) });

const mockEntry = {
  movie: {
    id: 'movie-1',
    title: 'Pushpa 2',
    poster_url: 'https://example.com/poster.jpg',
    rating: 4.5,
    genres: ['Action', 'Drama'],
    release_date: '2024-12-05',
  },
} as any;

describe('AvailableCard', () => {
  it('renders movie title', () => {
    render(<AvailableCard entry={mockEntry} userId="u1" styles={mockStyles} />);
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('renders "Remove from watchlist" accessibility label', () => {
    render(<AvailableCard entry={mockEntry} userId="u1" styles={mockStyles} />);
    expect(screen.getByLabelText('Remove from watchlist')).toBeTruthy();
  });

  it('renders "Mark as watched" accessibility label', () => {
    render(<AvailableCard entry={mockEntry} userId="u1" styles={mockStyles} />);
    expect(screen.getByLabelText('Mark as watched')).toBeTruthy();
  });
});

describe('UpcomingCard', () => {
  it('renders movie title', () => {
    render(<UpcomingCard entry={mockEntry} userId="u1" styles={mockStyles} />);
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('renders "Soon" badge text', () => {
    render(<UpcomingCard entry={mockEntry} userId="u1" styles={mockStyles} />);
    expect(screen.getByText('Soon')).toBeTruthy();
  });
});

describe('WatchedCard', () => {
  it('renders movie title', () => {
    render(<WatchedCard entry={mockEntry} userId="u1" styles={mockStyles} />);
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('renders "Move back to watchlist" accessibility label', () => {
    render(<WatchedCard entry={mockEntry} userId="u1" styles={mockStyles} />);
    expect(screen.getByLabelText('Move back to watchlist')).toBeTruthy();
  });

  it('renders "Remove from watched" accessibility label', () => {
    render(<WatchedCard entry={mockEntry} userId="u1" styles={mockStyles} />);
    expect(screen.getByLabelText('Remove from watched')).toBeTruthy();
  });
});
