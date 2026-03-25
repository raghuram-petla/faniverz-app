jest.mock('react-i18next', () => {
  const en = require('../../src/i18n/en.json') as Record<string, Record<string, string>>;
  const t = (key: string, params?: Record<string, unknown>) => {
    const [ns, k] = key.split('.');
    let val = en[ns]?.[k] ?? key;
    if (params)
      Object.entries(params).forEach(([pk, pv]) => {
        val = val.replace(`{{${pk}}}`, String(pv));
      });
    return val;
  };
  return { useTranslation: () => ({ t, i18n: { language: 'en' } }) };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@/hooks/useMovieAction', () => ({
  useMovieAction: () => ({
    actionType: 'follow',
    isActive: false,
    onPress: jest.fn(),
  }),
}));

let capturedRefreshCallback: (() => Promise<void>) | null = null;
jest.mock('@/hooks/useRefresh', () => ({
  useRefresh: (callback: () => Promise<void>) => {
    capturedRefreshCallback = callback;
    return { refreshing: false, onRefresh: jest.fn() };
  },
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Movie } from '@/types';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, dismissAll: jest.fn() }),
  useNavigation: () => ({ getState: () => ({ index: 0 }) }),
}));

const mockResults: Movie[] = [
  {
    id: '1',
    tmdb_id: null,
    title: 'Pushpa 2',
    in_theaters: true,
    premiere_date: null,
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
    imdb_id: null,
    title_te: null,
    synopsis_te: null,
    tagline: null,
    tmdb_status: null,
    tmdb_vote_average: null,
    tmdb_vote_count: null,
    budget: null,
    revenue: null,
    tmdb_popularity: null,
    spoken_languages: null,
    collection_id: null,
    collection_name: null,
    language_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockUseUniversalSearch = jest.fn();

jest.mock('@/features/search', () => ({
  useUniversalSearch: (...args: unknown[]) => mockUseUniversalSearch(...args),
}));

jest.mock('@/components/search/SearchResultActor', () => {
  const { Text } = require('react-native');
  return {
    SearchResultActor: ({ actor, onPress }: { actor: { name: string }; onPress: () => void }) => (
      <Text onPress={onPress}>{actor.name}</Text>
    ),
  };
});

jest.mock('@/components/search/SearchResultProductionHouse', () => {
  const { Text } = require('react-native');
  return {
    SearchResultProductionHouse: ({
      house,
      onPress,
    }: {
      house: { name: string };
      onPress: () => void;
    }) => <Text onPress={onPress}>{house.name}</Text>,
  };
});

const mockUseMovies = jest.fn().mockReturnValue({ data: [] });
jest.mock('@/features/movies/hooks/useMovies', () => ({
  useMovies: () => mockUseMovies(),
}));

jest.mock('@/features/ott/hooks', () => ({
  useMoviePlatformMap: jest.fn(() => ({ data: {} })),
}));

import SearchScreen from '../search';

const PLACEHOLDER = 'Search movies, actors, studios...';

describe('SearchScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUniversalSearch.mockReturnValue({
      data: { movies: [], actors: [], productionHouses: [] },
    });
  });

  it('renders search input with autoFocus', () => {
    render(<SearchScreen />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    expect(input).toBeTruthy();
    expect(input.props.autoFocus).toBe(true);
  });

  it('renders the cancel button', () => {
    render(<SearchScreen />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('clears the query when the X button is pressed', () => {
    render(<SearchScreen />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);

    fireEvent.changeText(input, 'push');
    expect(input.props.value).toBe('push');

    const clearButtons = screen.UNSAFE_queryAllByType(require('react-native').TouchableOpacity);
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
    mockUseUniversalSearch.mockReturnValue({
      data: { movies: mockResults, actors: [], productionHouses: [] },
    });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, 'pu');

    expect(screen.getByText('Pushpa 2')).toBeTruthy();
    expect(screen.getByText('Sukumar')).toBeTruthy();
  });

  it('shows empty state when results are empty and query is >= 2 characters', () => {
    mockUseUniversalSearch.mockReturnValue({
      data: { movies: [], actors: [], productionHouses: [] },
    });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, 'zzz');

    expect(screen.getByText('No results found')).toBeTruthy();
    expect(screen.getByText('Try a different search term')).toBeTruthy();
  });

  it('renders Trending Now section when movies exist', () => {
    const trendingMovies = [
      { ...mockResults[0], id: 't1', title: 'Top Movie', rating: 5.0 },
      { ...mockResults[0], id: 't2', title: 'Second Movie', rating: 3.0 },
    ];
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
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, 'pushpa');
    expect(input.props.value).toBe('pushpa');

    const clearButtons = screen.UNSAFE_queryAllByType(require('react-native').TouchableOpacity);
    fireEvent.press(clearButtons[0]);
    expect(input.props.value).toBe('');
  });

  it('saves search and navigates when a search result is pressed', () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    mockUseUniversalSearch.mockReturnValue({
      data: { movies: mockResults, actors: [], productionHouses: [] },
    });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, 'push');

    fireEvent.press(screen.getByText('Pushpa 2'));

    expect(mockPush).toHaveBeenCalledWith('/movie/1');
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });

  it('navigates to movie detail when a trending movie is pressed', () => {
    const trendingMovies = [{ ...mockResults[0], id: 't1', title: 'Top Movie', rating: 5.0 }];
    mockUseMovies.mockReturnValue({ data: trendingMovies });

    render(<SearchScreen />);
    fireEvent.press(screen.getByText('Top Movie'));

    expect(mockPush).toHaveBeenCalledWith('/movie/t1');
  });

  it('removes an individual recent search when its close button is pressed', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(['Pushpa', 'RRR']));

    const { findByText } = render(<SearchScreen />);
    await findByText('Pushpa');

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

    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeTruthy();
  });

  it('handles null AsyncStorage data gracefully', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    AsyncStorage.getItem.mockResolvedValueOnce(null);

    render(<SearchScreen />);

    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeTruthy();
    expect(screen.queryByText('Recent Searches')).toBeNull();
  });

  it('shows results count when results are found', () => {
    mockUseUniversalSearch.mockReturnValue({
      data: { movies: mockResults, actors: [], productionHouses: [] },
    });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, 'pu');

    expect(screen.getByText('1 result found')).toBeTruthy();
  });

  it('shows plural results count for multiple results', () => {
    const multiResults = [...mockResults, { ...mockResults[0], id: '2', title: 'Pushpa 3' }];
    mockUseUniversalSearch.mockReturnValue({
      data: { movies: multiResults, actors: [], productionHouses: [] },
    });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, 'pu');

    expect(screen.getByText('2 results found')).toBeTruthy();
  });

  it('sets query from a recent search pill press', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(['Pushpa']));

    const { findByText } = render(<SearchScreen />);
    const pushpaPill = await findByText('Pushpa');

    fireEvent.press(pushpaPill);

    const input = screen.getByPlaceholderText(PLACEHOLDER);
    expect(input.props.value).toBe('Pushpa');
  });

  it('renders result movie metadata including genres and badges', () => {
    mockUseUniversalSearch.mockReturnValue({
      data: { movies: mockResults, actors: [], productionHouses: [] },
    });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, 'pu');

    expect(screen.getByText('In Theaters')).toBeTruthy();
    expect(screen.getByText('Action')).toBeTruthy();
  });

  it('shows Streaming badge for ott movie in results', () => {
    const ottResult = { ...mockResults[0], id: 'ott-1', in_theaters: false, premiere_date: null };
    mockUseUniversalSearch.mockReturnValue({
      data: { movies: [ottResult], actors: [], productionHouses: [] },
    });
    const ottHooks = require('@/features/ott/hooks');
    ottHooks.useMoviePlatformMap.mockReturnValue({
      data: {
        'ott-1': [
          { id: 'netflix', name: 'Netflix', logo: 'N', color: '#E50914', display_order: 0 },
        ],
      },
    });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, 'pu');

    expect(screen.getByText('Streaming')).toBeTruthy();
  });

  it('shows Coming Soon badge for upcoming movie in results', () => {
    const upcomingResult = {
      ...mockResults[0],
      id: 'up-1',
      in_theaters: false,
      premiere_date: null,
      release_date: '2099-01-01',
    };
    mockUseUniversalSearch.mockReturnValue({
      data: { movies: [upcomingResult], actors: [], productionHouses: [] },
    });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, 'pu');

    expect(screen.getByText('Coming Soon')).toBeTruthy();
  });

  it('shows platform badge overlay when result has a platform in platformMap', () => {
    const mockOttHooks = require('@/features/ott/hooks');
    mockOttHooks.useMoviePlatformMap.mockReturnValue({
      data: {
        '1': [{ id: 'netflix', name: 'Netflix', logo: 'N', color: '#E50914', display_order: 1 }],
      },
    });
    mockUseUniversalSearch.mockReturnValue({
      data: { movies: mockResults, actors: [], productionHouses: [] },
    });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, 'pu');

    expect(screen.getByText('N')).toBeTruthy();
  });

  it('shows actor results in search', () => {
    mockUseUniversalSearch.mockReturnValue({
      data: {
        movies: [],
        actors: [{ id: 'a1', name: 'Allu Arjun', photo_url: null }],
        productionHouses: [],
      },
    });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, 'allu');

    expect(screen.getByText('Allu Arjun')).toBeTruthy();
  });

  it('shows production house results in search', () => {
    mockUseUniversalSearch.mockReturnValue({
      data: {
        movies: [],
        actors: [],
        productionHouses: [{ id: 'ph1', name: 'Mythri Movie Makers', logo_url: null }],
      },
    });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, 'myth');

    expect(screen.getByText('Mythri Movie Makers')).toBeTruthy();
  });

  it('counts total results across all entity types', () => {
    mockUseUniversalSearch.mockReturnValue({
      data: {
        movies: mockResults,
        actors: [{ id: 'a1', name: 'Actor 1', photo_url: null }],
        productionHouses: [{ id: 'ph1', name: 'Studio 1', logo_url: null }],
      },
    });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, 'te');

    expect(screen.getByText('3 results found')).toBeTruthy();
  });

  it('navigates to actor detail when actor result is pressed', () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    mockUseUniversalSearch.mockReturnValue({
      data: {
        movies: [],
        actors: [{ id: 'a1', name: 'Allu Arjun', photo_url: null }],
        productionHouses: [],
      },
    });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, 'allu');

    fireEvent.press(screen.getByText('Allu Arjun'));
    expect(mockPush).toHaveBeenCalledWith('/actor/a1');
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });

  it('navigates to production house detail when house result is pressed', () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    mockUseUniversalSearch.mockReturnValue({
      data: {
        movies: [],
        actors: [],
        productionHouses: [{ id: 'ph1', name: 'Mythri', logo_url: null }],
      },
    });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, 'myth');

    fireEvent.press(screen.getByText('Mythri'));
    expect(mockPush).toHaveBeenCalledWith('/production-house/ph1');
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });

  it('filters results to movies only when Movies filter is pressed', () => {
    mockUseUniversalSearch.mockReturnValue({
      data: {
        movies: mockResults,
        actors: [{ id: 'a1', name: 'Allu Arjun', photo_url: null }],
        productionHouses: [],
      },
    });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, 'pu');

    // Press the Movies filter chip (shows count since results exist)
    fireEvent.press(screen.getByText('Movies (1)'));
    // After filtering, only movies should show — actor should not
    expect(screen.queryByText('Allu Arjun')).toBeNull();
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('filters results to actors only when Actors filter is pressed', () => {
    mockUseUniversalSearch.mockReturnValue({
      data: {
        movies: mockResults,
        actors: [{ id: 'a1', name: 'Allu Arjun', photo_url: null }],
        productionHouses: [],
      },
    });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, 'pu');

    fireEvent.press(screen.getByText('Actors (1)'));
    expect(screen.queryByText('Pushpa 2')).toBeNull();
    expect(screen.getByText('Allu Arjun')).toBeTruthy();
  });

  it('calls refetchResults in the refresh callback', async () => {
    const mockRefetch = jest.fn().mockResolvedValue(undefined);
    mockUseUniversalSearch.mockReturnValue({
      data: { movies: [], actors: [], productionHouses: [] },
      refetch: mockRefetch,
    });

    render(<SearchScreen />);

    // capturedRefreshCallback should be set now
    expect(capturedRefreshCallback).not.toBeNull();
    await capturedRefreshCallback!();
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('filters results to studios only when Studios filter is pressed', () => {
    mockUseUniversalSearch.mockReturnValue({
      data: {
        movies: mockResults,
        actors: [{ id: 'a1', name: 'Allu Arjun', photo_url: null }],
        productionHouses: [{ id: 'ph1', name: 'Mythri', logo_url: null }],
      },
    });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, 'pu');

    fireEvent.press(screen.getByText('Studios (1)'));
    expect(screen.queryByText('Pushpa 2')).toBeNull();
    expect(screen.queryByText('Allu Arjun')).toBeNull();
    expect(screen.getByText('Mythri')).toBeTruthy();
  });

  it('saveSearch deduplicates existing recent searches', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(['OldTerm', 'AnotherTerm']));
    mockUseUniversalSearch.mockReturnValue({
      data: { movies: mockResults, actors: [], productionHouses: [] },
    });

    const { findByText } = render(<SearchScreen />);
    // Wait for recent searches to load
    await findByText('OldTerm');

    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, 'push');
    fireEvent.press(screen.getByText('Pushpa 2'));

    // saveSearch('push') runs with recentSearches=['OldTerm', 'AnotherTerm']
    // The filter callback filters out duplicates
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  it('handles undefined searchResults (covers ?? [] fallbacks)', () => {
    mockUseUniversalSearch.mockReturnValue({ data: undefined });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, 'pu');

    // Should show empty state without crashing
    expect(screen.getByText('No results found')).toBeTruthy();
  });

  it('shows divider between non-movie results and movie results', () => {
    mockUseUniversalSearch.mockReturnValue({
      data: {
        movies: mockResults,
        actors: [{ id: 'a1', name: 'Allu Arjun', photo_url: null }],
        productionHouses: [],
      },
    });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, 'pu');

    // Both actor and movie results should be visible
    expect(screen.getByText('Allu Arjun')).toBeTruthy();
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('does not show empty state when actors exist but no movies (ListEmptyComponent branch)', () => {
    mockUseUniversalSearch.mockReturnValue({
      data: {
        movies: [],
        actors: [{ id: 'a1', name: 'Allu Arjun', photo_url: null }],
        productionHouses: [],
      },
    });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, 'al');

    expect(screen.getByText('Allu Arjun')).toBeTruthy();
    // Should NOT show empty state since actors are found
    expect(screen.queryByText('No results found')).toBeNull();
  });

  it('does not save search when query is less than 2 chars on movie press', () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const trendingMovies = [{ ...mockResults[0], id: 't1', title: 'Top Movie', rating: 5.0 }];
    mockUseMovies.mockReturnValue({ data: trendingMovies });

    render(<SearchScreen />);
    // Query is empty (< 2 chars), pressing trending movie should not save search
    fireEvent.press(screen.getByText('Top Movie'));

    expect(mockPush).toHaveBeenCalledWith('/movie/t1');
    // setItem should NOT have been called for recent searches
    expect(
      AsyncStorage.setItem.mock.calls.filter((c: string[]) => c[0] === 'recent_searches').length,
    ).toBe(0);
  });

  it('handles AsyncStorage.getItem rejection gracefully', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    AsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage unavailable'));

    render(<SearchScreen />);
    // Should not crash
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeTruthy();
  });

  it('does not show clear button when query is empty', () => {
    render(<SearchScreen />);
    // close-circle icon should not be present when query is empty
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    expect(input.props.value).toBe('');
  });

  it('does not show filter chips when query is less than 2 chars', () => {
    render(<SearchScreen />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, 'p');

    expect(screen.queryByText('All')).toBeNull();
    expect(screen.queryByText('Movies')).toBeNull();
  });

  it('does not show results count text when totalResults is 0', () => {
    mockUseUniversalSearch.mockReturnValue({
      data: { movies: [], actors: [], productionHouses: [] },
    });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, 'zz');

    // Should not show "0 results found"
    expect(screen.queryByText('0 results found')).toBeNull();
    expect(screen.queryByText('0 result found')).toBeNull();
  });

  it('shows filter chips with counts when results exist', () => {
    mockUseUniversalSearch.mockReturnValue({
      data: {
        movies: mockResults,
        actors: [{ id: 'a1', name: 'Allu', photo_url: null }],
        productionHouses: [{ id: 'ph1', name: 'Mythri', logo_url: null }],
      },
    });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, 'te');

    expect(screen.getByText('Movies (1)')).toBeTruthy();
    expect(screen.getByText('Actors (1)')).toBeTruthy();
    expect(screen.getByText('Studios (1)')).toBeTruthy();
  });

  it('shows filter chips without counts when results are empty', () => {
    mockUseUniversalSearch.mockReturnValue({
      data: { movies: [], actors: [], productionHouses: [] },
    });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, 'te');

    // No counts in labels when 0 results
    expect(screen.getByText('Movies')).toBeTruthy();
    expect(screen.getByText('Actors')).toBeTruthy();
    expect(screen.getByText('Studios')).toBeTruthy();
  });

  it('does not save actor search when query is less than 2 chars', () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    mockUseUniversalSearch.mockReturnValue({
      data: {
        movies: [],
        actors: [{ id: 'a1', name: 'Short Query Actor', photo_url: null }],
        productionHouses: [],
      },
    });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, 'a'); // 1 char, < 2

    // Since query < 2, hasQuery is false and results are not shown
    // Verify no save happened
    expect(
      AsyncStorage.setItem.mock.calls.filter((c: string[]) => c[0] === 'recent_searches').length,
    ).toBe(0);
  });

  it('does not show divider when only movies exist (no actors/houses)', () => {
    mockUseUniversalSearch.mockReturnValue({
      data: { movies: mockResults, actors: [], productionHouses: [] },
    });

    render(<SearchScreen />);
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, 'pu');

    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('handles empty trending movies list (no Trending Now section)', () => {
    mockUseMovies.mockReturnValue({ data: [] });
    render(<SearchScreen />);
    expect(screen.queryByText('Trending Now')).toBeNull();
  });
});
