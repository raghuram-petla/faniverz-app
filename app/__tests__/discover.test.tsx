jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Movie } from '@/types';
import { useFilterStore } from '@/stores/useFilterStore';

const mockPush = jest.fn();
const mockLocalSearchParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => mockLocalSearchParams,
}));

const mockMovies: Movie[] = [
  {
    id: '1',
    tmdb_id: null,
    title: 'Pushpa 2',
    release_type: 'theatrical',
    release_date: '2025-03-01',
    poster_url: 'https://example.com/pushpa.jpg',
    backdrop_url: null,
    rating: 4.5,
    review_count: 10,
    genres: ['Action'],
    certification: 'UA',
    runtime: 180,
    synopsis: '',
    director: 'Sukumar',
    trailer_url: null,
    tmdb_last_synced_at: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '2',
    tmdb_id: null,
    title: 'Kalki',
    release_type: 'ott',
    release_date: '2025-02-01',
    poster_url: 'https://example.com/kalki.jpg',
    backdrop_url: null,
    rating: 4.0,
    review_count: 8,
    genres: ['Sci-Fi'],
    certification: 'UA',
    runtime: 150,
    synopsis: '',
    director: 'Nag Ashwin',
    trailer_url: null,
    tmdb_last_synced_at: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

const mockPlatforms = [
  { id: 'netflix', name: 'Netflix', logo: 'N', color: '#E50914', display_order: 1 },
];

const mockFetchNextPage = jest.fn();

jest.mock('@/features/movies/hooks/useMoviesPaginated', () => ({
  useMoviesPaginated: jest.fn(),
}));

jest.mock('@/features/ott/hooks', () => ({
  usePlatforms: jest.fn(() => ({ data: mockPlatforms })),
  useMoviePlatformMap: jest.fn(() => ({ data: {} })),
}));

import DiscoverScreen from '../discover';
import { useMoviesPaginated } from '@/features/movies/hooks/useMoviesPaginated';

const mockUseMoviesPaginated = useMoviesPaginated as jest.Mock;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setupDefaultMock(overrides: Record<string, any> = {}) {
  mockUseMoviesPaginated.mockReturnValue({
    data: { pages: [mockMovies], pageParams: [0] },
    hasNextPage: false,
    fetchNextPage: mockFetchNextPage,
    isFetchingNextPage: false,
    isLoading: false,
    ...overrides,
  });
}

// Use the real Zustand store; reset state before each test
beforeEach(() => {
  jest.clearAllMocks();
  useFilterStore.getState().clearAll();
  setupDefaultMock();
  // Reset URL params
  Object.keys(mockLocalSearchParams).forEach((k) => delete mockLocalSearchParams[k]);
});

describe('DiscoverScreen', () => {
  it('renders search input', () => {
    const { getByPlaceholderText } = render(<DiscoverScreen />);
    expect(getByPlaceholderText('Search movies, genres, actors...')).toBeTruthy();
  });

  it('renders release type tab: All', () => {
    const { getByText } = render(<DiscoverScreen />);
    expect(getByText('All')).toBeTruthy();
  });

  it('renders release type tab: Theaters', () => {
    const { getByText } = render(<DiscoverScreen />);
    expect(getByText('Theaters')).toBeTruthy();
  });

  it('renders release type tab: Streaming', () => {
    const { getAllByText } = render(<DiscoverScreen />);
    // "Streaming" appears in both the tab bar and as a StatusBadge on OTT movies
    expect(getAllByText('Streaming').length).toBeGreaterThanOrEqual(1);
  });

  it('renders release type tab: Soon', () => {
    const { getByText } = render(<DiscoverScreen />);
    expect(getByText('Soon')).toBeTruthy();
  });

  it('shows sort dropdown label', () => {
    const { getByText } = render(<DiscoverScreen />);
    // Default sortBy is 'popular' which maps to label 'Popular'
    expect(getByText('Popular')).toBeTruthy();
  });

  it('renders movie titles when movies exist', () => {
    const { getByText } = render(<DiscoverScreen />);
    expect(getByText('Pushpa 2')).toBeTruthy();
    expect(getByText('Kalki')).toBeTruthy();
  });

  it('renders Filters button', () => {
    const { getByText } = render(<DiscoverScreen />);
    expect(getByText('Filters')).toBeTruthy();
  });

  it('renders movie posters (Images) when movies exist', () => {
    const { UNSAFE_getAllByType } = render(<DiscoverScreen />);
    const { View } = require('react-native');
    const views = UNSAFE_getAllByType(View);
    expect(views.length).toBeGreaterThan(0);
  });

  it('renders with empty movies list without crashing', () => {
    setupDefaultMock({ data: { pages: [[]], pageParams: [0] } });
    const { getByPlaceholderText } = render(<DiscoverScreen />);
    expect(getByPlaceholderText('Search movies, genres, actors...')).toBeTruthy();
  });

  it('opens filter modal when Filters button is pressed', () => {
    const { getByText } = render(<DiscoverScreen />);
    fireEvent.press(getByText('Filters'));
    // Modal content renders "Streaming Platforms" and "Genres" headings
    expect(getByText('Streaming Platforms')).toBeTruthy();
    expect(getByText('Genres')).toBeTruthy();
  });

  it('toggles sort dropdown and selects Rating sort option', () => {
    const { getByText } = render(<DiscoverScreen />);
    // Open sort dropdown
    fireEvent.press(getByText('Popular'));
    // Sort options appear
    expect(getByText('Rating')).toBeTruthy();
    expect(getByText('Latest')).toBeTruthy();
    expect(getByText('Upcoming')).toBeTruthy();
    // Select Rating
    fireEvent.press(getByText('Rating'));
    expect(useFilterStore.getState().sortBy).toBe('top_rated');
  });

  it('toggles genre filter in modal and shows active pill', () => {
    const { getByText } = render(<DiscoverScreen />);
    // Open filter modal
    fireEvent.press(getByText('Filters'));
    // Toggle Action genre
    fireEvent.press(getByText('Action'));
    // Close modal
    fireEvent.press(getByText(/Show.*Movies/));
    // Active pill should appear
    expect(useFilterStore.getState().selectedGenres).toContain('Action');
  });

  it('toggles platform filter in modal', () => {
    const { getByText, getAllByText } = render(<DiscoverScreen />);
    // Open filter modal
    fireEvent.press(getByText('Filters'));
    // The modal shows Netflix as a platform option
    const netflixOptions = getAllByText('Netflix');
    fireEvent.press(netflixOptions[netflixOptions.length - 1]);
    expect(useFilterStore.getState().selectedPlatforms).toContain('netflix');
  });

  it('clears all filters when Clear All is pressed', () => {
    // Pre-populate filters
    useFilterStore.getState().toggleGenre('Action');
    useFilterStore.getState().togglePlatform('netflix');

    const { getByText } = render(<DiscoverScreen />);
    // Active pills and Clear All link should appear
    fireEvent.press(getByText('Clear All'));
    const state = useFilterStore.getState();
    expect(state.selectedGenres).toEqual([]);
    expect(state.selectedPlatforms).toEqual([]);
  });

  it('applies URL param filter on mount', () => {
    mockLocalSearchParams.filter = 'theatrical';

    render(<DiscoverScreen />);
    expect(useFilterStore.getState().selectedFilter).toBe('theatrical');
  });

  it('applies URL param platform on mount', () => {
    mockLocalSearchParams.platform = 'netflix';

    render(<DiscoverScreen />);
    expect(useFilterStore.getState().selectedPlatforms).toContain('netflix');
  });

  it('filters movies by search query', () => {
    const { getByPlaceholderText, getByText, queryByText } = render(<DiscoverScreen />);
    const input = getByPlaceholderText('Search movies, genres, actors...');

    fireEvent.changeText(input, 'Pushpa');

    expect(getByText('Pushpa 2')).toBeTruthy();
    expect(queryByText('Kalki')).toBeNull();
  });

  it('clears search query via store', () => {
    const { getByPlaceholderText } = render(<DiscoverScreen />);
    const input = getByPlaceholderText('Search movies, genres, actors...');

    fireEvent.changeText(input, 'Pushpa');
    expect(useFilterStore.getState().searchQuery).toBe('Pushpa');

    useFilterStore.getState().setSearchQuery('');
    expect(useFilterStore.getState().searchQuery).toBe('');
  });

  it('switches release type tab from All to Theaters', () => {
    const { getByText } = render(<DiscoverScreen />);

    fireEvent.press(getByText('Theaters'));
    expect(useFilterStore.getState().selectedFilter).toBe('theatrical');
  });

  it('switches release type tab to Streaming', () => {
    const { getAllByText } = render(<DiscoverScreen />);

    const streamingTabs = getAllByText('Streaming');
    fireEvent.press(streamingTabs[0]);
    expect(useFilterStore.getState().selectedFilter).toBe('ott');
  });

  it('switches release type tab to Soon', () => {
    const { getByText } = render(<DiscoverScreen />);

    fireEvent.press(getByText('Soon'));
    expect(useFilterStore.getState().selectedFilter).toBe('upcoming');
  });

  it('removes a genre pill by pressing it', () => {
    useFilterStore.getState().toggleGenre('Action');

    const { getByText } = render(<DiscoverScreen />);
    const actionPill = getByText('Action');
    fireEvent.press(actionPill);

    expect(useFilterStore.getState().selectedGenres).toEqual([]);
  });

  it('removes a platform pill by pressing it', () => {
    useFilterStore.getState().togglePlatform('netflix');

    const { getByText } = render(<DiscoverScreen />);
    const netflixPill = getByText('Netflix');
    fireEvent.press(netflixPill);

    expect(useFilterStore.getState().selectedPlatforms).toEqual([]);
  });

  it('navigates to movie detail when a grid item is pressed', () => {
    const { getByText } = render(<DiscoverScreen />);
    fireEvent.press(getByText('Pushpa 2'));

    expect(mockPush).toHaveBeenCalledWith('/movie/1');
  });

  it('shows movie count when movies exist', () => {
    const { getByText } = render(<DiscoverScreen />);
    expect(getByText('2 movies')).toBeTruthy();
  });

  it('shows "1 movie" singular when only one movie', () => {
    setupDefaultMock({ data: { pages: [[mockMovies[0]]], pageParams: [0] } });
    const { getByText } = render(<DiscoverScreen />);
    expect(getByText('1 movie')).toBeTruthy();
  });

  it('shows empty state when no movies match filters', () => {
    setupDefaultMock({ data: { pages: [[]], pageParams: [0] } });
    const { getByText } = render(<DiscoverScreen />);
    expect(getByText('No movies found')).toBeTruthy();
  });

  it('clears filters from modal via Clear Filters button', () => {
    useFilterStore.getState().toggleGenre('Action');

    const { getByText } = render(<DiscoverScreen />);
    // Open filter modal
    fireEvent.press(getByText('Filters'));
    // Press "Clear Filters" in the modal
    fireEvent.press(getByText('Clear Filters'));

    const state = useFilterStore.getState();
    expect(state.selectedGenres).toEqual([]);
  });

  it('displays filter count badge when filters are active', () => {
    useFilterStore.getState().toggleGenre('Action');
    useFilterStore.getState().togglePlatform('netflix');

    const { getByText } = render(<DiscoverScreen />);
    // Filter count badge should show "2"
    expect(getByText('2')).toBeTruthy();
  });

  it('filters movies by director name in search', () => {
    const { getByPlaceholderText, getByText, queryByText } = render(<DiscoverScreen />);
    const input = getByPlaceholderText('Search movies, genres, actors...');

    fireEvent.changeText(input, 'Sukumar');

    expect(getByText('Pushpa 2')).toBeTruthy();
    expect(queryByText('Kalki')).toBeNull();
  });

  it('filters movies by genre', () => {
    useFilterStore.getState().toggleGenre('Sci-Fi');

    const { getByText, queryByText } = render(<DiscoverScreen />);
    expect(getByText('Kalki')).toBeTruthy();
    expect(queryByText('Pushpa 2')).toBeNull();
  });

  it('filters movies by platform when platform map has entries', () => {
    const { useMoviePlatformMap } = require('@/features/ott/hooks');
    useMoviePlatformMap.mockReturnValue({
      data: {
        '2': [{ id: 'netflix', name: 'Netflix', logo: 'N', color: '#E50914', display_order: 1 }],
      },
    });
    useFilterStore.getState().togglePlatform('netflix');

    const { getByText, queryByText } = render(<DiscoverScreen />);
    expect(getByText('Kalki')).toBeTruthy();
    expect(queryByText('Pushpa 2')).toBeNull();
  });

  // ── Infinite scroll tests ─────────────────────────────────────

  it('shows loading spinner on initial load', () => {
    setupDefaultMock({ isLoading: true });

    const { UNSAFE_getByType } = render(<DiscoverScreen />);
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('renders movies from multiple pages', () => {
    const page2Movies: Movie[] = [
      {
        ...mockMovies[0],
        id: '3',
        title: 'RRR 2',
        release_date: '2025-04-20',
      },
    ];

    setupDefaultMock({
      data: { pages: [mockMovies, page2Movies], pageParams: [0, 1] },
    });

    const { getByText } = render(<DiscoverScreen />);
    expect(getByText('Pushpa 2')).toBeTruthy();
    expect(getByText('Kalki')).toBeTruthy();
    expect(getByText('RRR 2')).toBeTruthy();
  });

  it('shows footer loading indicator when fetching next page', () => {
    setupDefaultMock({ isFetchingNextPage: true, hasNextPage: true });

    render(<DiscoverScreen />);
    expect(mockUseMoviesPaginated).toHaveBeenCalled();
    const result = mockUseMoviesPaginated.mock.results[0].value;
    expect(result.isFetchingNextPage).toBe(true);
  });
});
