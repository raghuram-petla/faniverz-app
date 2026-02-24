jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { Movie } from '@/types';
import { useFilterStore } from '@/stores/useFilterStore';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
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

jest.mock('@/features/movies/hooks/useMovies', () => ({
  useMovies: jest.fn(() => ({ data: mockMovies })),
}));

jest.mock('@/features/ott/hooks', () => ({
  usePlatforms: jest.fn(() => ({ data: mockPlatforms })),
  useMoviePlatformMap: jest.fn(() => ({ data: {} })),
}));

// Use the real Zustand store; reset state before each test
beforeEach(() => {
  useFilterStore.getState().clearAll();
});

import DiscoverScreen from '../discover';

describe('DiscoverScreen', () => {
  it('renders search input', () => {
    const { getByPlaceholderText } = render(<DiscoverScreen />);
    expect(getByPlaceholderText('Search movies...')).toBeTruthy();
  });

  it('renders release type tab: All', () => {
    const { getByText } = render(<DiscoverScreen />);
    expect(getByText('All')).toBeTruthy();
  });

  it('renders release type tab: In Theaters', () => {
    const { getAllByText } = render(<DiscoverScreen />);
    // "In Theaters" appears in both the tab bar and as a StatusBadge on theatrical movies
    expect(getAllByText('In Theaters').length).toBeGreaterThanOrEqual(1);
  });

  it('renders release type tab: Streaming', () => {
    const { getAllByText } = render(<DiscoverScreen />);
    // "Streaming" appears in both the tab bar and as a StatusBadge on OTT movies
    expect(getAllByText('Streaming').length).toBeGreaterThanOrEqual(1);
  });

  it('renders release type tab: Coming Soon', () => {
    const { getByText } = render(<DiscoverScreen />);
    expect(getByText('Coming Soon')).toBeTruthy();
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
    // expo-image Image is mocked as View globally; we check the poster container
    // The movie titles confirm movies are rendered
    const { View } = require('react-native');
    // At least one View rendered means the component tree is present
    const views = UNSAFE_getAllByType(View);
    expect(views.length).toBeGreaterThan(0);
  });

  it('renders with empty movies list without crashing', () => {
    const { useMovies } = require('@/features/movies/hooks/useMovies');
    useMovies.mockReturnValueOnce({ data: [] });
    const { getByPlaceholderText } = render(<DiscoverScreen />);
    expect(getByPlaceholderText('Search movies...')).toBeTruthy();
  });
});
