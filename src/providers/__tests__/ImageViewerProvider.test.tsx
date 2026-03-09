jest.mock('@/components/common/ImageViewerOverlay', () => ({
  ImageViewerOverlay: ({ feedUrl, onClose }: { feedUrl: string; onClose: () => void }) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID="image-viewer-overlay">
        <Text>{feedUrl}</Text>
        <TouchableOpacity onPress={onClose} accessibilityLabel="Close overlay">
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
});
