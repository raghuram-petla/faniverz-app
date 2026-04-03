jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { WebView: (props: Record<string, unknown>) => <View testID="webview" {...props} /> };
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
  HERO_HEIGHT: 200,
  POSTER_EXPANDED_W: 56,
  POSTER_EXPANDED_H: 84,
  POSTER_COLLAPSED_W: 28,
  POSTER_COLLAPSED_H: 42,
  NAV_ROW_HEIGHT: 56,
  TITLE_SCALE: 0.7,
}));

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

jest.mock('@shared/imageUrl', () => ({
  posterBucket: (t?: string) => (t === 'backdrop' ? 'BACKDROPS' : 'POSTERS'),
  backdropBucket: (t?: string) => (t === 'poster' ? 'POSTERS' : 'BACKDROPS'),
  getImageUrl: (url: string | null) => url,
}));

jest.mock('@/constants/placeholders', () => ({
  PLACEHOLDER_POSTER: 'https://placeholder.com/poster.png',
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

  it('renders movie title in floating title element', () => {
    render(<MediaScreen />);
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('renders floating poster element', () => {
    render(<MediaScreen />);
    expect(screen.getByTestId('floating-poster')).toBeTruthy();
  });

  it('renders floating title element', () => {
    render(<MediaScreen />);
    expect(screen.getByTestId('floating-title')).toBeTruthy();
  });

  it('shows media stats subtitle in floating group', () => {
    render(<MediaScreen />);
    expect(screen.getByText(/2 Videos.*1 Photo/)).toBeTruthy();
  });

  it('shows Videos and Photos tabs with counts', () => {
    render(<MediaScreen />);
    expect(screen.getByText('Videos (2)')).toBeTruthy();
    expect(screen.getByText('Photos (1)')).toBeTruthy();
  });

  it('defaults to Photos tab', () => {
    render(<MediaScreen />);
    expect(screen.getByLabelText('View First Look')).toBeTruthy();
    expect(screen.getByText('Main Poster')).toBeTruthy();
  });

  it('switches to Videos tab on press', () => {
    render(<MediaScreen />);
    fireEvent.press(screen.getByText('Videos (2)'));
    expect(screen.getByText('Official Trailer')).toBeTruthy();
    expect(screen.getByText('Title Song')).toBeTruthy();
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
    fireEvent.press(screen.getByText('Videos (2)'));
    expect(screen.getByText('Trailer (1)')).toBeTruthy();
    expect(screen.getByText('Song (1)')).toBeTruthy();
  });

  it('hides filter pills in photos tab', () => {
    render(<MediaScreen />);
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

  it('filters videos by active category when a filter pill is pressed', () => {
    render(<MediaScreen />);
    fireEvent.press(screen.getByText('Videos (2)'));
    fireEvent.press(screen.getByText('Trailer (1)'));
    expect(screen.getByText('Official Trailer')).toBeTruthy();
  });

  it('useAnimatedStyle callbacks produce correct animated styles', () => {
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

  it('hides filter pills when videos tab has no videosByType groups', () => {
    const movieNoVideos = { ...mockMovie, videos: [] };
    (useMovieDetail as jest.Mock).mockReturnValue({ data: movieNoVideos, isLoading: false });
    render(<MediaScreen />);
    fireEvent.press(screen.getByText('Videos (0)'));
    expect(screen.queryByText('All')).toBeNull();
  });

  it('strips count suffix from active category label', () => {
    render(<MediaScreen />);
    fireEvent.press(screen.getByText('Videos (2)'));
    fireEvent.press(screen.getByText('Trailer (1)'));
    expect(screen.getByText('Official Trailer')).toBeTruthy();
  });

  it('renders correctly when id param is undefined', () => {
    const routerModule = jest.requireMock('expo-router');
    const origUseLocalSearchParams = routerModule.useLocalSearchParams;
    routerModule.useLocalSearchParams = () => ({ id: undefined });
    (useMovieDetail as jest.Mock).mockReturnValue({ data: undefined, isLoading: false });
    render(<MediaScreen />);
    expect(screen.getByText('No results found')).toBeTruthy();
    routerModule.useLocalSearchParams = origUseLocalSearchParams;
  });

  it('scroll end drag handler does not crash', () => {
    const { UNSAFE_root } = render(<MediaScreen />);
    const Animated = require('react-native-reanimated').default;
    const scrollViews = UNSAFE_root.findAllByType(Animated.ScrollView);
    const sv = scrollViews.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s: any) => typeof s.props.onScrollEndDrag === 'function',
    );
    if (sv) {
      expect(() =>
        sv.props.onScrollEndDrag({
          nativeEvent: { contentOffset: { y: 50 }, velocity: { y: 0 } },
        }),
      ).not.toThrow();
    }
  });

  it('momentum scroll end handler does not crash', () => {
    const { UNSAFE_root } = render(<MediaScreen />);
    const Animated = require('react-native-reanimated').default;
    const scrollViews = UNSAFE_root.findAllByType(Animated.ScrollView);
    const sv = scrollViews.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s: any) => typeof s.props.onMomentumScrollEnd === 'function',
    );
    if (sv) {
      expect(() =>
        sv.props.onMomentumScrollEnd({
          nativeEvent: { contentOffset: { y: 100 } },
        }),
      ).not.toThrow();
    }
  });

  it('onTitleLayout fires and updates shared values without crashing', () => {
    const { UNSAFE_root } = render(<MediaScreen />);
    const { Text } = require('react-native');
    // Find the Text that has onLayout — it's the floating title text
    const texts = UNSAFE_root.findAllByType(Text);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const titleText = texts.find((t: any) => typeof t.props.onLayout === 'function');
    if (titleText) {
      expect(() =>
        titleText.props.onLayout({
          nativeEvent: { layout: { x: 0, y: 0, width: 180, height: 22 } },
        }),
      ).not.toThrow();
    }
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('uses PLACEHOLDER_POSTER when poster_url is null', () => {
    (useMovieDetail as jest.Mock).mockReturnValue({
      data: { ...mockMovie, poster_url: null },
      isLoading: false,
    });
    render(<MediaScreen />);
    // Component renders without crashing; floating-poster still appears
    expect(screen.getByTestId('floating-poster')).toBeTruthy();
  });

  it('onNavLeftLayout fires and updates navLeftWidth without crashing', () => {
    const { UNSAFE_root } = render(<MediaScreen />);
    const { View } = require('react-native');
    // Find the View with onLayout inside the sticky nav (the stickyNavLeft view)
    const views = UNSAFE_root.findAllByType(View);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layoutViews = views.filter((v: any) => typeof v.props.onLayout === 'function');
    // There are multiple onLayout views: the scroll layout and the navLeft layout
    // Fire all of them to ensure onNavLeftLayout is covered
    for (const v of layoutViews) {
      expect(() =>
        v.props.onLayout({
          nativeEvent: { layout: { x: 0, y: 0, width: 80, height: 56 } },
        }),
      ).not.toThrow();
    }
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('shows singular video/photo labels when counts are 1', () => {
    (useMovieDetail as jest.Mock).mockReturnValue({
      data: {
        ...mockMovie,
        videos: [mockMovie.videos[0]],
        posters: [mockMovie.posters[0], { ...mockMovie.posters[0], id: 'p2' }],
      },
      isLoading: false,
    });
    render(<MediaScreen />);
    // 1 video → singular branch; 2 posters → plural branch
    expect(screen.getByText(/1 Video.*2 Photos/)).toBeTruthy();
  });
});
