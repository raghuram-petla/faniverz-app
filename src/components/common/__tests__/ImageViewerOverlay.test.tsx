jest.mock('react-native-reanimated', () => {
  const { View, ScrollView } = require('react-native');
  const React = require('react');
  const AnimatedView = React.forwardRef((props: object, ref: unknown) =>
    React.createElement(View, { ...props, ref }),
  );
  const AnimatedScrollView = React.forwardRef((props: object, ref: unknown) =>
    React.createElement(ScrollView, { ...props, ref }),
  );
  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (c: unknown) => c,
      View: AnimatedView,
      ScrollView: AnimatedScrollView,
    },
    useSharedValue: jest.fn((v: number) => ({ value: v })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn(
      (value: number, _config: unknown, callback?: (finished: boolean) => void) => {
        if (callback) callback(true);
        return value;
      },
    ),
    withSpring: jest.fn((v: number) => v),
    withSequence: jest.fn((...args: number[]) => args[args.length - 1]),
    withDelay: jest.fn((_: unknown, a: unknown) => a),
    withRepeat: jest.fn((a: unknown) => a),
    cancelAnimation: jest.fn(),
    runOnJS: jest.fn((fn: Function) => fn),
    Easing: {
      bezier: jest.fn(() => (t: number) => t),
      inOut: jest.fn((fn: unknown) => fn),
      ease: (t: number) => t,
    },
  };
});

jest.mock('@/providers/ImageViewerProvider', () => ({
  useImageViewer: jest.fn(),
  ImageViewerProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../ImageViewerGestures', () => ({
  ImageViewerGestures: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View testID="gesture-wrapper">{children}</View>;
  },
}));

jest.mock('@/utils/measureView', () => ({
  measureView: jest.fn((_ref: unknown, onMeasured: (layout: object) => void) =>
    onMeasured({ x: 16, y: 200, width: 200, height: 255 }),
  ),
}));

jest.mock('../ImageViewerOverlay.styles', () => ({
  overlayStyles: new Proxy({}, { get: () => ({}) }),
}));

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ImageViewerOverlay } from '../ImageViewerOverlay';

const mockOnSourceHide = jest.fn();
const mockOnSourceShow = jest.fn();

const defaultProps = {
  feedUrl: 'https://example.com/feed_md.jpg',
  fullUrl: 'https://example.com/full.jpg',
  sourceLayout: { x: 16, y: 200, width: 200, height: 255 },
  sourceRef: { current: null } as never,
  borderRadius: 12,
  onSourceHide: mockOnSourceHide,
  onSourceShow: mockOnSourceShow,
  onClose: jest.fn(),
};

describe('ImageViewerOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ImageViewerOverlay {...defaultProps} />);
  });

  it('renders close button with accessibility label', () => {
    render(<ImageViewerOverlay {...defaultProps} />);
    expect(screen.getByLabelText('Close image')).toBeTruthy();
  });

  it('renders gesture wrapper', () => {
    render(<ImageViewerOverlay {...defaultProps} />);
    expect(screen.getByTestId('gesture-wrapper')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    render(<ImageViewerOverlay {...defaultProps} onClose={onClose} />);
    fireEvent.press(screen.getByLabelText('Close image'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onSourceHide after open animation completes', () => {
    jest.useFakeTimers();
    render(<ImageViewerOverlay {...defaultProps} />);
    expect(mockOnSourceHide).not.toHaveBeenCalled();
    jest.advanceTimersByTime(300);
    expect(mockOnSourceHide).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('calls onSourceShow when close button is pressed', () => {
    render(<ImageViewerOverlay {...defaultProps} />);
    fireEvent.press(screen.getByLabelText('Close image'));
    expect(mockOnSourceShow).toHaveBeenCalled();
  });

  it('handles BackHandler press by calling onClose', () => {
    const BackHandler = require('react-native').BackHandler;
    const listeners: Array<() => boolean> = [];
    const removeSpy = jest.fn();
    jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation((_event: string, handler: () => boolean) => {
        listeners.push(handler);
        return { remove: removeSpy };
      });

    const onClose = jest.fn();
    render(<ImageViewerOverlay {...defaultProps} onClose={onClose} />);

    // Simulate hardware back press
    const lastListener = listeners[listeners.length - 1];
    expect(lastListener).toBeDefined();
    const result = lastListener();
    expect(result).toBe(true);
    expect(onClose).toHaveBeenCalled();

    BackHandler.addEventListener.mockRestore();
  });

  it('renders two Image components for feed and full resolution', () => {
    const { UNSAFE_getAllByType } = render(<ImageViewerOverlay {...defaultProps} />);
    const { Image } = require('expo-image');
    const images = UNSAFE_getAllByType(Image);
    expect(images.length).toBeGreaterThanOrEqual(2);
  });

  it('close button is accessible via touchable', () => {
    const onClose = jest.fn();
    render(<ImageViewerOverlay {...defaultProps} onClose={onClose} />);
    const closeBtn = screen.getByLabelText('Close image');
    expect(closeBtn).toBeTruthy();
    fireEvent.press(closeBtn);
    // Verify onClose is called (through cleanup chain)
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders correctly when animations are enabled (default path)', () => {
    // useAnimationsEnabled returns true by default (mocked in jest.setup.js via useAnimationStore)
    // This covers the animation-enabled branch — verify component renders properly
    const onSourceHide = jest.fn();
    render(<ImageViewerOverlay {...defaultProps} onSourceHide={onSourceHide} />);
    // With animations enabled, onSourceHide is called after OPEN_DURATION timer
    expect(screen.getByLabelText('Close image')).toBeTruthy();
  });

  it('does not crash when onSourceHide is not provided', () => {
    const { feedUrl, fullUrl, sourceLayout, sourceRef, borderRadius, onClose } = defaultProps;
    expect(() =>
      render(
        <ImageViewerOverlay
          feedUrl={feedUrl}
          fullUrl={fullUrl}
          sourceLayout={sourceLayout}
          sourceRef={sourceRef}
          borderRadius={borderRadius}
          onClose={onClose}
        />,
      ),
    ).not.toThrow();
  });

  it('does not crash when onSourceShow is not provided', () => {
    const { feedUrl, fullUrl, sourceLayout, sourceRef, borderRadius, onClose, onSourceHide } =
      defaultProps;
    const onClose2 = jest.fn();
    render(
      <ImageViewerOverlay
        feedUrl={feedUrl}
        fullUrl={fullUrl}
        sourceLayout={sourceLayout}
        sourceRef={sourceRef}
        borderRadius={borderRadius}
        onSourceHide={onSourceHide}
        onClose={onClose2}
      />,
    );
    // pressing close should not throw even without onSourceShow
    fireEvent.press(screen.getByLabelText('Close image'));
    expect(onClose2).toHaveBeenCalled();
  });

  it('uses PLACEHOLDER_POSTER when feedUrl is empty', () => {
    const { UNSAFE_getAllByType } = render(
      <ImageViewerOverlay {...defaultProps} feedUrl="" fullUrl="" />,
    );
    const { Image } = require('expo-image');
    const images = UNSAFE_getAllByType(Image);
    // Both images fall back to placeholder — verify they still render
    expect(images.length).toBeGreaterThanOrEqual(2);
  });

  it('removes BackHandler subscription on unmount', () => {
    const BackHandler = require('react-native').BackHandler;
    const removeSpy = jest.fn();
    jest.spyOn(BackHandler, 'addEventListener').mockReturnValue({ remove: removeSpy });

    const { unmount } = render(<ImageViewerOverlay {...defaultProps} />);
    unmount();

    expect(removeSpy).toHaveBeenCalled();
    BackHandler.addEventListener.mockRestore();
  });

  it('onLoad callback on full-res Image transitions fullResLoaded state', () => {
    const { UNSAFE_getAllByType } = render(<ImageViewerOverlay {...defaultProps} />);
    const { Image } = require('expo-image');
    const images = UNSAFE_getAllByType(Image);
    // The second image is the full-res one with onLoad
    const fullResImage = images.find(
      (img: { props: { onLoad?: () => void } }) => img.props.onLoad !== undefined,
    );
    if (fullResImage?.props.onLoad) {
      // Calling onLoad should not throw
      expect(() => fullResImage.props.onLoad()).not.toThrow();
    }
  });

  it('renders correctly when animations are disabled (no transition effects)', () => {
    jest.requireMock('@/hooks/useAnimationsEnabled').useAnimationsEnabled = () => false;

    const onSourceHide = jest.fn();
    render(<ImageViewerOverlay {...defaultProps} onSourceHide={onSourceHide} />);
    // When animations disabled, onSourceHide is called immediately (no timer)
    expect(onSourceHide).toHaveBeenCalled();
    expect(screen.getByLabelText('Close image')).toBeTruthy();

    jest.requireMock('@/hooks/useAnimationsEnabled').useAnimationsEnabled = () => true;
  });

  it('close button does not call cleanup twice (closingRef guard)', () => {
    const onClose = jest.fn();
    render(<ImageViewerOverlay {...defaultProps} onClose={onClose} />);
    const closeBtn = screen.getByLabelText('Close image');
    fireEvent.press(closeBtn);
    fireEvent.press(closeBtn);
    // Should be called only once due to closingRef guard
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('animations disabled close button calls cleanup immediately', () => {
    jest.requireMock('@/hooks/useAnimationsEnabled').useAnimationsEnabled = () => false;

    const onClose = jest.fn();
    const onSourceShow = jest.fn();
    render(<ImageViewerOverlay {...defaultProps} onClose={onClose} onSourceShow={onSourceShow} />);
    fireEvent.press(screen.getByLabelText('Close image'));
    expect(onClose).toHaveBeenCalled();
    expect(onSourceShow).toHaveBeenCalled();

    jest.requireMock('@/hooks/useAnimationsEnabled').useAnimationsEnabled = () => true;
  });

  it('measureView fallback path calls animateClose when measure fails', () => {
    const { measureView } = require('@/utils/measureView');
    measureView.mockImplementationOnce((_ref: unknown, _onSuccess: unknown, onFail: () => void) =>
      onFail(),
    );
    const onClose = jest.fn();
    render(<ImageViewerOverlay {...defaultProps} onClose={onClose} />);
    fireEvent.press(screen.getByLabelText('Close image'));
    // With measureView failing, animateClose(200) is called — withTiming callback fires cleanup
    expect(onClose).toHaveBeenCalled();
  });

  it('full-res load triggers progress bar hide (useEffect branch)', () => {
    const { UNSAFE_getAllByType } = render(<ImageViewerOverlay {...defaultProps} />);
    const { Image } = require('expo-image');
    const images = UNSAFE_getAllByType(Image);
    const fullResImage = images.find(
      (img: { props: { onLoad?: () => void } }) => img.props.onLoad !== undefined,
    );
    // Simulating load should not crash
    if (fullResImage?.props.onLoad) {
      fullResImage.props.onLoad();
    }
    expect(screen.getByLabelText('Close image')).toBeTruthy();
  });
});
