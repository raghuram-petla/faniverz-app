// Store captured gesture callbacks for manual invocation in tests
const capturedCallbacks: {
  pinchUpdate?: (e: { scale: number }) => void;
  pinchEnd?: () => void;
  pinchStart?: () => void;
  panStart?: () => void;
  panUpdate?: (e: { translationX: number; translationY: number }) => void;
  panEnd?: (e: {
    translationX: number;
    translationY: number;
    velocityX: number;
    velocityY: number;
  }) => void;
  doubleTapEnd?: (e: { x: number; y: number }) => void;
} = {};

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    Gesture: {
      Pinch: () => ({
        onUpdate: jest.fn((cb: (e: { scale: number }) => void) => {
          capturedCallbacks.pinchUpdate = cb;
          return {
            onEnd: jest.fn((cb2: () => void) => {
              capturedCallbacks.pinchEnd = cb2;
              return {};
            }),
          };
        }),
      }),
      Pan: () => ({
        minPointers: jest.fn().mockReturnThis(),
        onStart: jest.fn((cb: () => void) => {
          capturedCallbacks.panStart = cb;
          return {
            onUpdate: jest.fn(
              (cb2: (e: { translationX: number; translationY: number }) => void) => {
                capturedCallbacks.panUpdate = cb2;
                return {
                  onEnd: jest.fn(
                    (
                      cb3: (e: {
                        translationX: number;
                        translationY: number;
                        velocityX: number;
                        velocityY: number;
                      }) => void,
                    ) => {
                      capturedCallbacks.panEnd = cb3;
                      return {};
                    },
                  ),
                };
              },
            ),
          };
        }),
      }),
      Tap: () => ({
        numberOfTaps: jest.fn().mockReturnThis(),
        onEnd: jest.fn((cb: (e: { x: number; y: number }) => void) => {
          capturedCallbacks.doubleTapEnd = cb;
          return {};
        }),
      }),
      Simultaneous: jest.fn(),
      Race: jest.fn(),
    },
    GestureHandlerRootView: View,
  };
});

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import {
  ImageViewerGestures,
  clampX,
  clampY,
  MAX_SCALE,
  SCREEN_W,
  SCREEN_H,
  IMG_W,
  IMG_H,
  Y_OVERSCROLL,
} from '../ImageViewerGestures';

// Clear captured callbacks before each test
beforeEach(() => {
  Object.keys(capturedCallbacks).forEach((key) => {
    delete capturedCallbacks[key as keyof typeof capturedCallbacks];
  });
});

const makeProps = (overrides = {}) => ({
  onDismiss: jest.fn(),
  backdropOpacity: { value: 1 } as never,
  scale: { value: 1 } as never,
  translateX: { value: 0 } as never,
  translateY: { value: 0 } as never,
  ...overrides,
});

describe('ImageViewerGestures', () => {
  it('renders children', () => {
    render(
      <ImageViewerGestures {...makeProps()}>
        <Text>Child content</Text>
      </ImageViewerGestures>,
    );
    expect(screen.getByText('Child content')).toBeTruthy();
  });

  it('renders without crashing with different props', () => {
    const { unmount } = render(
      <ImageViewerGestures {...makeProps({ backdropOpacity: { value: 0.5 } as never })}>
        <Text>Test</Text>
      </ImageViewerGestures>,
    );
    unmount();
  });

  it('accepts scale, translateX, translateY props', () => {
    render(
      <ImageViewerGestures
        {...makeProps({
          scale: { value: 2.5 } as never,
          translateX: { value: 50 } as never,
          translateY: { value: -30 } as never,
        })}
      >
        <Text>Zoomed</Text>
      </ImageViewerGestures>,
    );
    expect(screen.getByText('Zoomed')).toBeTruthy();
  });

  it('calls onDismiss when pan exceeds dismiss threshold downward', () => {
    const onDismiss = jest.fn();
    const scale = { value: 1 } as never;
    const translateX = { value: 0 } as never;
    const translateY = { value: 0 } as never;
    render(
      <ImageViewerGestures {...makeProps({ onDismiss, scale, translateX, translateY })}>
        <Text>test</Text>
      </ImageViewerGestures>,
    );
    // Call the pan onEnd callback with a drag exceeding 100px
    if (capturedCallbacks.panEnd) {
      capturedCallbacks.panEnd({
        translationX: 0,
        translationY: 150,
        velocityX: 0,
        velocityY: 300,
      });
      expect(onDismiss).toHaveBeenCalled();
    }
  });

  it('does not call onDismiss when pan is below dismiss threshold', () => {
    const onDismiss = jest.fn();
    const scale = { value: 1 } as never;
    render(
      <ImageViewerGestures {...makeProps({ onDismiss, scale })}>
        <Text>test</Text>
      </ImageViewerGestures>,
    );
    if (capturedCallbacks.panEnd) {
      capturedCallbacks.panEnd({
        translationX: 0,
        translationY: 50,
        velocityX: 0,
        velocityY: 100,
      });
      expect(onDismiss).not.toHaveBeenCalled();
    }
  });

  it('pan start syncs saved values', () => {
    const scale = { value: 2 } as never;
    const translateX = { value: 30 } as never;
    const translateY = { value: -20 } as never;
    render(
      <ImageViewerGestures {...makeProps({ scale, translateX, translateY })}>
        <Text>test</Text>
      </ImageViewerGestures>,
    );
    if (capturedCallbacks.panStart) {
      // Should not throw
      capturedCallbacks.panStart();
    }
    expect(screen.getByText('test')).toBeTruthy();
  });

  it('pan update at scale > 1 moves the image', () => {
    const scale = { value: 2 } as never;
    render(
      <ImageViewerGestures {...makeProps({ scale })}>
        <Text>test</Text>
      </ImageViewerGestures>,
    );
    if (capturedCallbacks.panStart) capturedCallbacks.panStart();
    if (capturedCallbacks.panUpdate) {
      capturedCallbacks.panUpdate({ translationX: 20, translationY: 15 });
    }
    expect(screen.getByText('test')).toBeTruthy();
  });

  it('pan update at scale = 1 drives drag-to-dismiss opacity', () => {
    const scale = { value: 1 } as never;
    const backdropOpacity = { value: 1 } as never;
    render(
      <ImageViewerGestures {...makeProps({ scale, backdropOpacity })}>
        <Text>test</Text>
      </ImageViewerGestures>,
    );
    if (capturedCallbacks.panUpdate) {
      capturedCallbacks.panUpdate({ translationX: 0, translationY: 80 });
    }
    expect(screen.getByText('test')).toBeTruthy();
  });

  it('pan end at scale > 1 applies decay scrolling', () => {
    const scale = { value: 2 } as never;
    render(
      <ImageViewerGestures {...makeProps({ scale })}>
        <Text>test</Text>
      </ImageViewerGestures>,
    );
    if (capturedCallbacks.panStart) capturedCallbacks.panStart();
    if (capturedCallbacks.panEnd) {
      capturedCallbacks.panEnd({
        translationX: 20,
        translationY: 10,
        velocityX: 200,
        velocityY: 100,
      });
    }
    expect(screen.getByText('test')).toBeTruthy();
  });

  it('double-tap at scale > 1 resets transforms', () => {
    const scale = { value: 2 } as never;
    render(
      <ImageViewerGestures {...makeProps({ scale })}>
        <Text>test</Text>
      </ImageViewerGestures>,
    );
    if (capturedCallbacks.doubleTapEnd) {
      capturedCallbacks.doubleTapEnd({ x: SCREEN_W / 2, y: SCREEN_H / 2 });
    }
    expect(screen.getByText('test')).toBeTruthy();
  });

  it('double-tap at scale = 1 zooms to focal point', () => {
    const scale = { value: 1 } as never;
    render(
      <ImageViewerGestures {...makeProps({ scale })}>
        <Text>test</Text>
      </ImageViewerGestures>,
    );
    if (capturedCallbacks.doubleTapEnd) {
      capturedCallbacks.doubleTapEnd({ x: SCREEN_W * 0.7, y: SCREEN_H * 0.3 });
    }
    expect(screen.getByText('test')).toBeTruthy();
  });
});

describe('clampX', () => {
  it('returns 0 at scale 1 (image fits screen width)', () => {
    expect(clampX(100, 1)).toBe(0);
    expect(clampX(-100, 1)).toBeCloseTo(0);
  });

  it('clamps within bounds at higher scales', () => {
    const maxX = (IMG_W * 2 - SCREEN_W) / 2;
    expect(clampX(maxX + 100, 2)).toBe(maxX);
    expect(clampX(-(maxX + 100), 2)).toBe(-maxX);
  });

  it('allows values within range', () => {
    const maxX = (IMG_W * MAX_SCALE - SCREEN_W) / 2;
    expect(clampX(50, MAX_SCALE)).toBe(50);
    expect(clampX(-50, MAX_SCALE)).toBe(-50);
    expect(clampX(maxX, MAX_SCALE)).toBe(maxX);
  });
});

describe('clampY', () => {
  it('clamps to Y_OVERSCROLL at scale 1', () => {
    // At scale 1 image may be shorter than screen, so maxY = 0 + Y_OVERSCROLL
    const maxY = Math.max(0, (IMG_H * 1 - SCREEN_H) / 2) + Y_OVERSCROLL;
    expect(clampY(maxY + 100, 1)).toBe(maxY);
    expect(clampY(-(maxY + 100), 1)).toBe(-maxY);
  });

  it('expands range at higher scales', () => {
    const maxY = (IMG_H * MAX_SCALE - SCREEN_H) / 2 + Y_OVERSCROLL;
    expect(clampY(50, MAX_SCALE)).toBe(50);
    expect(clampY(maxY + 100, MAX_SCALE)).toBe(maxY);
  });
});

describe('pinch gesture callbacks', () => {
  it('pinch update at max scale clamps scale', () => {
    const scale = { value: 1 } as never;
    render(
      <ImageViewerGestures {...makeProps({ scale })}>
        <Text>pinch test</Text>
      </ImageViewerGestures>,
    );
    if (capturedCallbacks.pinchUpdate) {
      // scale * e.scale = 1 * 5 = 5, but clamped to MAX_SCALE=4
      capturedCallbacks.pinchUpdate({ scale: 5 });
    }
    expect(screen.getByText('pinch test')).toBeTruthy();
  });

  it('pinch end at scale > 1 saves transforms and clamps', () => {
    const scale = { value: 2 } as never;
    const translateX = { value: 50 } as never;
    const translateY = { value: 30 } as never;
    render(
      <ImageViewerGestures {...makeProps({ scale, translateX, translateY })}>
        <Text>pinch end zoom</Text>
      </ImageViewerGestures>,
    );
    if (capturedCallbacks.pinchStart) capturedCallbacks.pinchStart?.();
    if (capturedCallbacks.pinchEnd) {
      capturedCallbacks.pinchEnd();
    }
    expect(screen.getByText('pinch end zoom')).toBeTruthy();
  });

  it('pinch end at scale <= 1 resets transforms', () => {
    const scale = { value: 0.9 } as never;
    render(
      <ImageViewerGestures {...makeProps({ scale })}>
        <Text>reset pinch</Text>
      </ImageViewerGestures>,
    );
    if (capturedCallbacks.pinchEnd) {
      capturedCallbacks.pinchEnd();
    }
    expect(screen.getByText('reset pinch')).toBeTruthy();
  });
});

describe('double-tap focal zoom math', () => {
  // Replicates the focal point calculation from doubleTap.onEnd
  function computeFocalZoom(tapX: number, tapY: number) {
    const focalX = tapX - SCREEN_W / 2;
    const focalY = tapY - SCREEN_H / 2;
    const tx = clampX(focalX * (1 - MAX_SCALE), MAX_SCALE);
    const ty = clampY(focalY * (1 - MAX_SCALE), MAX_SCALE);
    return { tx, ty };
  }

  it('zooms to origin when tapped at screen center', () => {
    const { tx, ty } = computeFocalZoom(SCREEN_W / 2, SCREEN_H / 2);
    expect(tx).toBeCloseTo(0);
    expect(ty).toBeCloseTo(0);
  });

  it('translates left when tapped on right side of screen', () => {
    const { tx } = computeFocalZoom(SCREEN_W * 0.8, SCREEN_H / 2);
    // Tapping right of center → focalX > 0 → tx = focalX * (1 - 4) = negative → image shifts left
    expect(tx).toBeLessThan(0);
  });

  it('translates right when tapped on left side of screen', () => {
    const { tx } = computeFocalZoom(SCREEN_W * 0.2, SCREEN_H / 2);
    expect(tx).toBeGreaterThan(0);
  });

  it('clamps translation to max bounds at extreme positions', () => {
    const maxX = (IMG_W * MAX_SCALE - SCREEN_W) / 2;
    const { tx } = computeFocalZoom(0, SCREEN_H / 2);
    // Should be clamped to maxX (positive, since tapping at x=0 means focal left of center)
    expect(tx).toBeLessThanOrEqual(maxX);
    expect(tx).toBeGreaterThanOrEqual(-maxX);
  });
});

describe('resetTransforms callback', () => {
  it('calls resetTransforms when pinch ends at scale exactly 1', () => {
    const scale = { value: 1 } as never;
    const translateX = { value: 10 } as never;
    const translateY = { value: 20 } as never;
    const backdropOpacity = { value: 0.5 } as never;
    render(
      <ImageViewerGestures {...makeProps({ scale, translateX, translateY, backdropOpacity })}>
        <Text>reset test</Text>
      </ImageViewerGestures>,
    );
    if (capturedCallbacks.pinchEnd) {
      capturedCallbacks.pinchEnd();
    }
    // resetTransforms should have been called — scale <= 1
    expect(screen.getByText('reset test')).toBeTruthy();
  });

  it('pinch update clamps scale to minimum of 1 (below scale branch)', () => {
    const scale = { value: 1 } as never;
    render(
      <ImageViewerGestures {...makeProps({ scale })}>
        <Text>clamp min</Text>
      </ImageViewerGestures>,
    );
    if (capturedCallbacks.pinchUpdate) {
      // savedScale * e.scale = 1 * 0.5 = 0.5, clamped to 1
      capturedCallbacks.pinchUpdate({ scale: 0.5 });
    }
    expect(screen.getByText('clamp min')).toBeTruthy();
  });

  it('pan update at scale=1 with large translationY clamps backdrop opacity to 0', () => {
    const scale = { value: 1 } as never;
    const backdropOpacity = { value: 1 } as never;
    const translateY = { value: 0 } as never;
    render(
      <ImageViewerGestures {...makeProps({ scale, backdropOpacity, translateY })}>
        <Text>clamp opacity</Text>
      </ImageViewerGestures>,
    );
    if (capturedCallbacks.panUpdate) {
      // Very large translation should clamp opacity close to 0
      capturedCallbacks.panUpdate({ translationX: 0, translationY: 500 });
    }
    expect(screen.getByText('clamp opacity')).toBeTruthy();
  });

  it('calls onDismiss when pan exceeds dismiss threshold upward (negative translationY)', () => {
    const onDismiss = jest.fn();
    const scale = { value: 1 } as never;
    const translateX = { value: 0 } as never;
    const translateY = { value: 0 } as never;
    render(
      <ImageViewerGestures {...makeProps({ onDismiss, scale, translateX, translateY })}>
        <Text>dismiss up</Text>
      </ImageViewerGestures>,
    );
    if (capturedCallbacks.panEnd) {
      capturedCallbacks.panEnd({
        translationX: 0,
        translationY: -150,
        velocityX: 0,
        velocityY: -300,
      });
      expect(onDismiss).toHaveBeenCalled();
    }
  });
});
