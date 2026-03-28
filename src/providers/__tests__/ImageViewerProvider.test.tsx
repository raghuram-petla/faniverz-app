jest.mock('@/components/common/ImageViewerOverlay', () => ({
  ImageViewerOverlay: ({
    feedUrl,
    topChrome,
    onClose,
    onSourceHide,
    onSourceShow,
  }: {
    feedUrl: string;
    topChrome?: { variant: string; headerTranslateY: number };
    onClose: () => void;
    onSourceHide?: () => void;
    onSourceShow?: () => void;
  }) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID="image-viewer-overlay">
        <Text>{feedUrl}</Text>
        {topChrome ? (
          <Text testID="overlay-top-chrome">{`${topChrome.variant}:${topChrome.headerTranslateY}`}</Text>
        ) : null}
        <TouchableOpacity
          onPress={() => {
            onSourceHide?.();
          }}
          accessibilityLabel="Hide source"
        >
          <Text>Hide</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            onSourceShow?.();
            onClose();
          }}
          accessibilityLabel="Close overlay"
        >
          <Text>Close</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ImageViewerProvider, useImageViewer } from '../ImageViewerProvider';
import { View, TouchableOpacity, Text } from 'react-native';

function TestConsumer() {
  const { openImage, closeImage } = useImageViewer();
  return (
    <View>
      <TouchableOpacity
        accessibilityLabel="Open"
        onPress={() =>
          openImage({
            feedUrl: 'https://example.com/feed.jpg',
            fullUrl: 'https://example.com/full.jpg',
            sourceLayout: { x: 16, y: 200, width: 200, height: 255 },
            sourceRef: { current: null } as never,
            borderRadius: 12,
          })
        }
      >
        <Text>Open</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityLabel="Close" onPress={closeImage}>
        <Text>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

describe('ImageViewerProvider', () => {
  it('renders children', () => {
    render(
      <ImageViewerProvider>
        <Text>Child</Text>
      </ImageViewerProvider>,
    );
    expect(screen.getByText('Child')).toBeTruthy();
  });

  it('does not render overlay when no image is open', () => {
    render(
      <ImageViewerProvider>
        <Text>Child</Text>
      </ImageViewerProvider>,
    );
    expect(screen.queryByTestId('image-viewer-overlay')).toBeNull();
  });

  it('renders overlay after openImage is called', () => {
    render(
      <ImageViewerProvider>
        <TestConsumer />
      </ImageViewerProvider>,
    );
    fireEvent.press(screen.getByLabelText('Open'));
    expect(screen.getByTestId('image-viewer-overlay')).toBeTruthy();
    expect(screen.getByText('https://example.com/feed.jpg')).toBeTruthy();
  });

  it('hides overlay after closeImage is called', () => {
    render(
      <ImageViewerProvider>
        <TestConsumer />
      </ImageViewerProvider>,
    );
    fireEvent.press(screen.getByLabelText('Open'));
    expect(screen.getByTestId('image-viewer-overlay')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Close'));
    expect(screen.queryByTestId('image-viewer-overlay')).toBeNull();
  });

  it('hides overlay when overlay onClose fires', () => {
    render(
      <ImageViewerProvider>
        <TestConsumer />
      </ImageViewerProvider>,
    );
    fireEvent.press(screen.getByLabelText('Open'));
    fireEvent.press(screen.getByLabelText('Close overlay'));
    expect(screen.queryByTestId('image-viewer-overlay')).toBeNull();
  });

  it('passes onSourceHide and onSourceShow callbacks through to overlay', () => {
    const onSourceHide = jest.fn();
    const onSourceShow = jest.fn();
    function CallbackConsumer() {
      const { openImage } = useImageViewer();
      return (
        <TouchableOpacity
          accessibilityLabel="Open with callbacks"
          onPress={() =>
            openImage({
              feedUrl: 'https://example.com/feed.jpg',
              fullUrl: 'https://example.com/full.jpg',
              sourceLayout: { x: 0, y: 0, width: 100, height: 150 },
              sourceRef: { current: null } as never,
              borderRadius: 8,
              onSourceHide,
              onSourceShow,
            })
          }
        >
          <Text>Open</Text>
        </TouchableOpacity>
      );
    }
    render(
      <ImageViewerProvider>
        <CallbackConsumer />
      </ImageViewerProvider>,
    );
    fireEvent.press(screen.getByLabelText('Open with callbacks'));
    // Simulate overlay calling onSourceHide
    fireEvent.press(screen.getByLabelText('Hide source'));
    expect(onSourceHide).toHaveBeenCalled();
    // Simulate overlay calling onSourceShow + close
    fireEvent.press(screen.getByLabelText('Close overlay'));
    expect(onSourceShow).toHaveBeenCalled();
  });

  it('provides default context values outside provider', () => {
    // useImageViewer outside provider should not crash
    function Standalone() {
      const { openImage } = useImageViewer();
      return (
        <TouchableOpacity
          accessibilityLabel="Noop"
          onPress={() =>
            openImage({
              feedUrl: 'x',
              fullUrl: 'x',
              sourceLayout: { x: 0, y: 0, width: 0, height: 0 },
              sourceRef: { current: null } as never,
              borderRadius: 0,
            })
          }
        >
          <Text>Noop</Text>
        </TouchableOpacity>
      );
    }
    render(<Standalone />);
    fireEvent.press(screen.getByLabelText('Noop'));
    // Should not throw
  });

  it('calls default closeImage noop outside provider without crashing', () => {
    function StandaloneClose() {
      const { closeImage } = useImageViewer();
      return (
        <TouchableOpacity accessibilityLabel="NoopClose" onPress={closeImage}>
          <Text>Close Noop</Text>
        </TouchableOpacity>
      );
    }
    render(<StandaloneClose />);
    fireEvent.press(screen.getByLabelText('NoopClose'));
    // default closeImage is () => {} — should not throw
  });

  it('replaces the current image when openImage is called while another is already open', () => {
    function MultiConsumer() {
      const { openImage } = useImageViewer();
      return (
        <View>
          <TouchableOpacity
            accessibilityLabel="Open First"
            onPress={() =>
              openImage({
                feedUrl: 'https://example.com/first.jpg',
                fullUrl: 'https://example.com/first-full.jpg',
                sourceLayout: { x: 0, y: 0, width: 100, height: 150 },
                sourceRef: { current: null } as never,
                borderRadius: 8,
              })
            }
          >
            <Text>First</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Open Second"
            onPress={() =>
              openImage({
                feedUrl: 'https://example.com/second.jpg',
                fullUrl: 'https://example.com/second-full.jpg',
                sourceLayout: { x: 0, y: 0, width: 100, height: 150 },
                sourceRef: { current: null } as never,
                borderRadius: 8,
              })
            }
          >
            <Text>Second</Text>
          </TouchableOpacity>
        </View>
      );
    }
    render(
      <ImageViewerProvider>
        <MultiConsumer />
      </ImageViewerProvider>,
    );
    fireEvent.press(screen.getByLabelText('Open First'));
    expect(screen.getByText('https://example.com/first.jpg')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Open Second'));
    expect(screen.getByText('https://example.com/second.jpg')).toBeTruthy();
  });

  it('passes top chrome metadata through to the overlay', () => {
    function TopChromeConsumer() {
      const { openImage } = useImageViewer();
      return (
        <View>
          <TouchableOpacity
            accessibilityLabel="Open with top chrome"
            onPress={() =>
              openImage({
                feedUrl: 'https://example.com/feed.jpg',
                fullUrl: 'https://example.com/full.jpg',
                sourceLayout: { x: 16, y: 200, width: 200, height: 255 },
                sourceRef: { current: null } as never,
                borderRadius: 12,
                topChrome: {
                  variant: 'home-feed',
                  insetTop: 44,
                  headerContentHeight: 52,
                  headerTranslateY: -18,
                },
              })
            }
          >
            <Text>Open With Top Chrome</Text>
          </TouchableOpacity>
        </View>
      );
    }

    render(
      <ImageViewerProvider>
        <TopChromeConsumer />
      </ImageViewerProvider>,
    );

    fireEvent.press(screen.getByLabelText('Open with top chrome'));
    expect(screen.getByTestId('overlay-top-chrome').props.children).toBe('home-feed:-18');
  });
});
