jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { WebView: (props: any) => <View testID="webview" {...props} /> };
});

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'common.shareVideo': 'Share video',
      };
      return map[key] ?? key;
    },
    i18n: { language: 'en' },
  }),
}));

jest.mock('@/utils/youtubeNavigation', () => ({
  buildYouTubeEmbedHtml: jest.fn(() => '<html>embed</html>'),
  shareYouTubeVideo: jest.fn(),
  handleYouTubeNavigation: jest.fn(() => true),
  handleYouTubeOpenWindow: jest.fn(),
}));

jest.mock('@/constants/webview', () => ({
  WEBVIEW_BASE_URL: 'https://localhost',
}));

jest.mock('@/constants/placeholders', () => ({
  PLACEHOLDER_POSTER: 'https://placeholder.com/poster.png',
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { MediaVideoCard } from '../MediaVideoCard';
import type { MovieVideo } from '@/types';

const makeVideo = (overrides: Partial<MovieVideo> = {}): MovieVideo => ({
  id: 'v1',
  movie_id: 'm1',
  youtube_id: 'abc123',
  title: 'Official Trailer',
  description: null,
  video_type: 'trailer',
  video_date: null,
  display_order: 0,
  created_at: '',
  ...overrides,
});

const mockTheme = new Proxy({}, { get: () => '#000' }) as any;

describe('MediaVideoCard', () => {
  const onPlay = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders without crashing', () => {
    const { toJSON } = render(
      <MediaVideoCard video={makeVideo()} isPlaying={false} onPlay={onPlay} theme={mockTheme} />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders video title in collapsed state', () => {
    render(
      <MediaVideoCard video={makeVideo()} isPlaying={false} onPlay={onPlay} theme={mockTheme} />,
    );
    expect(screen.getByText('Official Trailer')).toBeTruthy();
  });

  it('calls onPlay with video id when pressed', () => {
    render(
      <MediaVideoCard
        video={makeVideo({ id: 'v42' })}
        isPlaying={false}
        onPlay={onPlay}
        theme={mockTheme}
      />,
    );
    fireEvent.press(screen.getByLabelText('Play Official Trailer'));
    expect(onPlay).toHaveBeenCalledWith('v42');
  });

  it('renders WebView when playing', () => {
    render(
      <MediaVideoCard video={makeVideo()} isPlaying={true} onPlay={onPlay} theme={mockTheme} />,
    );
    expect(screen.getByTestId('webview')).toBeTruthy();
  });

  it('shows share button when playing', () => {
    render(
      <MediaVideoCard video={makeVideo()} isPlaying={true} onPlay={onPlay} theme={mockTheme} />,
    );
    expect(screen.getByLabelText('Share video')).toBeTruthy();
  });

  it('still shows video title when playing', () => {
    render(
      <MediaVideoCard video={makeVideo()} isPlaying={true} onPlay={onPlay} theme={mockTheme} />,
    );
    expect(screen.getByText('Official Trailer')).toBeTruthy();
  });

  it('has correct accessibility label for play', () => {
    render(
      <MediaVideoCard
        video={makeVideo({ title: 'Title Song' })}
        isPlaying={false}
        onPlay={onPlay}
        theme={mockTheme}
      />,
    );
    expect(screen.getByLabelText('Play Title Song')).toBeTruthy();
  });

  it('renders with null youtube_id using placeholder', () => {
    const { toJSON } = render(
      <MediaVideoCard
        video={makeVideo({ youtube_id: null as any })}
        isPlaying={false}
        onPlay={onPlay}
        theme={mockTheme}
      />,
    );
    expect(toJSON()).toBeTruthy();
  });
});
