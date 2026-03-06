jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: { white: '#fff' },
  }),
}));

jest.mock('@/styles/tabs/feed.styles', () => ({
  createFeedCardStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return {
    WebView: (props: Record<string, unknown>) => <View testID="webview" {...props} />,
  };
});

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { FeedVideoPlayer } from '../FeedVideoPlayer';

describe('FeedVideoPlayer', () => {
  const defaultProps = {
    youtubeId: 'abc123',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    duration: '2:30',
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

  it('renders duration text when inactive', () => {
    render(<FeedVideoPlayer {...defaultProps} />);
    expect(screen.getByText('2:30')).toBeTruthy();
  });

  it('does not render duration when null', () => {
    render(<FeedVideoPlayer {...defaultProps} duration={null} />);
    expect(screen.queryByText('2:30')).toBeNull();
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
});
