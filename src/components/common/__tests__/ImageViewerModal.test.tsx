jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View: (props: Record<string, unknown>) => <View {...props} />,
    },
    useSharedValue: (v: number) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withTiming: (v: number) => v,
    runOnJS: (fn: () => void) => fn,
  };
});

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    GestureDetector: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    GestureHandlerRootView: ({ children, ...rest }: Record<string, unknown>) => (
      <View {...rest}>{children as React.ReactNode}</View>
    ),
    Gesture: {
      Pinch: () => ({ onUpdate: () => ({ onEnd: () => ({}) }) }),
      Pan: () => ({
        minPointers: () => ({ onStart: () => ({ onUpdate: () => ({ onEnd: () => ({}) }) }) }),
      }),
      Tap: () => ({ numberOfTaps: () => ({ onEnd: () => ({}) }) }),
      Simultaneous: () => ({}),
      Race: () => ({}),
    },
  };
});

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return { Image: (props: Record<string, unknown>) => <View testID="expo-image" {...props} /> };
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ImageViewerModal } from '../ImageViewerModal';

describe('ImageViewerModal', () => {
  it('renders nothing when imageUrl is null', () => {
    render(<ImageViewerModal imageUrl={null} onClose={jest.fn()} />);
    expect(screen.queryByLabelText('Close image')).toBeNull();
  });

  it('renders viewer when imageUrl is provided', () => {
    render(<ImageViewerModal imageUrl="https://example.com/poster.jpg" onClose={jest.fn()} />);
    expect(screen.getByLabelText('Close image')).toBeTruthy();
    expect(screen.getByTestId('expo-image')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    render(<ImageViewerModal imageUrl="https://example.com/poster.jpg" onClose={onClose} />);
    fireEvent.press(screen.getByLabelText('Close image'));
    expect(onClose).toHaveBeenCalled();
  });
});
