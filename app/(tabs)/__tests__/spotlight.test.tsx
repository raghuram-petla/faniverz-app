jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: { white: '#fff', red600: '#dc2626', gray500: '#6b7280' },
  }),
}));

jest.mock('@/styles/tabs/spotlight.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

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

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));

jest.mock('@/components/home/HeroCarousel', () => {
  const { View } = require('react-native');
  return {
    HeroCarousel: (props: any) => <View testID="hero-carousel" {...props} />,
  };
});

jest.mock('@/components/movie/MovieCard', () => {
  const { Text } = require('react-native');
  return {
    MovieCard: ({ movie }: { movie: { title: string } }) => <Text>{movie.title}</Text>,
  };
});

jest.mock('@/components/ui/SectionHeader', () => {
  const { Text, TouchableOpacity } = require('react-native');
  return {
    SectionHeader: ({
      title,
      actionLabel,
      onAction,
    }: {
      title: string;
      actionLabel?: string;
      onAction?: () => void;
    }) => (
      <>
        <Text>{title}</Text>
        {actionLabel && onAction && (
          <TouchableOpacity onPress={onAction}>
            <Text>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </>
    ),
  };
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import SpotlightScreen from '../spotlight';
import { useMovies } from '@/features/movies/hooks/useMovies';
import { usePlatforms, useMoviePlatformMap } from '@/features/ott/hooks';

const mockUseMovies = useMovies as jest.Mock;
const mockUsePlatforms = usePlatforms as jest.Mock;
const mockUseMoviePlatformMap = useMoviePlatformMap as jest.Mock;

const mockMovies = [
  {
    id: '1',
    title: 'Theater Movie',
    in_theaters: true,
    release_date: '2025-03-01',
    is_featured: true,
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
    in_theaters: false,
    release_date: '2025-02-01',
    is_featured: false,
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
    in_theaters: false,
    release_date: '2099-06-01',
    is_featured: false,
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
  { id: 'aha', name: 'Aha', logo: 'A', color: '#FF6B00', display_order: 2 },
];

function setupDefaultMocks() {
  mockUseMovies.mockReturnValue({ data: mockMovies });
  mockUsePlatforms.mockReturnValue({ data: mockPlatforms });
  mockUseMoviePlatformMap.mockReturnValue({
    data: {
      '2': [{ id: 'netflix', name: 'Netflix', logo: 'N', color: '#E50914', display_order: 1 }],
    },
  });
}

describe('SpotlightScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  it('renders "Spotlight" title', () => {
    render(<SpotlightScreen />);
    expect(screen.getByText('Spotlight')).toBeTruthy();
  });

  it('renders hero carousel when featured movies exist', () => {
    render(<SpotlightScreen />);
    expect(screen.getByTestId('hero-carousel')).toBeTruthy();
  });

  it('does not render hero carousel when no featured movies exist', () => {
    mockUseMovies.mockReturnValue({ data: [] });
    render(<SpotlightScreen />);
    expect(screen.queryByTestId('hero-carousel')).toBeNull();
  });

  it('renders "In Theaters" section when theatrical movies exist', () => {
    render(<SpotlightScreen />);
    expect(screen.getByText('In Theaters')).toBeTruthy();
  });

  it('renders theatrical movie titles in the "In Theaters" section', () => {
    render(<SpotlightScreen />);
    expect(screen.getByText('Theater Movie')).toBeTruthy();
  });

  it('renders "Streaming Now" section when streaming movies exist', () => {
    render(<SpotlightScreen />);
    expect(screen.getByText('Streaming Now')).toBeTruthy();
  });

  it('renders streaming movie titles in the "Streaming Now" section', () => {
    render(<SpotlightScreen />);
    expect(screen.getByText('OTT Movie')).toBeTruthy();
  });

  it('renders "Coming Soon" section when upcoming movies exist', () => {
    render(<SpotlightScreen />);
    expect(screen.getByText('Coming Soon')).toBeTruthy();
  });

  it('renders upcoming movie titles in the "Coming Soon" section', () => {
    render(<SpotlightScreen />);
    expect(screen.getByText('Upcoming Movie')).toBeTruthy();
  });

  it('renders "Browse by Platform" section when platforms exist', () => {
    render(<SpotlightScreen />);
    expect(screen.getByText('Browse by Platform')).toBeTruthy();
  });

  it('renders platform squares with accessible labels', () => {
    render(<SpotlightScreen />);
    expect(screen.getByLabelText('Netflix')).toBeTruthy();
    expect(screen.getByLabelText('Aha')).toBeTruthy();
  });

  it('does not render "In Theaters" section when no theatrical movies', () => {
    const nonTheatrical = mockMovies.filter((m) => !m.in_theaters);
    mockUseMovies.mockReturnValue({ data: nonTheatrical });
    render(<SpotlightScreen />);
    expect(screen.queryByText('In Theaters')).toBeNull();
  });

  it('does not render "Streaming Now" section when no streaming movies', () => {
    const noStreaming = mockMovies.filter((m) => m.in_theaters || m.release_date === '2099-06-01');
    mockUseMovies.mockReturnValue({ data: noStreaming });
    mockUseMoviePlatformMap.mockReturnValue({ data: {} });
    render(<SpotlightScreen />);
    expect(screen.queryByText('Streaming Now')).toBeNull();
  });

  it('does not render "Coming Soon" section when no upcoming movies', () => {
    const nonUpcoming = mockMovies.filter((m) => m.release_date !== '2099-06-01');
    mockUseMovies.mockReturnValue({ data: nonUpcoming });
    render(<SpotlightScreen />);
    expect(screen.queryByText('Coming Soon')).toBeNull();
  });

  it('does not render "Browse by Platform" section when no platforms', () => {
    mockUsePlatforms.mockReturnValue({ data: [] });
    render(<SpotlightScreen />);
    expect(screen.queryByText('Browse by Platform')).toBeNull();
  });

  it('renders correctly with empty movie and platform data', () => {
    mockUseMovies.mockReturnValue({ data: [] });
    mockUsePlatforms.mockReturnValue({ data: [] });
    render(<SpotlightScreen />);
    expect(screen.getByText('Spotlight')).toBeTruthy();
  });

  it('navigates to discover with platform filter when a platform square is pressed', () => {
    render(<SpotlightScreen />);
    const netflixButton = screen.getByLabelText('Netflix');
    fireEvent.press(netflixButton);
    expect(mockPush).toHaveBeenCalledWith('/discover?platform=netflix');
  });

  it('renders "To Theaters" subsection when upcoming movies have no platforms', () => {
    mockUseMoviePlatformMap.mockReturnValue({ data: {} });
    render(<SpotlightScreen />);
    expect(screen.getByText('To Theaters')).toBeTruthy();
  });

  it('renders "To Streaming" subsection when upcoming movies have platforms', () => {
    mockUseMoviePlatformMap.mockReturnValue({
      data: {
        '3': [{ id: 'netflix', name: 'Netflix', logo: 'N', color: '#E50914', display_order: 1 }],
      },
    });
    render(<SpotlightScreen />);
    expect(screen.getByText('To Streaming')).toBeTruthy();
  });

  it('navigates to discover with theatrical filter when In Theaters "See All" is pressed', () => {
    render(<SpotlightScreen />);
    const seeAllButtons = screen.getAllByText('See All');
    fireEvent.press(seeAllButtons[0]);
    expect(mockPush).toHaveBeenCalledWith('/discover?filter=in_theaters');
  });

  it('navigates to discover with streaming filter when Streaming Now "See All" is pressed', () => {
    render(<SpotlightScreen />);
    const seeAllButtons = screen.getAllByText('See All');
    fireEvent.press(seeAllButtons[1]);
    expect(mockPush).toHaveBeenCalledWith('/discover?filter=streaming');
  });

  it('navigates to discover with upcoming filter when Coming Soon "See All" is pressed', () => {
    render(<SpotlightScreen />);
    const seeAllButtons = screen.getAllByText('See All');
    fireEvent.press(seeAllButtons[2]);
    expect(mockPush).toHaveBeenCalledWith('/discover?filter=upcoming');
  });

  it('renders both To Theaters and To Streaming when both types of upcoming exist', () => {
    const upcomingOTTMovie = {
      id: '4',
      title: 'Upcoming OTT Film',
      in_theaters: false,
      release_date: '2099-07-01',
      is_featured: false,
      poster_url: null,
      backdrop_url: null,
      rating: 0,
      review_count: 0,
      genres: ['Drama'],
      certification: null,
      runtime: null,
      synopsis: '',
      director: '',
      trailer_url: null,
    };
    mockUseMovies.mockReturnValue({ data: [...mockMovies, upcomingOTTMovie] });
    mockUseMoviePlatformMap.mockReturnValue({
      data: {
        '4': [{ id: 'netflix', name: 'Netflix', logo: 'N', color: '#E50914', display_order: 1 }],
      },
    });

    render(<SpotlightScreen />);
    expect(screen.getByText('To Theaters')).toBeTruthy();
    expect(screen.getByText('To Streaming')).toBeTruthy();
    expect(screen.getByText('Upcoming Movie')).toBeTruthy();
    expect(screen.getByText('Upcoming OTT Film')).toBeTruthy();
  });
});
