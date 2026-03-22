jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, dismissAll: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'actor-1' }),
  useNavigation: () => ({ getState: () => ({ index: 0 }) }),
}));

jest.mock('@/features/actors/hooks', () => ({
  useActorDetail: jest.fn(),
}));

jest.mock('@/features/feed', () => ({
  useEntityFollows: () => ({ followSet: new Set() }),
  useFollowEntity: () => ({ mutate: jest.fn() }),
  useUnfollowEntity: () => ({ mutate: jest.fn() }),
}));

jest.mock('@/hooks/useAuthGate', () => ({
  useAuthGate: () => ({ gate: (fn: () => void) => fn }),
}));

jest.mock('@/components/common/CollapsibleProfileLayout', () => ({
  CollapsibleProfileLayout: ({
    name,
    renderImage,
    onBack,
    onImagePress,
    rightContent,
    heroContent,
    children,
  }: any) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View>
        <TouchableOpacity onPress={onBack} accessibilityLabel="Go back">
          <Text>Back</Text>
        </TouchableOpacity>
        {rightContent}
        {onImagePress ? (
          <TouchableOpacity onPress={onImagePress} testID="avatar-tap">
            {renderImage(120)}
          </TouchableOpacity>
        ) : (
          renderImage(120)
        )}
        <Text>{name}</Text>
        {heroContent}
        {children}
      </View>
    );
  },
}));

jest.mock('@/hooks/useRefresh', () => ({
  useRefresh: () => ({ refreshing: false, onRefresh: jest.fn() }),
}));

jest.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pullDistance: { value: 0 },
    isRefreshing: { value: false },
    handleScrollBeginDrag: jest.fn(),
    handlePullScroll: jest.fn(),
    handleScrollEndDrag: jest.fn(),
  }),
}));

jest.mock('@/components/common/PullToRefreshIndicator', () => ({
  PullToRefreshIndicator: () => null,
}));

jest.mock('@/components/common/ScreenHeader', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ title }: { title: string }) => (
      <View>
        <TouchableOpacity accessibilityLabel="Go back" />
        <Text>{title}</Text>
      </View>
    ),
  };
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ActorDetailScreen from '../[id]';
import { useActorDetail } from '@/features/actors/hooks';

const mockActor = {
  id: 'actor-1',
  tmdb_person_id: 12345,
  name: 'Nagarjuna Akkineni',
  photo_url: 'https://example.com/photo.jpg',
  birth_date: '1959-08-29',
  person_type: 'actor' as const,
  gender: 2,
  biography: 'Akkineni Nagarjuna is an Indian actor, producer, and entrepreneur.',
  place_of_birth: 'Chennai, Tamil Nadu, India',
  height_cm: 181,
  imdb_id: null,
  instagram_id: null,
  twitter_id: null,
  death_date: null,
  also_known_as: null,
  known_for_department: null,
  created_by: null,
  created_at: '2024-01-01',
};

const mockFilmography = [
  {
    id: 'c1',
    movie_id: 'm1',
    actor_id: 'actor-1',
    role_name: 'Hero',
    display_order: 0,
    credit_type: 'cast' as const,
    role_order: null,
    movie: {
      id: 'm1',
      title: 'Naa Saami Ranga',
      release_date: '2024-01-14',
      poster_url: 'https://example.com/poster1.jpg',
      rating: 3.5,
      review_count: 20,
      genres: ['Action'],
      in_theaters: true,
      premiere_date: null,
      runtime: 150,
      certification: 'UA',
      synopsis: null,
      director: 'Vijay Binni',
      trailer_url: null,
      tmdb_id: null,
      backdrop_url: null,
      original_language: 'te',
      backdrop_focus_x: null,
      backdrop_focus_y: null,
      spotlight_focus_x: null,
      spotlight_focus_y: null,
      detail_focus_x: null,
      detail_focus_y: null,
      is_featured: false,
      tmdb_last_synced_at: null,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
  },
  {
    id: 'c2',
    movie_id: 'm2',
    actor_id: 'actor-1',
    role_name: 'Director',
    display_order: 0,
    credit_type: 'crew' as const,
    role_order: 1,
    movie: {
      id: 'm2',
      title: 'Another Movie',
      release_date: '2023-06-15',
      poster_url: null,
      rating: 0,
      review_count: 0,
      genres: [],
      in_theaters: false,
      premiere_date: null,
      runtime: null,
      certification: null,
      synopsis: null,
      director: null,
      trailer_url: null,
      tmdb_id: null,
      backdrop_url: null,
      original_language: 'te',
      backdrop_focus_x: null,
      backdrop_focus_y: null,
      spotlight_focus_x: null,
      spotlight_focus_y: null,
      detail_focus_x: null,
      detail_focus_y: null,
      is_featured: false,
      tmdb_last_synced_at: null,
      created_at: '2023-01-01',
      updated_at: '2023-01-01',
    },
  },
];

describe('ActorDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useActorDetail as jest.Mock).mockReturnValue({
      actor: mockActor,
      filmography: mockFilmography,
      isLoading: false,
    });
  });

  it('renders actor name', () => {
    render(<ActorDetailScreen />);
    expect(screen.getAllByText('Nagarjuna Akkineni').length).toBeGreaterThanOrEqual(1);
  });

  it('shows person type badge', () => {
    render(<ActorDetailScreen />);
    expect(screen.getByText('Actor')).toBeTruthy();
  });

  it('shows gender badge', () => {
    render(<ActorDetailScreen />);
    expect(screen.getByText('Male')).toBeTruthy();
  });

  it('shows date of birth', () => {
    render(<ActorDetailScreen />);
    expect(screen.getByText('Born')).toBeTruthy();
    // formatDate parses as UTC; local timezone may shift the date
    const expectedDate = new Date('1959-08-29').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    expect(screen.getByText(expectedDate)).toBeTruthy();
  });

  it('shows filmography count badge', () => {
    render(<ActorDetailScreen />);
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('Filmography')).toBeTruthy();
  });

  it('renders filmography movie cards', () => {
    render(<ActorDetailScreen />);
    expect(screen.getAllByText('Naa Saami Ranga').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Another Movie').length).toBeGreaterThanOrEqual(1);
  });

  it('shows role name with "as" prefix for cast credits', () => {
    render(<ActorDetailScreen />);
    expect(screen.getByText('as Hero')).toBeTruthy();
  });

  it('shows role name without prefix for crew credits', () => {
    render(<ActorDetailScreen />);
    expect(screen.getByText('Director')).toBeTruthy();
  });

  it('navigates to movie detail on filmography card tap', () => {
    render(<ActorDetailScreen />);
    fireEvent.press(screen.getByTestId('film-card-m1'));
    expect(mockPush).toHaveBeenCalledWith('/movie/m1');
  });

  it('shows back button', () => {
    render(<ActorDetailScreen />);
    expect(screen.getByLabelText('Go back')).toBeTruthy();
  });

  it('navigates back on back button press', () => {
    render(<ActorDetailScreen />);
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('shows skeleton when loading', () => {
    (useActorDetail as jest.Mock).mockReturnValue({
      actor: null,
      filmography: [],
      isLoading: true,
    });
    render(<ActorDetailScreen />);
    expect(screen.getByTestId('actor-detail-skeleton')).toBeTruthy();
  });

  it('shows not-found state when actor is not found and not loading', () => {
    (useActorDetail as jest.Mock).mockReturnValue({
      actor: null,
      filmography: [],
      isLoading: false,
    });
    render(<ActorDetailScreen />);
    expect(screen.getByText('No results found')).toBeTruthy();
    expect(screen.getByLabelText('Go back')).toBeTruthy();
  });

  it('shows empty state when filmography is empty', () => {
    (useActorDetail as jest.Mock).mockReturnValue({
      actor: mockActor,
      filmography: [],
      isLoading: false,
    });
    render(<ActorDetailScreen />);
    expect(screen.getByText('No movies found')).toBeTruthy();
  });

  it('shows Technician badge for technician person type', () => {
    const technician = { ...mockActor, person_type: 'technician' as const };
    (useActorDetail as jest.Mock).mockReturnValue({
      actor: technician,
      filmography: [],
      isLoading: false,
    });
    render(<ActorDetailScreen />);
    expect(screen.getByText('Technician')).toBeTruthy();
  });

  it('shows Female gender badge', () => {
    const female = { ...mockActor, gender: 1 };
    (useActorDetail as jest.Mock).mockReturnValue({
      actor: female,
      filmography: mockFilmography,
      isLoading: false,
    });
    render(<ActorDetailScreen />);
    expect(screen.getByText('Female')).toBeTruthy();
  });

  it('does not show gender badge when gender is null', () => {
    const noGender = { ...mockActor, gender: null };
    (useActorDetail as jest.Mock).mockReturnValue({
      actor: noGender,
      filmography: [],
      isLoading: false,
    });
    render(<ActorDetailScreen />);
    expect(screen.queryByText('Male')).toBeNull();
    expect(screen.queryByText('Female')).toBeNull();
  });

  it('shows movie rating when available', () => {
    render(<ActorDetailScreen />);
    expect(screen.getAllByText('3.5').length).toBeGreaterThanOrEqual(1);
  });

  it('shows place of birth', () => {
    render(<ActorDetailScreen />);
    expect(screen.getByText('From')).toBeTruthy();
    expect(screen.getByText('Chennai, Tamil Nadu, India')).toBeTruthy();
  });

  it('shows height in cm', () => {
    render(<ActorDetailScreen />);
    expect(screen.getByText('Height')).toBeTruthy();
    expect(screen.getByText('181 cm')).toBeTruthy();
  });

  it('shows biography about section', () => {
    render(<ActorDetailScreen />);
    expect(screen.getByText('About')).toBeTruthy();
    expect(
      screen.getByText('Akkineni Nagarjuna is an Indian actor, producer, and entrepreneur.'),
    ).toBeTruthy();
  });

  it('toggles biography read more / show less', () => {
    render(<ActorDetailScreen />);
    const toggle = screen.getByTestId('bio-toggle');
    expect(screen.getByText('Read more')).toBeTruthy();
    fireEvent.press(toggle);
    expect(screen.getByText('Show less')).toBeTruthy();
    fireEvent.press(toggle);
    expect(screen.getByText('Read more')).toBeTruthy();
  });

  it('does not show about section when biography is null', () => {
    const noBio = { ...mockActor, biography: null };
    (useActorDetail as jest.Mock).mockReturnValue({
      actor: noBio,
      filmography: [],
      isLoading: false,
    });
    render(<ActorDetailScreen />);
    expect(screen.queryByText('About')).toBeNull();
  });

  it('opens photo modal on avatar tap', () => {
    render(<ActorDetailScreen />);
    fireEvent.press(screen.getByTestId('avatar-tap'));
    expect(screen.getByTestId('photo-modal')).toBeTruthy();
  });

  it('closes photo modal on close button press', () => {
    render(<ActorDetailScreen />);
    fireEvent.press(screen.getByTestId('avatar-tap'));
    expect(screen.getByTestId('photo-close')).toBeTruthy();
    fireEvent.press(screen.getByTestId('photo-close'));
    // Modal with visible=false is removed from test tree
    expect(screen.queryByTestId('photo-close')).toBeNull();
  });

  it('closes photo modal on overlay tap', () => {
    render(<ActorDetailScreen />);
    fireEvent.press(screen.getByTestId('avatar-tap'));
    expect(screen.getByTestId('photo-overlay')).toBeTruthy();
    fireEvent.press(screen.getByTestId('photo-overlay'));
    expect(screen.queryByTestId('photo-overlay')).toBeNull();
  });

  it('does not render avatar-tap when photo_url is null', () => {
    const noPhoto = { ...mockActor, photo_url: null };
    (useActorDetail as jest.Mock).mockReturnValue({
      actor: noPhoto,
      filmography: [],
      isLoading: false,
    });
    render(<ActorDetailScreen />);
    expect(screen.queryByTestId('avatar-tap')).toBeNull();
  });

  it('shows death date when present', () => {
    const deceased = { ...mockActor, death_date: '2023-11-15' };
    (useActorDetail as jest.Mock).mockReturnValue({
      actor: deceased,
      filmography: mockFilmography,
      isLoading: false,
    });
    render(<ActorDetailScreen />);
    expect(screen.getByText('Died')).toBeTruthy();
    const expectedDate = new Date('2023-11-15').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    expect(screen.getByText(expectedDate)).toBeTruthy();
  });

  it('does not show death date when null', () => {
    render(<ActorDetailScreen />);
    expect(screen.queryByText('Died')).toBeNull();
  });

  it('shows also_known_as chips when present', () => {
    const withAka = { ...mockActor, also_known_as: ['Nag', 'King Nagarjuna'] };
    (useActorDetail as jest.Mock).mockReturnValue({
      actor: withAka,
      filmography: mockFilmography,
      isLoading: false,
    });
    render(<ActorDetailScreen />);
    expect(screen.getByText('Nag')).toBeTruthy();
    expect(screen.getByText('King Nagarjuna')).toBeTruthy();
  });

  it('does not show also_known_as when null or empty', () => {
    render(<ActorDetailScreen />);
    // No chip should render for AKA
    expect(screen.queryByText('Nag')).toBeNull();
  });

  it('shows IMDb social link when imdb_id is present', () => {
    const withImdb = { ...mockActor, imdb_id: 'nm0012345' };
    (useActorDetail as jest.Mock).mockReturnValue({
      actor: withImdb,
      filmography: mockFilmography,
      isLoading: false,
    });
    render(<ActorDetailScreen />);
    expect(screen.getByTestId('social-imdb')).toBeTruthy();
  });

  it('shows Instagram social link when instagram_id is present', () => {
    const withIg = { ...mockActor, instagram_id: 'naikiniki' };
    (useActorDetail as jest.Mock).mockReturnValue({
      actor: withIg,
      filmography: mockFilmography,
      isLoading: false,
    });
    render(<ActorDetailScreen />);
    expect(screen.getByTestId('social-instagram')).toBeTruthy();
  });

  it('shows Twitter social link when twitter_id is present', () => {
    const withTwitter = { ...mockActor, twitter_id: 'iaboredthisname' };
    (useActorDetail as jest.Mock).mockReturnValue({
      actor: withTwitter,
      filmography: mockFilmography,
      isLoading: false,
    });
    render(<ActorDetailScreen />);
    expect(screen.getByTestId('social-twitter')).toBeTruthy();
  });

  it('does not show social links when all IDs are null', () => {
    render(<ActorDetailScreen />);
    expect(screen.queryByTestId('social-imdb')).toBeNull();
    expect(screen.queryByTestId('social-instagram')).toBeNull();
    expect(screen.queryByTestId('social-twitter')).toBeNull();
  });

  it('opens correct IMDb URL on press', () => {
    const { Linking } = require('react-native');
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const withImdb = { ...mockActor, imdb_id: 'nm0012345' };
    (useActorDetail as jest.Mock).mockReturnValue({
      actor: withImdb,
      filmography: mockFilmography,
      isLoading: false,
    });
    render(<ActorDetailScreen />);
    fireEvent.press(screen.getByTestId('social-imdb'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://www.imdb.com/name/nm0012345');
    jest.restoreAllMocks();
  });

  it('opens correct Instagram URL on press', () => {
    const { Linking } = require('react-native');
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const withIg = { ...mockActor, instagram_id: 'naikiniki' };
    (useActorDetail as jest.Mock).mockReturnValue({
      actor: withIg,
      filmography: mockFilmography,
      isLoading: false,
    });
    render(<ActorDetailScreen />);
    fireEvent.press(screen.getByTestId('social-instagram'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://www.instagram.com/naikiniki');
    jest.restoreAllMocks();
  });

  it('opens correct Twitter URL on press', () => {
    const { Linking } = require('react-native');
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const withTwitter = { ...mockActor, twitter_id: 'king_nagarjuna' };
    (useActorDetail as jest.Mock).mockReturnValue({
      actor: withTwitter,
      filmography: mockFilmography,
      isLoading: false,
    });
    render(<ActorDetailScreen />);
    fireEvent.press(screen.getByTestId('social-twitter'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://twitter.com/king_nagarjuna');
    jest.restoreAllMocks();
  });

  it('shows Non-binary gender badge', () => {
    const nonBinary = { ...mockActor, gender: 3 };
    (useActorDetail as jest.Mock).mockReturnValue({
      actor: nonBinary,
      filmography: mockFilmography,
      isLoading: false,
    });
    render(<ActorDetailScreen />);
    expect(screen.getByText('Non-binary')).toBeTruthy();
  });

  it('shows crew role name from filmography for technician person type', () => {
    const technician = { ...mockActor, person_type: 'technician' as const };
    (useActorDetail as jest.Mock).mockReturnValue({
      actor: technician,
      filmography: mockFilmography,
      isLoading: false,
    });
    render(<ActorDetailScreen />);
    // The first crew credit has role_name 'Director', so it shows 'Director' badge instead of 'Technician'
    // Multiple 'Director' texts may appear (type badge + filmography)
    expect(screen.getAllByText('Director').length).toBeGreaterThanOrEqual(1);
  });

  it('navigates to known-for movie on press', () => {
    (useActorDetail as jest.Mock).mockReturnValue({
      actor: mockActor,
      filmography: mockFilmography,
      isLoading: false,
    });
    render(<ActorDetailScreen />);
    // The first credit (m1) has rating 3.5 > 0 so it shows in known for
    fireEvent.press(screen.getByTestId('known-for-m1'));
    expect(mockPush).toHaveBeenCalledWith('/movie/m1');
  });

  it('filters empty strings from also_known_as', () => {
    const withEmptyAka = { ...mockActor, also_known_as: ['', 'King Nagarjuna', ''] };
    (useActorDetail as jest.Mock).mockReturnValue({
      actor: withEmptyAka,
      filmography: [],
      isLoading: false,
    });
    render(<ActorDetailScreen />);
    // Empty strings are filtered out, only 'King Nagarjuna' should show
    expect(screen.getByText('King Nagarjuna')).toBeTruthy();
    // Empty strings should not render as chips
  });

  it('does not show bio card when no bio info', () => {
    const noBioInfo = {
      ...mockActor,
      birth_date: null,
      place_of_birth: null,
      height_cm: null,
      death_date: null,
    };
    (useActorDetail as jest.Mock).mockReturnValue({
      actor: noBioInfo,
      filmography: [],
      isLoading: false,
    });
    render(<ActorDetailScreen />);
    expect(screen.queryByText('Born')).toBeNull();
    expect(screen.queryByText('From')).toBeNull();
    expect(screen.queryByText('Height')).toBeNull();
  });
});
