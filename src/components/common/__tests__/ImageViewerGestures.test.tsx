jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    Gesture: {
      Pinch: () => ({ onUpdate: jest.fn().mockReturnThis(), onEnd: jest.fn().mockReturnThis() }),
      Pan: () => ({
        minPointers: jest.fn().mockReturnThis(),
        onStart: jest.fn().mockReturnThis(),
        onUpdate: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
      }),
      Tap: () => ({ numberOfTaps: jest.fn().mockReturnThis(), onEnd: jest.fn().mockReturnThis() }),
      Simultaneous: jest.fn(),
      Race: jest.fn(),
    },
    GestureHandlerRootView: View,
  };
});

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ImageViewerGestures } from '../ImageViewerGestures';

describe('ImageViewerGestures', () => {
  it('renders children', () => {
    render(
      <ImageViewerGestures onDismiss={jest.fn()} backdropOpacity={{ value: 1 } as never}>
        <Text>Child content</Text>
      </ImageViewerGestures>,
    );
    expect(screen.getByText('Child content')).toBeTruthy();
  });

  it('renders without crashing with different props', () => {
    const { unmount } = render(
      <ImageViewerGestures onDismiss={jest.fn()} backdropOpacity={{ value: 0.5 } as never}>
        <Text>Test</Text>
      </ImageViewerGestures>,
    );
    unmount();
  });
});
