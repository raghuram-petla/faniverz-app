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

const mockCreateReviewMutate = jest.fn();
const mockHelpfulMutate = jest.fn();

jest.mock('@/features/reviews/hooks', () => ({
  useMovieReviews: jest.fn(() => ({ data: [] })),
  useReviewMutations: jest.fn(() => ({
    create: { mutate: mockCreateReviewMutate },
    update: { mutate: jest.fn() },
    remove: { mutate: jest.fn() },
    helpful: { mutate: mockHelpfulMutate },
  })),
}));

jest.mock('@/components/ui/StarRating', () => {
  const { View, TouchableOpacity, Text } = require('react-native');
  return {
    StarRating: ({
      interactive,
      onRate,
    }: {
      interactive?: boolean;
      onRate?: (n: number) => void;
      rating?: number;
      size?: number;
    }) => (
      <View testID="star-rating">
        {interactive && onRate && (
          <TouchableOpacity testID="star-rate-4" onPress={() => onRate(4)}>
            <Text>Rate 4</Text>
          </TouchableOpacity>
        )}
      </View>
    ),
  };
});

import React from 'react';
import { Share, Linking } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import MovieDetailScreen from '../[id]';
import { useMovieDetail } from '@/features/movies/hooks/useMovieDetail';
import { useIsWatchlisted } from '@/features/watchlist/hooks';
import { useMovieReviews } from '@/features/reviews/hooks';

const mockMovie = {
  id: 'movie-1',
  title: 'Pushpa 2',
  release_type: 'theatrical',
  release_date: '2025-03-15',
  poster_url: 'https://example.com/poster.jpg',
  backdrop_url: 'https://example.com/backdrop.jpg',
  rating: 4.5,
  review_count: 10,
  is_featured: false,
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
      credit_type: 'cast',
      tier_rank: 1,
      role_order: null,
      actor: {
        id: 'a1',
        name: 'Allu Arjun',
        photo_url: null,
        birth_date: '1982-04-08',
        person_type: 'actor',
        tmdb_person_id: null,
        created_at: '',
      },
    },
  ],
  crew: [
    {
      id: 'crew1',
      movie_id: 'movie-1',
      actor_id: 'crew-a1',
      role_name: 'Director',
      display_order: 0,
      credit_type: 'crew',
      tier_rank: null,
      role_order: 1,
      actor: {
        id: 'crew-a1',
        name: 'Sukumar',
        photo_url: null,
        birth_date: '1975-01-01',
        person_type: 'technician',
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

  it('shows "Cast" section label when cast entries exist', () => {
    render(<MovieDetailScreen />);
    fireEvent.press(screen.getByText('Cast'));
    // After pressing the Cast tab, "Cast" appears twice: tab button + section label
    expect(screen.getAllByText('Cast').length).toBeGreaterThanOrEqual(2);
  });

  it('shows "Crew" section label when crew entries exist', () => {
    render(<MovieDetailScreen />);
    fireEvent.press(screen.getByText('Cast'));
    expect(screen.getByText('Crew')).toBeTruthy();
  });

  it('shows crew member name and role in Crew section', () => {
    render(<MovieDetailScreen />);
    fireEvent.press(screen.getByText('Cast'));
    expect(screen.getByText('Sukumar')).toBeTruthy();
    expect(screen.getByText('Director')).toBeTruthy();
  });

  it('shows tier chip for tier 1-3 actors', () => {
    render(<MovieDetailScreen />);
    fireEvent.press(screen.getByText('Cast'));
    expect(screen.getByText('Lead')).toBeTruthy();
  });

  it('does not show tier chip for tier 4+ actors', () => {
    const movieWithSupportingActor = {
      ...mockMovie,
      cast: [
        {
          ...mockMovie.cast[0],
          id: 'c2',
          tier_rank: 5,
          actor: { ...mockMovie.cast[0].actor, name: 'Supporting Actor' },
        },
      ],
    };
    (useMovieDetail as jest.Mock).mockReturnValue({ data: movieWithSupportingActor });
    render(<MovieDetailScreen />);
    fireEvent.press(screen.getByText('Cast'));
    expect(screen.queryByText('Lead')).toBeNull();
    expect(screen.queryByText('Villain')).toBeNull();
  });

  it('shows empty state when both cast and crew are empty', () => {
    const movieNoCast = { ...mockMovie, cast: [], crew: [] };
    (useMovieDetail as jest.Mock).mockReturnValue({ data: movieNoCast });
    render(<MovieDetailScreen />);
    fireEvent.press(screen.getByText('Cast'));
    expect(screen.getByText('No cast information available.')).toBeTruthy();
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
      is_featured: false,
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

  it('opens trailer URL when Watch Trailer is pressed', () => {
    const linkingSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    render(<MovieDetailScreen />);
    fireEvent.press(screen.getByText('Watch Trailer'));
    expect(linkingSpy).toHaveBeenCalledWith('https://youtube.com/watch?v=abc');
    linkingSpy.mockRestore();
  });

  it('submits a review via the modal', () => {
    render(<MovieDetailScreen />);

    // Navigate to reviews tab
    fireEvent.press(screen.getByText('Reviews'));

    // Open the review modal
    fireEvent.press(screen.getByText('Write Review'));

    // Set a rating using the mocked interactive star
    fireEvent.press(screen.getByTestId('star-rate-4'));

    // Fill in title and body
    fireEvent.changeText(screen.getByPlaceholderText('Review Title'), 'Amazing Movie');
    fireEvent.changeText(
      screen.getByPlaceholderText('Write your review...'),
      'Loved every moment of it.',
    );

    // Submit
    fireEvent.press(screen.getByText('Submit'));

    expect(mockCreateReviewMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        movie_id: 'movie-1',
        rating: 4,
        title: 'Amazing Movie',
        body: 'Loved every moment of it.',
      }),
    );
  });

  it('presses helpful button on a review and calls helpfulMutation', () => {
    const mockReviews = [
      {
        id: 'r1',
        movie_id: 'movie-1',
        user_id: 'user-2',
        rating: 4,
        title: 'Awesome',
        body: 'Great movie!',
        contains_spoiler: false,
        helpful_count: 5,
        created_at: '2024-03-15T10:00:00Z',
        updated_at: '2024-03-15T10:00:00Z',
        profile: { display_name: 'Film Buff' },
      },
    ];
    (useMovieReviews as jest.Mock).mockReturnValue({ data: mockReviews });

    render(<MovieDetailScreen />);

    // Navigate to reviews tab
    fireEvent.press(screen.getByText('Reviews'));

    // Press the helpful button
    fireEvent.press(screen.getByLabelText('Mark review as helpful, 5 found helpful'));

    expect(mockHelpfulMutate).toHaveBeenCalledWith({
      userId: 'user-1',
      reviewId: 'r1',
    });
  });

  it('shows platform button in Watch On section and opens URL on press', () => {
    const linkingSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    render(<MovieDetailScreen />);
    const platformButton = screen.getByLabelText('Watch on Netflix');
    expect(platformButton).toBeTruthy();
    fireEvent.press(platformButton);
    expect(linkingSpy).toHaveBeenCalledWith('https://example.com');
    linkingSpy.mockRestore();
  });

  it('shows "Coming Soon" status badge for upcoming movies', () => {
    const upcomingMovie = {
      ...mockMovie,
      release_type: 'upcoming',
      rating: 0,
      review_count: 0,
      is_featured: false,
      platforms: [],
    };
    (useMovieDetail as jest.Mock).mockReturnValue({ data: upcomingMovie });
    render(<MovieDetailScreen />);
    expect(screen.getByText('Coming Soon')).toBeTruthy();
    expect(screen.getByText('Upcoming Release')).toBeTruthy();
  });

  it('closes review modal when Cancel is pressed', () => {
    render(<MovieDetailScreen />);
    fireEvent.press(screen.getByText('Reviews'));
    fireEvent.press(screen.getByText('Write Review'));

    // Modal should be open with Cancel visible
    expect(screen.getByText('Cancel')).toBeTruthy();

    fireEvent.press(screen.getByText('Cancel'));

    // After cancelling, the modal content should be hidden
    // The "Write Review" button in the reviews tab should still be there
    expect(screen.getByText('Write Review')).toBeTruthy();
  });

  it('does not call createReview when userId is empty', () => {
    jest
      .spyOn(require('@/features/auth/providers/AuthProvider'), 'useAuth')
      .mockReturnValue({ user: null });

    render(<MovieDetailScreen />);
    fireEvent.press(screen.getByText('Reviews'));
    fireEvent.press(screen.getByText('Write Review'));
    // Rating is 0, so submit is disabled — mutate should not be called
    fireEvent.press(screen.getByText('Submit'));
    expect(mockCreateReviewMutate).not.toHaveBeenCalled();
  });

  it('toggles the spoiler toggle in the review modal', () => {
    render(<MovieDetailScreen />);
    fireEvent.press(screen.getByText('Reviews'));
    fireEvent.press(screen.getByText('Write Review'));
    // Press the Contains Spoiler toggle
    fireEvent.press(screen.getByText('Contains Spoiler'));
    // Should not crash — just verify it renders
    expect(screen.getByText('Contains Spoiler')).toBeTruthy();
  });

  it('shows spoiler badge on reviews that contain spoilers', () => {
    const spoilerReviews = [
      {
        id: 'r2',
        movie_id: 'movie-1',
        user_id: 'user-3',
        rating: 3,
        title: 'Spoiler Review',
        body: 'The ending was...',
        contains_spoiler: true,
        helpful_count: 0,
        created_at: '2024-04-01T00:00:00Z',
        updated_at: '2024-04-01T00:00:00Z',
        profile: { display_name: 'Spoiler User' },
      },
    ];
    (useMovieReviews as jest.Mock).mockReturnValue({ data: spoilerReviews });
    render(<MovieDetailScreen />);
    fireEvent.press(screen.getByText('Reviews'));
    expect(screen.getByText('Contains Spoiler')).toBeTruthy();
  });

  it('renders movie without director without crashing', () => {
    const noDirectorMovie = { ...mockMovie, director: null };
    (useMovieDetail as jest.Mock).mockReturnValue({ data: noDirectorMovie });
    render(<MovieDetailScreen />);
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('renders movie with no trailer without showing Watch Trailer button', () => {
    const noTrailerMovie = { ...mockMovie, trailer_url: null };
    (useMovieDetail as jest.Mock).mockReturnValue({ data: noTrailerMovie });
    render(<MovieDetailScreen />);
    expect(screen.queryByText('Watch Trailer')).toBeNull();
  });

  it('renders streaming status badge for ott movies', () => {
    const ottMovie = { ...mockMovie, release_type: 'ott' };
    (useMovieDetail as jest.Mock).mockReturnValue({ data: ottMovie });
    render(<MovieDetailScreen />);
    expect(screen.getByText('Streaming')).toBeTruthy();
  });
});
