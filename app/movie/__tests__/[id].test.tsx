// Mocks must be declared before imports

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: mockBack }),
  useLocalSearchParams: () => ({ id: 'movie-1' }),
}));

jest.mock('@/features/movies/hooks/useMovieDetail', () => ({
  useMovieDetail: jest.fn(),
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    session: {},
    isLoading: false,
    isGuest: false,
    setIsGuest: jest.fn(),
  }),
}));

const mockAddMutate = jest.fn();
const mockRemoveMutate = jest.fn();

jest.mock('@/features/watchlist/hooks', () => ({
  useIsWatchlisted: jest.fn(() => ({ data: false })),
  useWatchlistMutations: jest.fn(() => ({
    add: { mutate: mockAddMutate },
    remove: { mutate: mockRemoveMutate },
    markWatched: { mutate: jest.fn() },
    moveBack: { mutate: jest.fn() },
  })),
}));

jest.mock('@/features/reviews/hooks', () => ({
  useMovieReviews: jest.fn(() => ({ data: [] })),
  useReviewMutations: jest.fn(() => ({
    create: { mutate: jest.fn() },
    update: { mutate: jest.fn() },
    remove: { mutate: jest.fn() },
    helpful: { mutate: jest.fn() },
  })),
}));

jest.mock('@/components/ui/StarRating', () => {
  const { View } = require('react-native');
  return {
    StarRating: () => <View testID="star-rating" />,
  };
});

import React from 'react';
import { Share } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import MovieDetailScreen from '../[id]';
import { useMovieDetail } from '@/features/movies/hooks/useMovieDetail';
import { useIsWatchlisted } from '@/features/watchlist/hooks';

const mockMovie = {
  id: 'movie-1',
  title: 'Pushpa 2',
  release_type: 'theatrical',
  release_date: '2025-03-15',
  poster_url: 'https://example.com/poster.jpg',
  backdrop_url: 'https://example.com/backdrop.jpg',
  rating: 4.5,
  review_count: 10,
  genres: ['Action', 'Drama'],
  certification: 'UA',
  runtime: 180,
  synopsis: 'An exciting action movie about pushpa.',
  director: 'Sukumar',
  trailer_url: 'https://youtube.com/watch?v=abc',
  cast: [
    {
      id: 'c1',
      movie_id: 'movie-1',
      actor_id: 'a1',
      role_name: 'Pushpa Raj',
      display_order: 1,
      actor: {
        id: 'a1',
        name: 'Allu Arjun',
        photo_url: null,
        tmdb_person_id: null,
        created_at: '',
      },
    },
  ],
  platforms: [
    {
      movie_id: 'movie-1',
      platform_id: 'netflix',
      platform: {
        id: 'netflix',
        name: 'Netflix',
        logo: 'N',
        color: '#E50914',
        display_order: 1,
      },
    },
  ],
};

describe('MovieDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useMovieDetail as jest.Mock).mockReturnValue({ data: mockMovie });
  });

  it('renders the movie title', () => {
    render(<MovieDetailScreen />);
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('shows the back button', () => {
    render(<MovieDetailScreen />);
    expect(screen.getByLabelText('Go back')).toBeTruthy();
  });

  it('shows the Overview tab as active by default', () => {
    render(<MovieDetailScreen />);
    expect(screen.getByText('Overview')).toBeTruthy();
  });

  it('renders the synopsis in the overview tab', () => {
    render(<MovieDetailScreen />);
    expect(screen.getByText('An exciting action movie about pushpa.')).toBeTruthy();
  });

  it('shows the star rating component', () => {
    render(<MovieDetailScreen />);
    // Navigate to reviews tab and open the Write Review modal to trigger StarRating
    fireEvent.press(screen.getByText('Reviews'));
    fireEvent.press(screen.getByText('Write Review'));
    expect(screen.getAllByTestId('star-rating').length).toBeGreaterThan(0);
  });

  it('shows the Watch On section when movie has platforms', () => {
    render(<MovieDetailScreen />);
    expect(screen.getByText('Watch On')).toBeTruthy();
    expect(screen.getByText('Netflix')).toBeTruthy();
  });

  it('renders nothing when movie data is not available', () => {
    (useMovieDetail as jest.Mock).mockReturnValue({ data: undefined });
    const { toJSON } = render(<MovieDetailScreen />);
    expect(toJSON()).toBeNull();
  });

  it('shows Cast and Reviews tabs in the tab bar', () => {
    render(<MovieDetailScreen />);
    expect(screen.getByText('Cast')).toBeTruthy();
    expect(screen.getByText('Reviews')).toBeTruthy();
  });

  it('switches to cast tab and shows cast member', () => {
    render(<MovieDetailScreen />);
    fireEvent.press(screen.getByText('Cast'));
    expect(screen.getByText('Allu Arjun')).toBeTruthy();
    expect(screen.getByText('as Pushpa Raj')).toBeTruthy();
  });

  it('shows movie metadata in the hero section', () => {
    render(<MovieDetailScreen />);
    // Year extracted from release_date
    expect(screen.getByText('2025')).toBeTruthy();
    // Runtime
    expect(screen.getByText('180m')).toBeTruthy();
    // Certification appears in both hero and overview info card
    expect(screen.getAllByText('UA').length).toBeGreaterThan(0);
  });

  it('switches to the Reviews tab and shows rating summary', () => {
    render(<MovieDetailScreen />);
    fireEvent.press(screen.getByText('Reviews'));
    // 4.5 appears in both the hero and the rating summary
    expect(screen.getAllByText('4.5').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('/5')).toBeTruthy();
    expect(screen.getAllByText('(10 reviews)').length).toBeGreaterThanOrEqual(1);
  });

  it('toggles watchlist from not-watchlisted to add', () => {
    render(<MovieDetailScreen />);
    const addButton = screen.getByLabelText('Add to watchlist');
    fireEvent.press(addButton);
    expect(mockAddMutate).toHaveBeenCalledWith({ userId: 'user-1', movieId: 'movie-1' });
  });

  it('toggles watchlist from watchlisted to remove', () => {
    (useIsWatchlisted as jest.Mock).mockReturnValue({ data: { id: 'w1' } });
    render(<MovieDetailScreen />);
    const removeButton = screen.getByLabelText('Remove from watchlist');
    fireEvent.press(removeButton);
    expect(mockRemoveMutate).toHaveBeenCalledWith({ userId: 'user-1', movieId: 'movie-1' });
  });

  it('calls Share.share when the share button is pressed', async () => {
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction' } as never);
    render(<MovieDetailScreen />);
    fireEvent.press(screen.getByLabelText('Share'));
    expect(shareSpy).toHaveBeenCalled();
    shareSpy.mockRestore();
  });

  it('shows release alert for upcoming movies', () => {
    const upcomingMovie = {
      ...mockMovie,
      release_type: 'upcoming',
      rating: 0,
      review_count: 0,
      platforms: [],
    };
    (useMovieDetail as jest.Mock).mockReturnValue({ data: upcomingMovie });
    render(<MovieDetailScreen />);
    expect(screen.getByText('Upcoming Release')).toBeTruthy();
  });

  it('shows genre pills in the overview tab', () => {
    render(<MovieDetailScreen />);
    expect(screen.getByText('Action')).toBeTruthy();
    expect(screen.getByText('Drama')).toBeTruthy();
  });
});
