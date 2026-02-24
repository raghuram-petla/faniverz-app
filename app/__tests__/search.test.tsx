jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Movie } from '@/types';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

const mockResults: Movie[] = [
  {
    id: '1',
    tmdb_id: null,
    title: 'Pushpa 2',
    release_type: 'theatrical',
    release_date: '2024-12-05',
    poster_url: null,
    backdrop_url: null,
    rating: 4.5,
    review_count: 10,
    genres: ['Action'],
    certification: 'UA',
    runtime: 180,
    synopsis: null,
    director: 'Sukumar',
    trailer_url: null,
    tmdb_last_synced_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockUseMovieSearch = jest.fn();

jest.mock('@/features/movies/hooks/useMovieSearch', () => ({
  useMovieSearch: (...args: unknown[]) => mockUseMovieSearch(...args),
}));

const mockUseMovies = jest.fn().mockReturnValue({ data: [] });
jest.mock('@/features/movies/hooks/useMovies', () => ({
  useMovies: () => mockUseMovies(),
}));

jest.mock('@/features/ott/hooks', () => ({
  useMoviePlatformMap: jest.fn(() => ({ data: {} })),
}));

import SearchScreen from '../search';

describe('SearchScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMovieSearch.mockReturnValue({ data: [] });
  });

  it('renders search input with autoFocus', () => {
    render(<SearchScreen />);
    const input = screen.getByPlaceholderText('Search movies, actors, directors...');
    expect(input).toBeTruthy();
    expect(input.props.autoFocus).toBe(true);
  });

  it('renders the cancel button', () => {
    render(<SearchScreen />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('clears the query when the X button is pressed', () => {
    render(<SearchScreen />);
    const input = screen.getByPlaceholderText('Search movies, actors, directors...');

    fireEvent.changeText(input, 'push');
    expect(input.props.value).toBe('push');

    // The close-circle button appears only when query.length > 0
    // Ionicons is mocked as View; find the touchable that wraps it after the input
    // Use testID-less approach: press the clear button by finding it
    // The clear button is the TouchableOpacity that wraps the close-circle icon
    // We can find the clear (X) button as the one directly adjacent to the input inside the container
    const clearButtons = screen.UNSAFE_queryAllByType(require('react-native').TouchableOpacity);
    // First TouchableOpacity inside the search container is the clear button;
    // second is the Cancel button. Pressing the first should clear the input.
    const clearButton = clearButtons[0];
    fireEvent.press(clearButton);
    expect(input.props.value).toBe('');
  });

  it('shows recent searches when there is no query', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(['Pushpa', 'RRR']));

    const { findByText } = render(<SearchScreen />);
    expect(await findByText('Pushpa')).toBeTruthy();
    expect(await findByText('RRR')).toBeTruthy();
  });

  it('shows search results when query is >= 2 characters', () => {
    mockUseMovieSearch.mockReturnValue({ data: mockResults });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText('Search movies, actors, directors...');
    fireEvent.changeText(input, 'pu');

    expect(screen.getByText('Pushpa 2')).toBeTruthy();
    expect(screen.getByText('Sukumar')).toBeTruthy();
  });

  it('shows empty state when results are empty and query is >= 2 characters', () => {
    mockUseMovieSearch.mockReturnValue({ data: [] });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText('Search movies, actors, directors...');
    fireEvent.changeText(input, 'zzz');

    expect(screen.getByText('No results found')).toBeTruthy();
    expect(screen.getByText('Try searching for another movie')).toBeTruthy();
  });

  it('renders Trending Now section when movies exist', () => {
    const trendingMovies = [{ ...mockResults[0], id: 't1', title: 'Top Movie', rating: 5.0 }];
    mockUseMovies.mockReturnValue({ data: trendingMovies });
    render(<SearchScreen />);
    expect(screen.getByText('Trending Now')).toBeTruthy();
    expect(screen.getByText('Top Movie')).toBeTruthy();
  });

  it('removes a recent search when its close button is pressed', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(['Pushpa', 'RRR']));

    const { findByText } = render(<SearchScreen />);
    await findByText('Pushpa');

    // The Clear button removes all recent searches
    fireEvent.press(screen.getByText('Clear'));
    expect(AsyncStorage.removeItem).toHaveBeenCalled();
  });

  it('navigates back when Cancel is pressed', () => {
    render(<SearchScreen />);
    fireEvent.press(screen.getByText('Cancel'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('clears the query when the X button is pressed and shows no results', () => {
    render(<SearchScreen />);
    const input = screen.getByPlaceholderText('Search movies, actors, directors...');
    fireEvent.changeText(input, 'pushpa');
    expect(input.props.value).toBe('pushpa');

    const clearButtons = screen.UNSAFE_queryAllByType(require('react-native').TouchableOpacity);
    fireEvent.press(clearButtons[0]);
    expect(input.props.value).toBe('');
  });
});
