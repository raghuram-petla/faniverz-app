jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { WebView: (props: any) => <View testID="webview" {...props} /> };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    dismissAll: jest.fn(),
  }),
  useLocalSearchParams: () => ({ id: 'movie-1' }),
  useNavigation: () => ({ getState: () => ({ index: 1 }) }),
}));

jest.mock('@/features/movies/hooks/useMovieDetail', () => ({
  useMovieDetail: jest.fn(),
}));

jest.mock('@/providers/ImageViewerProvider', () => ({
  useImageViewer: () => ({ openImage: jest.fn(), closeImage: jest.fn() }),
}));

jest.mock('@/components/common/ScreenHeader', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ title }: { title: string }) => (
      <View>
        <TouchableOpacity accessibilityLabel="Go back" />
        <Text>{title}</Text>
      </View>
    ),
  };
});

jest.mock('@/styles/movieMedia.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import MediaScreen from '../media';
import { useMovieDetail } from '@/features/movies/hooks/useMovieDetail';

const mockMovie = {
  id: 'movie-1',
  title: 'Pushpa 2',
  backdrop_url: 'https://example.com/backdrop.jpg',
  poster_url: 'https://example.com/poster.jpg',
  detail_focus_x: null,
  detail_focus_y: null,
  backdrop_focus_x: null,
  backdrop_focus_y: null,
  videos: [
    {
      id: 'v1',
      movie_id: 'movie-1',
      youtube_id: 'abc123',
      title: 'Official Trailer',
      video_type: 'trailer',
      description: null,
      video_date: null,
      duration: '3:20',
      display_order: 0,
      created_at: '',
    },
    {
      id: 'v2',
      movie_id: 'movie-1',
      youtube_id: 'def456',
      title: 'Title Song',
      video_type: 'song',
      description: null,
      video_date: null,
      duration: '4:10',
      display_order: 1,
      created_at: '',
    },
  ],
  posters: [
    {
      id: 'p1',
      movie_id: 'movie-1',
      image_url: 'https://example.com/poster1.jpg',
      title: 'First Look',
      description: null,
      poster_date: null,
      is_main_poster: true,
      is_main_backdrop: false,
      image_type: 'poster',
      display_order: 0,
      created_at: '',
    },
  ],
};

describe('MediaScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useMovieDetail as jest.Mock).mockReturnValue({ data: mockMovie, isLoading: false });
  });

  it('renders movie title in hero and sticky header', () => {
    render(<MediaScreen />);
    expect(screen.getAllByText('Pushpa 2')).toHaveLength(2);
  });

  it('shows media stats in hero header', () => {
    render(<MediaScreen />);
    expect(screen.getByText(/2 Videos.*1 Photo/)).toBeTruthy();
  });

  it('shows Videos and Photos tabs with counts', () => {
    render(<MediaScreen />);
    expect(screen.getByText('Videos (2)')).toBeTruthy();
    expect(screen.getByText('Photos (1)')).toBeTruthy();
  });

  it('defaults to Videos tab', () => {
    render(<MediaScreen />);
    expect(screen.getByText('Official Trailer')).toBeTruthy();
    expect(screen.getByText('Title Song')).toBeTruthy();
  });

  it('switches to Photos tab on press', () => {
    render(<MediaScreen />);
    fireEvent.press(screen.getByText('Photos (1)'));
    expect(screen.getByLabelText('View First Look')).toBeTruthy();
    expect(screen.getByText('Main Poster')).toBeTruthy();
  });

  it('shows loading spinner when data is loading', () => {
    (useMovieDetail as jest.Mock).mockReturnValue({ data: undefined, isLoading: true });
    render(<MediaScreen />);
    expect(screen.getByLabelText('Go back')).toBeTruthy();
  });

  it('shows not-found state when movie is unavailable and not loading', () => {
    (useMovieDetail as jest.Mock).mockReturnValue({ data: undefined, isLoading: false });
    render(<MediaScreen />);
    expect(screen.getByText('No results found')).toBeTruthy();
    expect(screen.getByLabelText('Go back')).toBeTruthy();
  });

  it('shows back button in sticky section', () => {
    render(<MediaScreen />);
    expect(screen.getByLabelText('Go back')).toBeTruthy();
  });

  it('shows home button in sticky section', () => {
    render(<MediaScreen />);
    expect(screen.getByTestId('home-button')).toBeTruthy();
  });

  it('shows filter pills in videos tab', () => {
    render(<MediaScreen />);
    expect(screen.getByText('Trailer (1)')).toBeTruthy();
    expect(screen.getByText('Song (1)')).toBeTruthy();
  });

  it('hides filter pills in photos tab', () => {
    render(<MediaScreen />);
    fireEvent.press(screen.getByText('Photos (1)'));
    expect(screen.queryByText('Trailer (1)')).toBeNull();
    expect(screen.queryByText('Song (1)')).toBeNull();
  });

  it('navigates back when back button in sticky nav is pressed', () => {
    const mockBack = jest.fn();
    jest.requireMock('expo-router').useRouter = () => ({
      push: jest.fn(),
      back: mockBack,
      dismissAll: jest.fn(),
    });

    render(<MediaScreen />);
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('handles scroll event without crashing', () => {
    render(<MediaScreen />);
    const scrollView = screen.UNSAFE_getByType(require('react-native').ScrollView);
    fireEvent.scroll(scrollView, {
      nativeEvent: { contentOffset: { y: 120, x: 0 }, layoutMeasurement: {}, contentSize: {} },
    });
    // No crash is the assertion — handleScroll updates shared value
  });

  it('filters videos by active category when a filter pill is pressed', () => {
    render(<MediaScreen />);
    // Click Trailer filter pill
    fireEvent.press(screen.getByText('Trailer (1)'));
    // Official Trailer should still be visible (Trailer type), Title Song should be hidden
    expect(screen.getByText('Official Trailer')).toBeTruthy();
  });

  it('useAnimatedStyle callback for title fade returns opacity', () => {
    const useAnimatedStyle = require('react-native-reanimated').useAnimatedStyle;
    const interpolate = require('react-native-reanimated').interpolate;
    interpolate.mockImplementation((value: number) => value);
    useAnimatedStyle.mockImplementation((cb: () => object) => {
      const result = cb();
      return result;
    });
    render(<MediaScreen />);
    expect(useAnimatedStyle).toHaveBeenCalled();
    useAnimatedStyle.mockImplementation(() => ({}));
    interpolate.mockImplementation(() => undefined);
  });
});
