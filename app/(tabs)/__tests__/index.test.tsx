jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@/features/movies/hooks/useMovies', () => ({
  useMovies: jest.fn(),
}));

jest.mock('@/features/ott/hooks', () => ({
  usePlatforms: jest.fn(),
  useMoviePlatformMap: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/components/home/HeroCarousel', () => {
  const { View } = require('react-native');
  return { HeroCarousel: View };
});

jest.mock('@/components/movie/MovieCard', () => {
  const { Text } = require('react-native');
  return {
    MovieCard: ({ movie }: { movie: { title: string } }) => <Text>{movie.title}</Text>,
  };
});

jest.mock('@/components/ui/SectionHeader', () => {
  const { Text } = require('react-native');
  return {
    SectionHeader: ({ title }: { title: string }) => <Text>{title}</Text>,
  };
});

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useMovies } from '@/features/movies/hooks/useMovies';
import { usePlatforms, useMoviePlatformMap } from '@/features/ott/hooks';
import HomeScreen from '../index';

const mockMovies = [
  {
    id: '1',
    title: 'Theater Movie',
    release_type: 'theatrical',
    release_date: '2025-03-01',
    poster_url: null,
    backdrop_url: null,
    rating: 4.5,
    review_count: 10,
    genres: ['Action'],
    certification: 'UA',
    runtime: 120,
    synopsis: '',
    director: 'Dir',
    trailer_url: null,
  },
  {
    id: '2',
    title: 'OTT Movie',
    release_type: 'ott',
    release_date: '2025-02-01',
    poster_url: null,
    backdrop_url: null,
    rating: 3.5,
    review_count: 5,
    genres: ['Drama'],
    certification: 'U',
    runtime: 90,
    synopsis: '',
    director: 'Dir2',
    trailer_url: null,
  },
  {
    id: '3',
    title: 'Upcoming Movie',
    release_type: 'upcoming',
    release_date: '2025-06-01',
    poster_url: null,
    backdrop_url: null,
    rating: 0,
    review_count: 0,
    genres: ['Comedy'],
    certification: null,
    runtime: null,
    synopsis: '',
    director: '',
    trailer_url: null,
  },
];

const mockPlatforms = [
  { id: 'netflix', name: 'Netflix', logo: 'N', color: '#E50914', display_order: 1 },
  { id: 'aha', name: 'Aha', logo: '🎬', color: '#FF6B00', display_order: 2 },
];

const mockUseMovies = useMovies as jest.Mock;
const mockUsePlatforms = usePlatforms as jest.Mock;
const mockUseMoviePlatformMap = useMoviePlatformMap as jest.Mock;

function setupDefaultMocks() {
  mockUseMovies.mockReturnValue({ data: mockMovies });
  mockUsePlatforms.mockReturnValue({ data: mockPlatforms });
  mockUseMoviePlatformMap.mockReturnValue({ data: {} });
}

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  it('renders the "Faniverz" header title', () => {
    render(<HomeScreen />);
    expect(screen.getByText('Faniverz')).toBeTruthy();
  });

  it('renders the Search header button', () => {
    render(<HomeScreen />);
    expect(screen.getByLabelText('Search')).toBeTruthy();
  });

  it('renders the Notifications header button', () => {
    render(<HomeScreen />);
    expect(screen.getByLabelText('Notifications')).toBeTruthy();
  });

  it('renders "In Theaters" section when theatrical movies exist', () => {
    render(<HomeScreen />);
    expect(screen.getByText('In Theaters')).toBeTruthy();
  });

  it('renders theatrical movie titles in the "In Theaters" section', () => {
    render(<HomeScreen />);
    expect(screen.getByText('Theater Movie')).toBeTruthy();
  });

  it('renders "Streaming Now" section when OTT movies exist', () => {
    render(<HomeScreen />);
    expect(screen.getByText('Streaming Now')).toBeTruthy();
  });

  it('renders OTT movie titles in the "Streaming Now" section', () => {
    render(<HomeScreen />);
    expect(screen.getByText('OTT Movie')).toBeTruthy();
  });

  it('renders "Coming Soon" section when upcoming movies exist', () => {
    render(<HomeScreen />);
    expect(screen.getByText('Coming Soon')).toBeTruthy();
  });

  it('renders upcoming movie titles in the "Coming Soon" section', () => {
    render(<HomeScreen />);
    expect(screen.getByText('Upcoming Movie')).toBeTruthy();
  });

  it('renders "Browse by Platform" section when platforms exist', () => {
    render(<HomeScreen />);
    expect(screen.getByText('Browse by Platform')).toBeTruthy();
  });

  it('renders platform squares with accessible labels', () => {
    render(<HomeScreen />);
    expect(screen.getByLabelText('Netflix')).toBeTruthy();
    expect(screen.getByLabelText('Aha')).toBeTruthy();
  });

  it('does not render "In Theaters" section when no theatrical movies', () => {
    const ottAndUpcomingOnly = mockMovies.filter((m) => m.release_type !== 'theatrical');
    mockUseMovies.mockReturnValue({ data: ottAndUpcomingOnly });
    render(<HomeScreen />);
    expect(screen.queryByText('In Theaters')).toBeNull();
  });

  it('does not render "Streaming Now" section when no OTT movies', () => {
    const theatricalAndUpcomingOnly = mockMovies.filter((m) => m.release_type !== 'ott');
    mockUseMovies.mockReturnValue({ data: theatricalAndUpcomingOnly });
    render(<HomeScreen />);
    expect(screen.queryByText('Streaming Now')).toBeNull();
  });

  it('does not render "Coming Soon" section when no upcoming movies', () => {
    const releasedOnly = mockMovies.filter((m) => m.release_type !== 'upcoming');
    mockUseMovies.mockReturnValue({ data: releasedOnly });
    render(<HomeScreen />);
    expect(screen.queryByText('Coming Soon')).toBeNull();
  });

  it('does not render "Browse by Platform" section when no platforms', () => {
    mockUsePlatforms.mockReturnValue({ data: [] });
    render(<HomeScreen />);
    expect(screen.queryByText('Browse by Platform')).toBeNull();
  });

  it('renders correctly with empty movie and platform data', () => {
    mockUseMovies.mockReturnValue({ data: [] });
    mockUsePlatforms.mockReturnValue({ data: [] });
    render(<HomeScreen />);
    expect(screen.getByText('Faniverz')).toBeTruthy();
  });
});
