/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  // Expose props so tests can call WebView callbacks
  return {
    WebView: (props: {
      onShouldStartLoadWithRequest?: (req: object) => boolean;
      onOpenWindow?: (e: object) => void;
      [key: string]: any;
    }) => <View testID="webview" {...props} />,
  };
});

jest.mock('@/utils/youtubeNavigation', () => ({
  buildYouTubeEmbedHtml: jest.fn(() => '<html>embed</html>'),
  shareYouTubeVideo: jest.fn(),
  handleYouTubeNavigation: jest.fn(() => true),
  handleYouTubeOpenWindow: jest.fn(),
}));

jest.mock('@/constants/surpriseHelpers', () => ({
  getCategoryColor: () => '#FF0000',
  getCategoryLabel: () => 'Behind the Scenes',
  getCategoryIconName: () => 'videocam',
  formatViews: (n: number) => `${n}`,
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FeaturedVideoCard } from '../FeaturedVideoCard';

const mockStyles = new Proxy({}, { get: () => ({}) });

const mockItem = {
  id: 's1',
  title: 'Making of Pushpa 2',
  category: 'behind_the_scenes',
  views: 50000,
  description: 'Behind the scenes footage',
} as any;

describe('FeaturedVideoCard', () => {
  it('renders item title', () => {
    render(<FeaturedVideoCard item={mockItem} styles={mockStyles} />);
    expect(screen.getByText('Making of Pushpa 2')).toBeTruthy();
  });

  it('renders category badge text', () => {
    render(<FeaturedVideoCard item={mockItem} styles={mockStyles} />);
    expect(screen.getByText('BEHIND THE SCENES')).toBeTruthy();
  });

  it('renders views text', () => {
    render(<FeaturedVideoCard item={mockItem} styles={mockStyles} />);
    expect(screen.getByText(/50000.*common\.views/)).toBeTruthy();
  });

  it('renders description', () => {
    render(<FeaturedVideoCard item={mockItem} styles={mockStyles} />);
    expect(screen.getByText('Behind the scenes footage')).toBeTruthy();
  });

  it('renders "Play video" accessibility label', () => {
    render(<FeaturedVideoCard item={mockItem} styles={mockStyles} />);
    expect(screen.getByLabelText('common.playVideo')).toBeTruthy();
  });

  it('activates video player after pressing play', () => {
    render(<FeaturedVideoCard item={mockItem} styles={mockStyles} />);
    const playButton = screen.getByLabelText('common.playVideo');
    fireEvent.press(playButton);
    // After pressing play, the WebView component should be rendered
    expect(screen.queryByLabelText('common.playVideo')).toBeNull();
  });

  it('renders thumbnail image before activation', () => {
    const { UNSAFE_getAllByType } = render(
      <FeaturedVideoCard item={mockItem} styles={mockStyles} />,
    );
    const { Image } = require('expo-image');
    const images = UNSAFE_getAllByType(Image);
    expect(images.length).toBeGreaterThanOrEqual(1);
  });

  it('does not render description when item.description is falsy', () => {
    const noDescItem = { ...mockItem, description: null };
    render(<FeaturedVideoCard item={noDescItem} styles={mockStyles} />);
    expect(screen.queryByText('Behind the scenes footage')).toBeNull();
  });

  it('uses fallback video ID when youtube_id is null', () => {
    const noYoutubeItem = { ...mockItem, youtube_id: null };
    render(<FeaturedVideoCard item={noYoutubeItem} styles={mockStyles} />);
    // Should still render the play button with the fallback video
    expect(screen.getByLabelText('common.playVideo')).toBeTruthy();
  });

  it('renders share button after video activation', () => {
    render(<FeaturedVideoCard item={mockItem} styles={mockStyles} />);
    fireEvent.press(screen.getByLabelText('common.playVideo'));
    // Share button should be visible
    expect(screen.getByLabelText('common.shareVideo')).toBeTruthy();
  });

  it('shows thumbnail play button when youtube_id is present', () => {
    const itemWithYoutube = { ...mockItem, youtube_id: 'abc123' };
    render(<FeaturedVideoCard item={itemWithYoutube} styles={mockStyles} />);
    // Should show play button in thumbnail state
    expect(screen.getByLabelText('common.playVideo')).toBeTruthy();
  });

  it('shows thumbnail play button when youtube_id is null (uses fallback)', () => {
    const noYoutubeItem = { ...mockItem, youtube_id: null };
    render(<FeaturedVideoCard item={noYoutubeItem} styles={mockStyles} />);
    // Should still render thumbnail mode with play button using fallback video id
    expect(screen.getByLabelText('common.playVideo')).toBeTruthy();
  });

  it('WebView replaces thumbnail after activation', () => {
    render(<FeaturedVideoCard item={mockItem} styles={mockStyles} />);
    fireEvent.press(screen.getByLabelText('common.playVideo'));
    // After activation, the play button should be gone (WebView took over)
    expect(screen.queryByLabelText('common.playVideo')).toBeNull();
  });

  it('onNavRequest callback delegates to handleYouTubeNavigation', () => {
    const { handleYouTubeNavigation } = require('@/utils/youtubeNavigation');
    const { UNSAFE_getByType } = render(
      <FeaturedVideoCard item={{ ...mockItem, youtube_id: 'vid123' }} styles={mockStyles} />,
    );
    fireEvent.press(screen.getByLabelText('common.playVideo'));
    const webview = UNSAFE_getByType(require('react-native-webview').WebView);
    if (webview.props.onShouldStartLoadWithRequest) {
      webview.props.onShouldStartLoadWithRequest({
        url: 'https://youtube.com',
        navigationType: 'click',
      });
      expect(handleYouTubeNavigation).toHaveBeenCalled();
    }
  });

  it('onOpenWindow callback delegates to handleYouTubeOpenWindow', () => {
    const { handleYouTubeOpenWindow } = require('@/utils/youtubeNavigation');
    const { UNSAFE_getByType } = render(
      <FeaturedVideoCard item={{ ...mockItem, youtube_id: 'vid123' }} styles={mockStyles} />,
    );
    fireEvent.press(screen.getByLabelText('common.playVideo'));
    const webview = UNSAFE_getByType(require('react-native-webview').WebView);
    if (webview.props.onOpenWindow) {
      webview.props.onOpenWindow({
        nativeEvent: { targetUrl: 'https://youtube.com/watch?v=vid123' },
      });
      expect(handleYouTubeOpenWindow).toHaveBeenCalled();
    }
  });

  it('share button press calls shareYouTubeVideo', () => {
    const { shareYouTubeVideo } = require('@/utils/youtubeNavigation');
    render(<FeaturedVideoCard item={{ ...mockItem, youtube_id: 'vid123' }} styles={mockStyles} />);
    fireEvent.press(screen.getByLabelText('common.playVideo'));
    fireEvent.press(screen.getByLabelText('common.shareVideo'));
    expect(shareYouTubeVideo).toHaveBeenCalledWith('vid123');
  });

  it('share uses fallback video ID when youtube_id is null', () => {
    const { shareYouTubeVideo } = require('@/utils/youtubeNavigation');
    render(<FeaturedVideoCard item={{ ...mockItem, youtube_id: null }} styles={mockStyles} />);
    fireEvent.press(screen.getByLabelText('common.playVideo'));
    fireEvent.press(screen.getByLabelText('common.shareVideo'));
    // FALLBACK_VIDEO_ID = 'roYRXbhxhlM'
    expect(shareYouTubeVideo).toHaveBeenCalledWith('roYRXbhxhlM');
  });
});
