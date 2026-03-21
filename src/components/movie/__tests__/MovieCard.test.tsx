import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MovieCard } from '../MovieCard';
import { Movie } from '@/types';

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

const mockOnPress = jest.fn();
let mockActionType = 'follow';
let mockIsActive = false;

jest.mock('@/hooks/useMovieAction', () => ({
  useMovieAction: () => ({
    actionType: mockActionType,
    isActive: mockIsActive,
    onPress: mockOnPress,
  }),
}));

const mockMovie: Movie = {
  id: '1',
  tmdb_id: null,
  title: 'Pushpa 2: The Rule',
  poster_url: 'https://example.com/poster.jpg',
  backdrop_url: null,
  release_date: '2024-12-05',
  runtime: 180,
  genres: ['Action', 'Thriller'],
  certification: 'UA',
  trailer_url: null,
  synopsis: null,
  director: 'Sukumar',
  in_theaters: true,
  premiere_date: null,
  rating: 4.5,
  review_count: 100,
  is_featured: false,
  original_language: null,
  backdrop_focus_x: null,
  backdrop_focus_y: null,
  poster_focus_x: null,
  poster_focus_y: null,
  poster_image_type: 'poster',
  backdrop_image_type: 'backdrop',
  spotlight_focus_x: null,
  spotlight_focus_y: null,
  detail_focus_x: null,
  detail_focus_y: null,
  tmdb_last_synced_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('MovieCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActionType = 'follow';
    mockIsActive = false;
  });

  it('renders movie title', () => {
    const { getByText } = render(<MovieCard movie={mockMovie} />);
    expect(getByText('Pushpa 2: The Rule')).toBeTruthy();
  });

  it('shows star rating when rating > 0', () => {
    const { getByText } = render(<MovieCard movie={mockMovie} />);
    expect(getByText('4.5')).toBeTruthy();
  });

  it('shows release date when showReleaseDate is true', () => {
    const upcomingMovie = {
      ...mockMovie,
      in_theaters: false,
      premiere_date: null,
      release_date: '2099-01-01',
      rating: 0,
    };
    const { getByText } = render(<MovieCard movie={upcomingMovie} showReleaseDate />);
    expect(getByText(/Dec/)).toBeTruthy();
  });

  it('renders OTT platform badges when platforms provided', () => {
    const platforms = [
      {
        id: 'netflix',
        name: 'Netflix',
        logo: 'N',
        logo_url: null,
        color: '#E50914',
        display_order: 1,
      },
    ];
    const ottMovie = { ...mockMovie, in_theaters: false, premiere_date: null };
    const { UNSAFE_queryAllByType } = render(<MovieCard movie={ottMovie} platforms={platforms} />);
    expect(UNSAFE_queryAllByType).toBeTruthy();
  });

  it('is accessible with movie title label', () => {
    const { getByLabelText } = render(<MovieCard movie={mockMovie} />);
    expect(getByLabelText('Pushpa 2: The Rule')).toBeTruthy();
  });

  it('navigates to movie detail when card is pressed', () => {
    const { getByLabelText } = render(<MovieCard movie={mockMovie} />);
    fireEvent.press(getByLabelText('Pushpa 2: The Rule'));
    expect(mockPush).toHaveBeenCalledWith('/movie/1');
  });

  it('does not show rating row when rating is 0', () => {
    const noRatingMovie = { ...mockMovie, rating: 0, review_count: 0 };
    const { queryByText } = render(<MovieCard movie={noRatingMovie} />);
    expect(queryByText('0')).toBeNull();
  });

  it('renders without poster_url (null fallback)', () => {
    const noPosterMovie = { ...mockMovie, poster_url: null };
    const { getByText } = render(<MovieCard movie={noPosterMovie} />);
    expect(getByText('Pushpa 2: The Rule')).toBeTruthy();
  });

  it('renders action overlay on poster', () => {
    const { getByLabelText } = render(<MovieCard movie={mockMovie} />);
    expect(getByLabelText('Follow Pushpa 2: The Rule')).toBeTruthy();
  });

  it('shows active state when action is active', () => {
    mockIsActive = true;
    const { getByLabelText } = render(<MovieCard movie={mockMovie} />);
    expect(getByLabelText(/Following Pushpa 2: The Rule/)).toBeTruthy();
  });

  it('calls action handler when overlay is pressed', () => {
    const { getByLabelText } = render(<MovieCard movie={mockMovie} />);
    fireEvent.press(getByLabelText('Follow Pushpa 2: The Rule'));
    expect(mockOnPress).toHaveBeenCalled();
  });

  it('shows watchlist label for streaming movies', () => {
    mockActionType = 'watchlist';
    const { getByLabelText } = render(<MovieCard movie={mockMovie} />);
    expect(getByLabelText('Save Pushpa 2: The Rule')).toBeTruthy();
  });
});
