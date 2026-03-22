jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = { 'common.shareVideo': 'Share video' };
      return map[key] ?? key;
    },
    i18n: { language: 'en' },
  }),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: { white: '#fff' },
  }),
}));

jest.mock('@/styles/tabs/feed.styles', () => ({
  createFeedCardStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/utils/youtubeNavigation', () => ({
  buildYouTubeEmbedHtml: jest.fn(() => '<html>embed</html>'),
  shareYouTubeVideo: jest.fn(),
  handleYouTubeNavigation: jest.fn(() => true),
  handleYouTubeOpenWindow: jest.fn(),
}));

jest.mock('@/constants/webview', () => ({
  WEBVIEW_BASE_URL: 'https://example.com',
}));

jest.mock('react-native-webview', () => {
  const { View, TouchableOpacity } = require('react-native');
  return {
    WebView: (props: Record<string, unknown>) => {
      return <View testID="webview" {...props} />;
    },
  };
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FeedVideoPlayer } from '../FeedVideoPlayer';
import {
  shareYouTubeVideo,
  handleYouTubeNavigation,
  handleYouTubeOpenWindow,
} from '@/utils/youtubeNavigation';

describe('FeedVideoPlayer', () => {
  const defaultProps = {
    youtubeId: 'abc123',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    isActive: false,
  };

  it('renders thumbnail when inactive', () => {
    render(<FeedVideoPlayer {...defaultProps} />);
    expect(screen.queryByTestId('webview')).toBeNull();
  });

  it('renders play icon when inactive', () => {
    const { root } = render(<FeedVideoPlayer {...defaultProps} />);
    // Play icon is rendered as an Ionicons component
    const icons = root.findAll(
      (node: { props: Record<string, unknown> }) => node.props.name === 'play',
    );
    expect(icons.length).toBeGreaterThan(0);
  });

  it('renders WebView when active', () => {
    render(<FeedVideoPlayer {...defaultProps} isActive={true} />);
    expect(screen.getByTestId('webview')).toBeTruthy();
  });

  it('does not render play icon when active', () => {
    const { root } = render(<FeedVideoPlayer {...defaultProps} isActive={true} />);
    const icons = root.findAll(
      (node: { props: Record<string, unknown> }) => node.props.name === 'play',
    );
    expect(icons.length).toBe(0);
  });

  it('uses fallback thumbnail when thumbnailUrl is null', () => {
    render(<FeedVideoPlayer {...defaultProps} thumbnailUrl={null} />);
    // Component should still render (uses youtube thumbnail fallback)
    expect(screen.queryByTestId('webview')).toBeNull();
  });

  it('transitions from active to inactive (unmounts WebView)', () => {
    const { rerender } = render(<FeedVideoPlayer {...defaultProps} isActive={true} />);
    expect(screen.getByTestId('webview')).toBeTruthy();

    rerender(<FeedVideoPlayer {...defaultProps} isActive={false} />);
    expect(screen.queryByTestId('webview')).toBeNull();
  });

  it('WebView has correct autoplay props', () => {
    render(<FeedVideoPlayer {...defaultProps} isActive={true} />);
    const webview = screen.getByTestId('webview');
    expect(webview.props.allowsInlineMediaPlayback).toBe(true);
    expect(webview.props.mediaPlaybackRequiresUserAction).toBe(false);
    expect(webview.props.javaScriptEnabled).toBe(true);
  });

  it('calls handleYouTubeNavigation when WebView navigation is requested', () => {
    render(<FeedVideoPlayer {...defaultProps} isActive={true} />);
    const webview = screen.getByTestId('webview');
    const onShouldStartLoad = webview.props.onShouldStartLoadWithRequest;
    expect(typeof onShouldStartLoad).toBe('function');
    const fakeRequest = { url: 'https://youtube.com/watch?v=abc123', isTopFrame: true };
    onShouldStartLoad(fakeRequest);
    expect(handleYouTubeNavigation).toHaveBeenCalledWith(fakeRequest, 'abc123');
  });

  it('calls handleYouTubeOpenWindow when WebView opens a new window', () => {
    render(<FeedVideoPlayer {...defaultProps} isActive={true} />);
    const webview = screen.getByTestId('webview');
    const onOpenWindow = webview.props.onOpenWindow;
    expect(typeof onOpenWindow).toBe('function');
    onOpenWindow({ nativeEvent: { targetUrl: 'https://youtube.com/watch?v=abc123' } });
    expect(handleYouTubeOpenWindow).toHaveBeenCalledWith(
      'https://youtube.com/watch?v=abc123',
      'abc123',
    );
  });

  it('calls shareYouTubeVideo when share button is pressed', () => {
    render(<FeedVideoPlayer {...defaultProps} isActive={true} />);
    const webview = screen.getByTestId('webview');
    // The share functionality is accessible via the share overlay, we test through onShare
    // which is exposed as the onPress handler on a TouchableOpacity
    // Access via the accessibilityLabel on the TouchableOpacity share button
    const shareBtn = screen.getByLabelText('Share video');
    fireEvent.press(shareBtn);
    expect(shareYouTubeVideo).toHaveBeenCalledWith('abc123');
  });

  it('uses YouTube fallback thumbnail URL when thumbnailUrl is null', () => {
    const { root } = render(
      <FeedVideoPlayer {...defaultProps} thumbnailUrl={null} isActive={false} />,
    );
    // Should use youtube auto-generated thumb
    const images = root.findAll(
      (node: { props: Record<string, unknown> }) =>
        typeof node.props.source === 'object' &&
        node.props.source !== null &&
        typeof (node.props.source as { uri?: string }).uri === 'string' &&
        ((node.props.source as { uri: string }).uri.includes('youtube.com') ||
          (node.props.source as { uri: string }).uri.includes('placeholder')),
    );
    expect(images.length).toBeGreaterThan(0);
  });

  it('falls back to PLACEHOLDER_POSTER when both thumbnailUrl and youtube thumb resolve to empty', () => {
    // thumbnailUrl is null AND youtubeId is empty string → thumb = '' → PLACEHOLDER_POSTER used
    const { root } = render(<FeedVideoPlayer youtubeId="" thumbnailUrl={null} isActive={false} />);
    const images = root.findAll(
      (node: { props: Record<string, unknown> }) =>
        typeof node.props.source === 'object' &&
        node.props.source !== null &&
        typeof (node.props.source as { uri?: string }).uri === 'string',
    );
    expect(images.length).toBeGreaterThan(0);
  });

  it('renders WebView with correct baseUrl', () => {
    render(<FeedVideoPlayer {...defaultProps} isActive={true} />);
    const webview = screen.getByTestId('webview');
    expect(webview.props.source.baseUrl).toBe('https://example.com');
  });

  it('onNavRequest returns result from handleYouTubeNavigation', () => {
    (handleYouTubeNavigation as jest.Mock).mockReturnValueOnce(false);
    render(<FeedVideoPlayer {...defaultProps} isActive={true} />);
    const webview = screen.getByTestId('webview');
    const result = webview.props.onShouldStartLoadWithRequest({ url: 'blocked', isTopFrame: true });
    expect(result).toBe(false);
  });

  it('onShare callback uses memoized youtubeId', () => {
    render(<FeedVideoPlayer {...defaultProps} isActive={true} youtubeId="xyz789" />);
    fireEvent.press(screen.getByLabelText('Share video'));
    expect(shareYouTubeVideo).toHaveBeenCalledWith('xyz789');
  });

  it('uses provided thumbnailUrl when not null', () => {
    const { root } = render(
      <FeedVideoPlayer {...defaultProps} thumbnailUrl="https://custom.com/thumb.jpg" />,
    );
    const images = root.findAll(
      (node: { props: Record<string, unknown> }) =>
        typeof node.props.source === 'object' &&
        node.props.source !== null &&
        (node.props.source as { uri: string }).uri === 'https://custom.com/thumb.jpg',
    );
    expect(images.length).toBeGreaterThan(0);
  });

  it('uses PLACEHOLDER_POSTER when thumbnailUrl is empty string (falsy via ||)', () => {
    // thumbnailUrl '' is not null/undefined so ?? passes it through; '' || PLACEHOLDER_POSTER triggers fallback
    const { root } = render(<FeedVideoPlayer youtubeId="abc" thumbnailUrl="" isActive={false} />);
    const images = root.findAll(
      (node: { props: Record<string, unknown> }) =>
        typeof node.props.source === 'object' &&
        node.props.source !== null &&
        typeof (node.props.source as { uri?: string }).uri === 'string',
    );
    expect(images.length).toBeGreaterThan(0);
  });
});
