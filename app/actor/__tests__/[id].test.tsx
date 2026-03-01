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
      release_type: 'theatrical',
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
      release_type: 'ott',
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

  it('renders actor name in header', () => {
    render(<ActorDetailScreen />);
    expect(screen.getByText('Nagarjuna Akkineni')).toBeTruthy();
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
    expect(screen.getByText('Naa Saami Ranga')).toBeTruthy();
    expect(screen.getByText('Another Movie')).toBeTruthy();
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

  it('shows loading indicator when loading', () => {
    (useActorDetail as jest.Mock).mockReturnValue({
      actor: null,
      filmography: [],
      isLoading: true,
    });
    render(<ActorDetailScreen />);
    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });

  it('renders null when actor is not found and not loading', () => {
    (useActorDetail as jest.Mock).mockReturnValue({
      actor: null,
      filmography: [],
      isLoading: false,
    });
    const { toJSON } = render(<ActorDetailScreen />);
    expect(toJSON()).toBeNull();
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
    expect(screen.getByText('3.5')).toBeTruthy();
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
});
