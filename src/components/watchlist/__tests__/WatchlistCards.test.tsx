/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AvailableCard, UpcomingCard, WatchedCard } from '../WatchlistCards';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));
const mockRemoveMutate = jest.fn();
const mockMarkWatchedMutate = jest.fn();
const mockMoveBackMutate = jest.fn();
jest.mock('@/features/watchlist/hooks', () => ({
  useWatchlistMutations: () => ({
    remove: { mutate: mockRemoveMutate, isPending: false },
    markWatched: { mutate: mockMarkWatchedMutate, isPending: false },
    moveBack: { mutate: mockMoveBackMutate, isPending: false },
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

const nullMovieEntry = { movie: null } as any;

describe('AvailableCard', () => {
  it('returns null when movie is missing', () => {
    const { toJSON } = render(
      <AvailableCard entry={nullMovieEntry} userId="u1" styles={mockStyles} />,
    );
    expect(toJSON()).toBeNull();
  });

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

  it('renders genres as empty row when genres is null in AvailableCard', () => {
    const noGenresEntry = { movie: { ...mockEntry.movie, genres: null } } as any;
    const { toJSON } = render(
      <AvailableCard entry={noGenresEntry} userId="u1" styles={mockStyles} />,
    );
    expect(toJSON()).toBeTruthy();
  });
});

describe('UpcomingCard', () => {
  it('returns null when movie is missing', () => {
    const { toJSON } = render(
      <UpcomingCard entry={nullMovieEntry} userId="u1" styles={mockStyles} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders movie title', () => {
    render(<UpcomingCard entry={mockEntry} userId="u1" styles={mockStyles} />);
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('renders "Soon" badge text', () => {
    render(<UpcomingCard entry={mockEntry} userId="u1" styles={mockStyles} />);
    expect(screen.getByText('watchlist.soon')).toBeTruthy();
  });

  it('renders TBA when release_date is null', () => {
    const noDateEntry = { movie: { ...mockEntry.movie, release_date: null } } as any;
    render(<UpcomingCard entry={noDateEntry} userId="u1" styles={mockStyles} />);
    expect(screen.getByText('movie.tba')).toBeTruthy();
  });

  it('renders genres as empty row when genres is null', () => {
    const noGenresEntry = { movie: { ...mockEntry.movie, genres: null } } as any;
    const { toJSON } = render(
      <UpcomingCard entry={noGenresEntry} userId="u1" styles={mockStyles} />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('uses placeholder when poster_url is null in UpcomingCard', () => {
    const noPosterEntry = { movie: { ...mockEntry.movie, poster_url: null } } as any;
    render(<UpcomingCard entry={noPosterEntry} userId="u1" styles={mockStyles} />);
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });
});

describe('WatchedCard', () => {
  it('returns null when movie is missing', () => {
    const { toJSON } = render(
      <WatchedCard entry={nullMovieEntry} userId="u1" styles={mockStyles} />,
    );
    expect(toJSON()).toBeNull();
  });

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

  it('renders genres as empty row when genres is null in WatchedCard', () => {
    const noGenresEntry = { movie: { ...mockEntry.movie, genres: null } } as any;
    const { toJSON } = render(
      <WatchedCard entry={noGenresEntry} userId="u1" styles={mockStyles} />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('uses placeholder when poster_url is null in WatchedCard', () => {
    const noPosterEntry = { movie: { ...mockEntry.movie, poster_url: null } } as any;
    render(<WatchedCard entry={noPosterEntry} userId="u1" styles={mockStyles} />);
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });
});

describe('AvailableCard — interactions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls remove.mutate when remove button is pressed', () => {
    render(<AvailableCard entry={mockEntry} userId="u1" styles={mockStyles} />);
    fireEvent.press(screen.getByLabelText('Remove from watchlist'));
    expect(mockRemoveMutate).toHaveBeenCalledWith({ userId: 'u1', movieId: 'movie-1' });
  });

  it('calls markWatched.mutate when mark as watched button is pressed', () => {
    render(<AvailableCard entry={mockEntry} userId="u1" styles={mockStyles} />);
    fireEvent.press(screen.getByLabelText('Mark as watched'));
    expect(mockMarkWatchedMutate).toHaveBeenCalledWith({ userId: 'u1', movieId: 'movie-1' });
  });

  it('navigates to movie detail on card press', () => {
    render(<AvailableCard entry={mockEntry} userId="u1" styles={mockStyles} />);
    fireEvent.press(screen.getByLabelText('Pushpa 2'));
    expect(mockPush).toHaveBeenCalledWith('/movie/movie-1');
  });

  it('shows rating when rating > 0', () => {
    render(<AvailableCard entry={mockEntry} userId="u1" styles={mockStyles} />);
    expect(screen.getByText('4.5')).toBeTruthy();
  });

  it('hides rating when rating is 0', () => {
    const zeroRatingEntry = { movie: { ...mockEntry.movie, rating: 0 } } as any;
    render(<AvailableCard entry={zeroRatingEntry} userId="u1" styles={mockStyles} />);
    expect(screen.queryByText('0.0')).toBeNull();
  });

  it('uses placeholder when poster_url is null', () => {
    const noPosterEntry = { movie: { ...mockEntry.movie, poster_url: null } } as any;
    render(<AvailableCard entry={noPosterEntry} userId="u1" styles={mockStyles} />);
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });
});

describe('UpcomingCard — interactions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('navigates to movie detail on card press', () => {
    render(<UpcomingCard entry={mockEntry} userId="u1" styles={mockStyles} />);
    fireEvent.press(screen.getByLabelText('Pushpa 2'));
    expect(mockPush).toHaveBeenCalledWith('/movie/movie-1');
  });

  it('calls remove.mutate when remove button is pressed', () => {
    render(<UpcomingCard entry={mockEntry} userId="u1" styles={mockStyles} />);
    fireEvent.press(screen.getByLabelText('Remove from watchlist'));
    expect(mockRemoveMutate).toHaveBeenCalledWith({ userId: 'u1', movieId: 'movie-1' });
  });

  it('calls markWatched.mutate when mark as watched button is pressed on UpcomingCard', () => {
    render(<UpcomingCard entry={mockEntry} userId="u1" styles={mockStyles} />);
    fireEvent.press(screen.getByLabelText('Mark as watched'));
    expect(mockMarkWatchedMutate).toHaveBeenCalledWith({ userId: 'u1', movieId: 'movie-1' });
  });
});

describe('WatchedCard — interactions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls moveBack.mutate when move back button is pressed', () => {
    render(<WatchedCard entry={mockEntry} userId="u1" styles={mockStyles} />);
    fireEvent.press(screen.getByLabelText('Move back to watchlist'));
    expect(mockMoveBackMutate).toHaveBeenCalledWith({ userId: 'u1', movieId: 'movie-1' });
  });

  it('calls remove.mutate when remove button is pressed', () => {
    render(<WatchedCard entry={mockEntry} userId="u1" styles={mockStyles} />);
    fireEvent.press(screen.getByLabelText('Remove from watched'));
    expect(mockRemoveMutate).toHaveBeenCalledWith({ userId: 'u1', movieId: 'movie-1' });
  });

  it('navigates to movie detail on card press', () => {
    render(<WatchedCard entry={mockEntry} userId="u1" styles={mockStyles} />);
    fireEvent.press(screen.getByLabelText('Pushpa 2'));
    expect(mockPush).toHaveBeenCalledWith('/movie/movie-1');
  });

  it('shows rating when rating > 0', () => {
    render(<WatchedCard entry={mockEntry} userId="u1" styles={mockStyles} />);
    expect(screen.getByText('4.5')).toBeTruthy();
  });
});
