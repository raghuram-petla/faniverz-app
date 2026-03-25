// Mocks must be declared before imports

jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { WebView: (props: Record<string, unknown>) => <View testID="webview" {...props} /> };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, dismissAll: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'movie-1' }),
  useNavigation: () => ({ getState: () => ({ index: 0 }) }),
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

const mockActionPress = jest.fn();
jest.mock('@/hooks/useMovieAction', () => ({
  useMovieAction: jest.fn(() => ({
    actionType: 'follow',
    isActive: false,
    onPress: mockActionPress,
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

jest.mock('@/hooks/useAuthGate', () => ({
  useAuthGate: () => ({ gate: <T extends Function>(fn: T) => fn, isAuthenticated: true }),
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
import MovieDetailScreen from '../index';
import { useMovieDetail } from '@/features/movies/hooks/useMovieDetail';
import { useMovieReviews } from '@/features/reviews/hooks';

const mockMovie = {
  id: 'movie-1',
  title: 'Pushpa 2',
  in_theaters: true,
  premiere_date: null,
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
  cast: [
    {
      id: 'c1',
      movie_id: 'movie-1',
      actor_id: 'a1',
      role_name: 'Pushpa Raj',
      display_order: 1,
      credit_type: 'cast',
      role_order: null,
      actor: {
        id: 'a1',
        name: 'Allu Arjun',
        photo_url: null,
        birth_date: '1982-04-08',
        person_type: 'actor',
        gender: 2,
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
      role_order: 1,
      actor: {
        id: 'crew-a1',
        name: 'Sukumar',
        photo_url: null,
        birth_date: '1975-01-01',
        person_type: 'technician',
        gender: 2,
        tmdb_person_id: null,
        created_at: '',
      },
    },
  ],
  platforms: [
    {
      movie_id: 'movie-1',
      platform_id: 'netflix',
      streaming_url: 'https://www.netflix.com/title/12345',
      platform: {
        id: 'netflix',
        name: 'Netflix',
        logo: 'N',
        logo_url: null,
        color: '#E50914',
        display_order: 1,
      },
    },
  ],
  videos: [],
  posters: [],
  productionHouses: [],
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
    fireEvent.press(screen.getByText('Reviews'));
    fireEvent.press(screen.getByText('Write Review'));
    expect(screen.getAllByTestId('star-rating').length).toBeGreaterThan(0);
  });

  it('shows the Watch On section when movie has platforms', () => {
    render(<MovieDetailScreen />);
    expect(screen.getByText('Watch On')).toBeTruthy();
    expect(screen.getByText('Netflix')).toBeTruthy();
  });

  it('shows skeleton when movie data is not available', () => {
    (useMovieDetail as jest.Mock).mockReturnValue({ data: undefined, isLoading: true });
    render(<MovieDetailScreen />);
    expect(screen.getByTestId('movie-detail-skeleton')).toBeTruthy();
  });

  it('shows Cast and Reviews tabs in the tab bar', () => {
    render(<MovieDetailScreen />);
    expect(screen.getByText('Cast')).toBeTruthy();
    expect(screen.getByText('Reviews')).toBeTruthy();
  });

  it('always shows Media tab even when no videos or posters', () => {
    render(<MovieDetailScreen />);
    expect(screen.getByText('Media')).toBeTruthy();
  });

  it('navigates to media screen when Media tab is tapped', () => {
    render(<MovieDetailScreen />);
    fireEvent.press(screen.getByText('Media'));
    expect(mockPush).toHaveBeenCalledWith('/movie/movie-1/media');
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
    expect(screen.getAllByText('Cast').length).toBeGreaterThanOrEqual(1);
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

  it('shows empty state when both cast and crew are empty', () => {
    const movieNoCast = { ...mockMovie, cast: [], crew: [] };
    (useMovieDetail as jest.Mock).mockReturnValue({ data: movieNoCast });
    render(<MovieDetailScreen />);
    fireEvent.press(screen.getByText('Cast'));
    expect(screen.getByText('No cast information available.')).toBeTruthy();
  });

  it('shows movie metadata in the hero section', () => {
    render(<MovieDetailScreen />);
    expect(screen.getByText('2025')).toBeTruthy();
    expect(screen.getByText('180m')).toBeTruthy();
    expect(screen.getAllByText('UA').length).toBeGreaterThan(0);
  });

  it('switches to the Reviews tab and shows rating summary', () => {
    render(<MovieDetailScreen />);
    fireEvent.press(screen.getByText('Reviews'));
    expect(screen.getAllByText('4.5').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('/5')).toBeTruthy();
    expect(screen.getAllByText('(10 reviews)').length).toBeGreaterThanOrEqual(1);
  });

  it('renders smart action button in header', () => {
    render(<MovieDetailScreen />);
    expect(screen.getByLabelText('Follow Pushpa 2')).toBeTruthy();
  });

  it('calls action onPress when action button is pressed', () => {
    render(<MovieDetailScreen />);
    fireEvent.press(screen.getByLabelText('Follow Pushpa 2'));
    expect(mockActionPress).toHaveBeenCalled();
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
      in_theaters: false,
      premiere_date: null,
      release_date: '2099-01-01',
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

  it('does not show MediaSummaryCard when movie has no videos or posters', () => {
    render(<MovieDetailScreen />);
    expect(screen.queryByText('Explore All Media')).toBeNull();
  });

  it('submits a review via the modal', () => {
    render(<MovieDetailScreen />);
    fireEvent.press(screen.getByText('Reviews'));
    fireEvent.press(screen.getByText('Write Review'));
    fireEvent.press(screen.getByTestId('star-rate-4'));
    fireEvent.changeText(screen.getByPlaceholderText('Review Title'), 'Amazing Movie');
    fireEvent.changeText(
      screen.getByPlaceholderText('Write your review...'),
      'Loved every moment of it.',
    );
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
    fireEvent.press(screen.getByText('Reviews'));
    fireEvent.press(screen.getByLabelText('Mark review as helpful, 5 found helpful'));
    expect(mockHelpfulMutate).toHaveBeenCalledWith({ userId: 'user-1', reviewId: 'r1' });
  });

  it('shows platform button in Watch On section and opens URL on press', () => {
    const linkingSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    render(<MovieDetailScreen />);
    const platformButton = screen.getByLabelText('Watch on Netflix');
    expect(platformButton).toBeTruthy();
    fireEvent.press(platformButton);
    expect(linkingSpy).toHaveBeenCalledWith('https://www.netflix.com/title/12345');
    linkingSpy.mockRestore();
  });

  it('shows "Coming Soon" status badge for upcoming movies', () => {
    const upcomingMovie = {
      ...mockMovie,
      in_theaters: false,
      premiere_date: null,
      release_date: '2099-01-01',
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
    expect(screen.getByText('Cancel')).toBeTruthy();
    fireEvent.press(screen.getByText('Cancel'));
    expect(screen.getByText('Write Review')).toBeTruthy();
  });

  it('does not call createReview when userId is empty', () => {
    jest
      .spyOn(require('@/features/auth/providers/AuthProvider'), 'useAuth')
      .mockReturnValue({ user: null });
    render(<MovieDetailScreen />);
    fireEvent.press(screen.getByText('Reviews'));
    fireEvent.press(screen.getByText('Write Review'));
    fireEvent.press(screen.getByText('Submit'));
    expect(mockCreateReviewMutate).not.toHaveBeenCalled();
  });

  it('toggles the spoiler toggle in the review modal', () => {
    render(<MovieDetailScreen />);
    fireEvent.press(screen.getByText('Reviews'));
    fireEvent.press(screen.getByText('Write Review'));
    fireEvent.press(screen.getByText('Contains Spoiler'));
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

  it('calls router.back when Go back button is pressed', () => {
    render(<MovieDetailScreen />);
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('navigates to actor page when actor is pressed in cast tab', () => {
    render(<MovieDetailScreen />);
    fireEvent.press(screen.getByText('Cast'));
    // Press the actor button — CastTab renders actors as pressable items
    fireEvent.press(screen.getByText('Allu Arjun'));
    expect(mockPush).toHaveBeenCalledWith('/actor/a1');
  });

  it('shares movie without year when release_date is null', async () => {
    const noYearMovie = { ...mockMovie, release_date: null };
    (useMovieDetail as jest.Mock).mockReturnValue({ data: noYearMovie });
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction' } as never);
    render(<MovieDetailScreen />);
    fireEvent.press(screen.getByLabelText('Share'));
    expect(shareSpy).toHaveBeenCalledWith({ message: expect.not.stringContaining('(') });
    shareSpy.mockRestore();
  });

  it('handles share when synopsis is null', async () => {
    const noSynopsisMovie = { ...mockMovie, synopsis: null };
    (useMovieDetail as jest.Mock).mockReturnValue({ data: noSynopsisMovie });
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction' } as never);
    render(<MovieDetailScreen />);
    fireEvent.press(screen.getByLabelText('Share'));
    expect(shareSpy).toHaveBeenCalled();
    shareSpy.mockRestore();
  });

  it('does not submit review when rating is 0 (early return guard)', () => {
    render(<MovieDetailScreen />);
    fireEvent.press(screen.getByText('Reviews'));
    fireEvent.press(screen.getByText('Write Review'));
    // Do NOT select a star rating — submit with rating = 0
    fireEvent.press(screen.getByText('Submit'));
    expect(mockCreateReviewMutate).not.toHaveBeenCalled();
  });

  it('renders streaming status badge for ott movies', () => {
    const ottMovie = { ...mockMovie, in_theaters: false, premiere_date: null };
    (useMovieDetail as jest.Mock).mockReturnValue({ data: ottMovie });
    render(<MovieDetailScreen />);
    expect(screen.getByText('Streaming')).toBeTruthy();
  });

  it('renders smart action button with watchlist type for streaming movie', () => {
    const { useMovieAction: mockHook } = require('@/hooks/useMovieAction');
    mockHook.mockReturnValueOnce({
      actionType: 'watchlist',
      isActive: false,
      onPress: mockActionPress,
    });
    const ottMovie = { ...mockMovie, in_theaters: false, premiere_date: null };
    (useMovieDetail as jest.Mock).mockReturnValue({ data: ottMovie });
    render(<MovieDetailScreen />);
    expect(screen.getByLabelText('Save Pushpa 2')).toBeTruthy();
  });

  it('shows MediaSummaryCard when movie has videos', () => {
    const movieWithVideos = {
      ...mockMovie,
      videos: [
        {
          id: 'v1',
          movie_id: 'movie-1',
          youtube_id: 'dQw4w9WgXcQ',
          title: 'Official Trailer',
          video_type: 'trailer',
          description: null,
          video_date: null,
          duration: '3:20',
          display_order: 0,
          created_at: '',
        },
      ],
    };
    (useMovieDetail as jest.Mock).mockReturnValue({ data: movieWithVideos });
    render(<MovieDetailScreen />);
    expect(screen.getByText('Explore All Media')).toBeTruthy();
    expect(screen.getByText('1 Video')).toBeTruthy();
  });

  it('navigates to media screen when MediaSummaryCard is tapped', () => {
    const movieWithVideos = {
      ...mockMovie,
      videos: [
        {
          id: 'v1',
          movie_id: 'movie-1',
          youtube_id: 'dQw4w9WgXcQ',
          title: 'Official Trailer',
          video_type: 'trailer',
          description: null,
          video_date: null,
          duration: '3:20',
          display_order: 0,
          created_at: '',
        },
      ],
    };
    (useMovieDetail as jest.Mock).mockReturnValue({ data: movieWithVideos });
    render(<MovieDetailScreen />);
    fireEvent.press(screen.getByText('Explore All Media'));
    expect(mockPush).toHaveBeenCalledWith('/movie/movie-1/media');
  });

  it('renders correctly when useMovieReviews returns undefined data (reviews defaults to [])', () => {
    (useMovieReviews as jest.Mock).mockReturnValue({ data: undefined, refetch: jest.fn() });
    render(<MovieDetailScreen />);
    fireEvent.press(screen.getByText('Reviews'));
    // Should render reviews tab without crashing even though data is undefined
    expect(screen.getAllByText('(10 reviews)').length).toBeGreaterThanOrEqual(1);
  });

  it('handles movie with zero platforms (platforms.length ?? 0 branch)', () => {
    const noPlatformsMovie = { ...mockMovie, platforms: [] };
    (useMovieDetail as jest.Mock).mockReturnValue({ data: noPlatformsMovie });
    render(<MovieDetailScreen />);
    // Should render without crashing, no Watch On section items
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('shows production houses in overview tab', () => {
    const movieWithPH = {
      ...mockMovie,
      productionHouses: [
        {
          id: 'ph1',
          name: 'Mythri Movie Makers',
          logo_url: null,
          description: null,
          created_at: '',
        },
      ],
    };
    (useMovieDetail as jest.Mock).mockReturnValue({ data: movieWithPH });
    render(<MovieDetailScreen />);
    expect(screen.getByText('Production')).toBeTruthy();
    expect(screen.getByText('Mythri Movie Makers')).toBeTruthy();
  });
});
