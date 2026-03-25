const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: new Proxy({}, { get: () => '#000' }),
    mode: 'dark',
    setMode: jest.fn(),
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
}));

jest.mock('@/components/ui/StatusBadge', () => {
  const { Text } = require('react-native');
  return { StatusBadge: ({ type }: { type: string }) => <Text>{type}</Text> };
});

jest.mock('@/components/ui/PlatformBadge', () => {
  const { Text } = require('react-native');
  return {
    PlatformBadge: ({ platform }: { platform: { name: string } }) => <Text>{platform.name}</Text>,
  };
});

jest.mock('@shared/movieStatus', () => ({
  deriveMovieStatus: jest.fn(() => 'upcoming'),
}));

jest.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string) => url,
}));

const mockActionPress = jest.fn();
const mockUseMovieAction = jest.fn(() => ({
  actionType: 'follow' as string,
  isActive: false,
  onPress: mockActionPress,
}));
jest.mock('@/hooks/useMovieAction', () => ({
  useMovieAction: (...args: unknown[]) => mockUseMovieAction.apply(null, args),
}));

jest.mock('@/constants/placeholders', () => ({
  PLACEHOLDER_POSTER: 'https://placeholder.com/poster.png',
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { DiscoverGridItem } from '../DiscoverGridItem';
import type { Movie, OTTPlatform } from '@/types';

const mockStyles = new Proxy({}, { get: () => ({}) });

const baseMovie: Movie = {
  id: 'movie-1',
  tmdb_id: null,
  title: 'Test Movie',
  poster_url: 'https://example.com/poster.jpg',
  backdrop_url: null,
  release_date: '2025-01-01',
  runtime: 120,
  genres: ['Action'],
  certification: 'UA',
  synopsis: 'A test movie',
  director: 'Test Director',
  in_theaters: false,
  premiere_date: null,
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
  rating: 7.5,
  review_count: 0,
  is_featured: false,
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
  created_at: '',
  updated_at: '',
};

const mockPlatforms: OTTPlatform[] = [
  { id: 'aha', name: 'Aha', logo: 'aha', logo_url: null, color: '#ff0000', display_order: 1 },
  {
    id: 'netflix',
    name: 'Netflix',
    logo: 'netflix',
    logo_url: null,
    color: '#e50914',
    display_order: 2,
  },
  { id: 'prime', name: 'Prime', logo: 'prime', logo_url: null, color: '#00a8e1', display_order: 3 },
];

describe('DiscoverGridItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMovieAction.mockReturnValue({
      actionType: 'follow' as const,
      isActive: false,
      onPress: mockActionPress,
    });
  });

  it('renders without crashing', () => {
    const { toJSON } = render(
      <DiscoverGridItem item={baseMovie} platforms={[]} styles={mockStyles} />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders movie title', () => {
    render(<DiscoverGridItem item={baseMovie} platforms={[]} styles={mockStyles} />);
    expect(screen.getByText('Test Movie')).toBeTruthy();
  });

  it('navigates to movie detail on press', () => {
    render(<DiscoverGridItem item={baseMovie} platforms={[]} styles={mockStyles} />);
    fireEvent.press(screen.getByText('Test Movie'));
    expect(mockPush).toHaveBeenCalledWith('/movie/movie-1');
  });

  it('renders rating when rating > 0', () => {
    render(<DiscoverGridItem item={baseMovie} platforms={[]} styles={mockStyles} />);
    expect(screen.getByText('7.5')).toBeTruthy();
  });

  it('does not render rating when rating is 0', () => {
    const movie = { ...baseMovie, rating: 0 };
    render(<DiscoverGridItem item={movie} platforms={[]} styles={mockStyles} />);
    expect(screen.queryByText('0')).toBeNull();
  });

  it('renders platform badges (max 2)', () => {
    render(<DiscoverGridItem item={baseMovie} platforms={mockPlatforms} styles={mockStyles} />);
    expect(screen.getByText('Aha')).toBeTruthy();
    expect(screen.getByText('Netflix')).toBeTruthy();
    expect(screen.queryByText('Prime')).toBeNull();
  });

  it('does not render platform section when no platforms', () => {
    const { toJSON } = render(
      <DiscoverGridItem item={baseMovie} platforms={[]} styles={mockStyles} />,
    );
    const tree = JSON.stringify(toJSON());
    expect(tree).not.toContain('Aha');
  });

  it('renders action button with correct accessibility label', () => {
    render(<DiscoverGridItem item={baseMovie} platforms={[]} styles={mockStyles} />);
    expect(screen.getByLabelText('Follow Test Movie')).toBeTruthy();
  });

  it('renders status badge', () => {
    render(<DiscoverGridItem item={baseMovie} platforms={[]} styles={mockStyles} />);
    expect(screen.getByText('upcoming')).toBeTruthy();
  });

  it('renders with single platform', () => {
    render(
      <DiscoverGridItem item={baseMovie} platforms={[mockPlatforms[0]]} styles={mockStyles} />,
    );
    expect(screen.getByText('Aha')).toBeTruthy();
  });

  it('renders watchlist action when actionType is watchlist', () => {
    mockUseMovieAction.mockReturnValue({
      actionType: 'watchlist' as const,
      isActive: false,
      onPress: jest.fn(),
    });

    render(<DiscoverGridItem item={baseMovie} platforms={[]} styles={mockStyles} />);
    expect(screen.getByLabelText('Save Test Movie')).toBeTruthy();
  });

  it('renders active watchlist state', () => {
    mockUseMovieAction.mockReturnValue({
      actionType: 'watchlist' as const,
      isActive: true,
      onPress: jest.fn(),
    });

    render(<DiscoverGridItem item={baseMovie} platforms={[]} styles={mockStyles} />);
    expect(screen.getByLabelText('Test Movie saved, tap to remove')).toBeTruthy();
  });

  it('calls onPress from useMovieAction when quick action is pressed', () => {
    const mockPress = jest.fn();
    mockUseMovieAction.mockReturnValue({
      actionType: 'follow' as const,
      isActive: false,
      onPress: mockPress,
    });

    render(<DiscoverGridItem item={baseMovie} platforms={[]} styles={mockStyles} />);
    fireEvent.press(screen.getByLabelText('Follow Test Movie'));
    expect(mockPress).toHaveBeenCalledTimes(1);
  });

  it('renders without crashing when movie has null poster_url', () => {
    const movieNoPoster = { ...baseMovie, poster_url: null };
    const { toJSON } = render(
      <DiscoverGridItem item={movieNoPoster} platforms={[]} styles={mockStyles} />,
    );
    // Component should not crash even when poster_url is null — PLACEHOLDER_POSTER used
    expect(toJSON()).toBeTruthy();
  });

  it('passes correct platform count to deriveMovieStatus', () => {
    const { deriveMovieStatus } = require('@shared/movieStatus');
    render(<DiscoverGridItem item={baseMovie} platforms={mockPlatforms} styles={mockStyles} />);
    // deriveMovieStatus is called with 3 platforms (mockPlatforms.length)
    expect(deriveMovieStatus).toHaveBeenCalledWith(baseMovie, 3);
  });

  it('passes correct platform count to useMovieAction', () => {
    render(<DiscoverGridItem item={baseMovie} platforms={mockPlatforms} styles={mockStyles} />);
    expect(mockUseMovieAction).toHaveBeenCalledWith(baseMovie, 3);
  });
});
