jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
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
    is_featured: false,
    genres: ['Action'],
    certification: 'UA',
    runtime: 180,
    synopsis: null,
    director: 'Sukumar',
    trailer_url: null,
    original_language: null,
    backdrop_focus_x: null,
    backdrop_focus_y: null,
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

  it('saves search and navigates when a search result is pressed', () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    mockUseMovieSearch.mockReturnValue({ data: mockResults });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText('Search movies, actors, directors...');
    fireEvent.changeText(input, 'push');

    // Press the search result item
    fireEvent.press(screen.getByText('Pushpa 2'));

    expect(mockPush).toHaveBeenCalledWith('/movie/1');
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });

  it('navigates to movie detail when a trending movie is pressed', () => {
    const trendingMovies = [{ ...mockResults[0], id: 't1', title: 'Top Movie', rating: 5.0 }];
    mockUseMovies.mockReturnValue({ data: trendingMovies });

    render(<SearchScreen />);
    fireEvent.press(screen.getByText('Top Movie'));

    // query is empty, so no search is saved, but navigation still happens
    expect(mockPush).toHaveBeenCalledWith('/movie/t1');
  });

  it('removes an individual recent search when its close button is pressed', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(['Pushpa', 'RRR']));

    const { findByText } = render(<SearchScreen />);
    await findByText('Pushpa');

    // DOM structure when query is empty and recent searches are loaded:
    // Touchables in order: Cancel(0), Clear(1), Pushpa-text(2), Pushpa-close(3), RRR-text(4), RRR-close(5)
    const { TouchableOpacity } = require('react-native');
    const allTouchables = screen.UNSAFE_queryAllByType(TouchableOpacity);

    // Index 3 is the close button for the "Pushpa" pill (removeSearch)
    fireEvent.press(allTouchables[3]);

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  it('loads recent searches from AsyncStorage on mount', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(['Kalki', 'Bahubali']));

    const { findByText } = render(<SearchScreen />);

    expect(await findByText('Kalki')).toBeTruthy();
    expect(await findByText('Bahubali')).toBeTruthy();
    expect(screen.getByText('Recent Searches')).toBeTruthy();
  });

  it('handles corrupted AsyncStorage data gracefully', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    AsyncStorage.getItem.mockResolvedValueOnce('not-valid-json{{{');

    render(<SearchScreen />);

    // Should not crash — the component still renders
    expect(screen.getByPlaceholderText('Search movies, actors, directors...')).toBeTruthy();
  });

  it('handles null AsyncStorage data gracefully', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    AsyncStorage.getItem.mockResolvedValueOnce(null);

    render(<SearchScreen />);

    expect(screen.getByPlaceholderText('Search movies, actors, directors...')).toBeTruthy();
    // No "Recent Searches" heading should appear with no data
    expect(screen.queryByText('Recent Searches')).toBeNull();
  });

  it('shows results count when results are found', () => {
    mockUseMovieSearch.mockReturnValue({ data: mockResults });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText('Search movies, actors, directors...');
    fireEvent.changeText(input, 'pu');

    expect(screen.getByText('1 result found')).toBeTruthy();
  });

  it('shows plural results count for multiple results', () => {
    const multiResults = [...mockResults, { ...mockResults[0], id: '2', title: 'Pushpa 3' }];
    mockUseMovieSearch.mockReturnValue({ data: multiResults });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText('Search movies, actors, directors...');
    fireEvent.changeText(input, 'pu');

    expect(screen.getByText('2 results found')).toBeTruthy();
  });

  it('sets query from a recent search pill press', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(['Pushpa']));

    const { findByText } = render(<SearchScreen />);
    const pushpaPill = await findByText('Pushpa');

    // Press the text part of the pill to set query
    fireEvent.press(pushpaPill);

    const input = screen.getByPlaceholderText('Search movies, actors, directors...');
    expect(input.props.value).toBe('Pushpa');
  });

  it('renders result movie metadata including genres and badges', () => {
    mockUseMovieSearch.mockReturnValue({ data: mockResults });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText('Search movies, actors, directors...');
    fireEvent.changeText(input, 'pu');

    expect(screen.getByText('In Theaters')).toBeTruthy();
    expect(screen.getByText('Action')).toBeTruthy();
  });

  it('shows Streaming badge for ott movie in results', () => {
    const ottResult = { ...mockResults[0], id: 'ott-1', release_type: 'ott' as const };
    mockUseMovieSearch.mockReturnValue({ data: [ottResult] });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText('Search movies, actors, directors...');
    fireEvent.changeText(input, 'pu');

    expect(screen.getByText('Streaming')).toBeTruthy();
  });

  it('shows Upcoming badge for upcoming movie in results', () => {
    const upcomingResult = {
      ...mockResults[0],
      id: 'up-1',
      release_type: 'upcoming' as const,
    };
    mockUseMovieSearch.mockReturnValue({ data: [upcomingResult] });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText('Search movies, actors, directors...');
    fireEvent.changeText(input, 'pu');

    expect(screen.getByText('Upcoming')).toBeTruthy();
  });

  it('shows platform badge overlay when result has a platform in platformMap', () => {
    const mockOttHooks = require('@/features/ott/hooks');
    mockOttHooks.useMoviePlatformMap.mockReturnValue({
      data: {
        '1': [{ id: 'netflix', name: 'Netflix', logo: 'N', color: '#E50914', display_order: 1 }],
      },
    });
    mockUseMovieSearch.mockReturnValue({ data: mockResults });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText('Search movies, actors, directors...');
    fireEvent.changeText(input, 'pu');

    expect(screen.getByText('N')).toBeTruthy();
  });
});
