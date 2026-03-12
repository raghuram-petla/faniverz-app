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
