const mockInjectJavaScript = jest.fn();

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockWebView = React.forwardRef(
    (props: Record<string, unknown>, ref: React.Ref<unknown>) => {
      React.useImperativeHandle(ref, () => ({ injectJavaScript: mockInjectJavaScript }));
      return <View testID="youtube-inline-webview" {...props} />;
    },
  );
  MockWebView.displayName = 'MockWebView';
  return { WebView: MockWebView };
});

import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { InlineYouTubeWebView } from '../InlineYouTubeWebView';

const emitMessage = (data: unknown) => {
  act(() => {
    screen.getByTestId('youtube-inline-webview').props.onMessage({
      nativeEvent: { data: JSON.stringify(data) },
    });
  });
};

describe('InlineYouTubeWebView', () => {
  beforeEach(() => {
    mockInjectJavaScript.mockClear();
  });

  it('renders WebView HTML with the provided video id and thumbnail', () => {
    render(<InlineYouTubeWebView videoId="abc123" thumbnailUrl="https://example.com/thumb.jpg" />);

    const webView = screen.getByTestId('youtube-inline-webview');
    expect(webView.props.source.html).toContain('"abc123"');
    expect(webView.props.source.html).toContain('https://example.com/thumb.jpg');
    expect(webView.props.source.html).toContain('controls: 1');
    expect(webView.props.source.html).toContain('fs: 1');
    expect(webView.props.source.html).toContain('id="loadingShell"');
    expect(webView.props.source.html).toContain("if (state === 'playing')");
    expect(webView.props.source.html).toContain('removeLoading();');
  });

  it('injects a play command after the shell reports ready when autoplay is enabled', () => {
    render(
      <InlineYouTubeWebView
        videoId="abc123"
        thumbnailUrl="https://example.com/thumb.jpg"
        autoPlay
      />,
    );

    emitMessage({ type: 'shellReady' });

    expect(
      mockInjectJavaScript.mock.calls.some(([script]) =>
        String(script).includes('\\"type\\":\\"play\\"'),
      ),
    ).toBe(true);
  });

  it('injects mute, pause, and reset commands once the shell is ready', () => {
    const { rerender } = render(
      <InlineYouTubeWebView
        videoId="abc123"
        thumbnailUrl="https://example.com/thumb.jpg"
        muted={false}
        pauseToken={0}
        resetToken={0}
      />,
    );

    emitMessage({ type: 'shellReady' });
    expect(
      mockInjectJavaScript.mock.calls.some(([script]) =>
        String(script).includes('\\"type\\":\\"unmute\\"'),
      ),
    ).toBe(true);

    rerender(
      <InlineYouTubeWebView
        videoId="abc123"
        thumbnailUrl="https://example.com/thumb.jpg"
        muted={true}
        pauseToken={1}
        resetToken={1}
      />,
    );

    expect(
      mockInjectJavaScript.mock.calls.some(([script]) =>
        String(script).includes('\\"type\\":\\"mute\\"'),
      ),
    ).toBe(true);
    expect(
      mockInjectJavaScript.mock.calls.some(([script]) =>
        String(script).includes('\\"type\\":\\"pause\\"'),
      ),
    ).toBe(true);
    expect(
      mockInjectJavaScript.mock.calls.some(([script]) =>
        String(script).includes('\\"type\\":\\"reset\\"'),
      ),
    ).toBe(true);
  });

  it('calls onPlayPress when the shell reports a user play tap', () => {
    const onPlayPress = jest.fn();
    render(
      <InlineYouTubeWebView
        videoId="abc123"
        thumbnailUrl="https://example.com/thumb.jpg"
        onPlayPress={onPlayPress}
      />,
    );

    emitMessage({ type: 'playPressed' });

    expect(onPlayPress).toHaveBeenCalledTimes(1);
  });

  it('forwards state changes from the shell', () => {
    const onStateChange = jest.fn();
    render(
      <InlineYouTubeWebView
        videoId="abc123"
        thumbnailUrl="https://example.com/thumb.jpg"
        onStateChange={onStateChange}
      />,
    );

    emitMessage({ type: 'stateChange', state: 'playing' });

    expect(onStateChange).toHaveBeenCalledWith('playing');
  });

  it('ignores stateChange messages without a state value', () => {
    const onStateChange = jest.fn();
    render(
      <InlineYouTubeWebView
        videoId="abc123"
        thumbnailUrl="https://example.com/thumb.jpg"
        onStateChange={onStateChange}
      />,
    );

    // stateChange without state property — should not call onStateChange
    emitMessage({ type: 'stateChange' });

    expect(onStateChange).not.toHaveBeenCalled();
  });

  it('silently ignores malformed JSON messages', () => {
    render(<InlineYouTubeWebView videoId="abc123" thumbnailUrl="https://example.com/thumb.jpg" />);

    // Should not throw when receiving invalid JSON
    act(() => {
      screen.getByTestId('youtube-inline-webview').props.onMessage({
        nativeEvent: { data: 'not-valid-json{{{{' },
      });
    });
  });

  it('SECURITY: restricts originWhitelist to HTTPS only, not wildcard', () => {
    render(<InlineYouTubeWebView videoId="abc123" thumbnailUrl="https://example.com/thumb.jpg" />);
    const webView = screen.getByTestId('youtube-inline-webview');
    // Must NOT use ['*'] which allows any origin including http:// and custom schemes
    expect(webView.props.originWhitelist).toEqual(['https://*']);
  });
});
