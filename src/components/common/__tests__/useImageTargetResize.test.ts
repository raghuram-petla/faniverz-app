jest.mock('react-native-reanimated', () => ({
  useSharedValue: jest.fn((v: number) => ({ value: v })),
  withTiming: jest.fn((v: number) => v),
  Easing: { bezier: jest.fn(() => (t: number) => t) },
}));

import { renderHook, act } from '@testing-library/react-native';
import { useImageTargetResize } from '../useImageTargetResize';

const SCREEN_W = 390;
const SCREEN_H = 844;

describe('useImageTargetResize', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const reanimated = require('react-native-reanimated');
    reanimated.useSharedValue.mockImplementation((v: number) => ({ value: v }));
    reanimated.withTiming.mockImplementation((v: number) => v);
  });

  it('initializes dynTgtW to screenW', () => {
    const { result } = renderHook(() => useImageTargetResize(false, SCREEN_W, SCREEN_H));
    expect(result.current.dynTgtW.value).toBe(SCREEN_W);
  });

  it('initializes dynTgtH to screenW * 1.5 for portrait (non-landscape)', () => {
    const { result } = renderHook(() => useImageTargetResize(false, SCREEN_W, SCREEN_H));
    expect(result.current.dynTgtH.value).toBeCloseTo(SCREEN_W * 1.5);
  });

  it('initializes dynTgtH to screenW * 9/16 for landscape content', () => {
    const { result } = renderHook(() => useImageTargetResize(true, SCREEN_W, SCREEN_H));
    expect(result.current.dynTgtH.value).toBeCloseTo(SCREEN_W * (9 / 16));
  });

  it('handleFullImageLoad updates dimensions for a square image (wider than 2:3)', () => {
    const { result } = renderHook(() => useImageTargetResize(false, SCREEN_W, SCREEN_H));
    act(() => {
      result.current.handleFullImageLoad({
        cacheType: 'none',
        source: { url: '', width: 1080, height: 1080, mediaType: null },
      });
    });
    // Square image (aspect=1) is narrower than screen aspect, so height is constrained to screenH
    const reanimated = require('react-native-reanimated');
    expect(reanimated.withTiming).toHaveBeenCalled();
  });

  it('handleFullImageLoad does not update dimensions for landscape content', () => {
    const { result } = renderHook(() => useImageTargetResize(true, SCREEN_W, SCREEN_H));
    const reanimated = require('react-native-reanimated');
    reanimated.withTiming.mockClear();
    act(() => {
      result.current.handleFullImageLoad({
        cacheType: 'none',
        source: { url: '', width: 1920, height: 1080, mediaType: null },
      });
    });
    // isLandscape=true → skip dimension update
    expect(reanimated.withTiming).not.toHaveBeenCalled();
  });

  it('handleFullImageLoad skips update when width or height is zero', () => {
    const { result } = renderHook(() => useImageTargetResize(false, SCREEN_W, SCREEN_H));
    const reanimated = require('react-native-reanimated');
    reanimated.withTiming.mockClear();
    act(() => {
      result.current.handleFullImageLoad({
        cacheType: 'none',
        source: { url: '', width: 0, height: 0, mediaType: null },
      });
    });
    expect(reanimated.withTiming).not.toHaveBeenCalled();
  });

  it('handleFullImageLoad constrains by width for wide images', () => {
    const { result } = renderHook(() => useImageTargetResize(false, SCREEN_W, SCREEN_H));
    const reanimated = require('react-native-reanimated');
    const calls: Array<[number]> = [];
    reanimated.withTiming.mockImplementation((v: number) => {
      calls.push([v]);
      return v;
    });
    // Wide image: aspect = 2 > screenAspect (~0.46) → constrained by width
    act(() => {
      result.current.handleFullImageLoad({
        cacheType: 'none',
        source: { url: '', width: 1920, height: 960, mediaType: null },
      });
    });
    // newW = screenW, newH = screenW / 2
    expect(calls[0][0]).toBeCloseTo(SCREEN_W);
    expect(calls[1][0]).toBeCloseTo(SCREEN_W / 2);
  });

  it('handleFullImageLoad constrains by height for tall images', () => {
    const { result } = renderHook(() => useImageTargetResize(false, SCREEN_W, SCREEN_H));
    const reanimated = require('react-native-reanimated');
    const calls: Array<[number]> = [];
    reanimated.withTiming.mockImplementation((v: number) => {
      calls.push([v]);
      return v;
    });
    // Very tall image: aspect = 0.3 < screenAspect (~0.46) → constrained by height
    act(() => {
      result.current.handleFullImageLoad({
        cacheType: 'none',
        source: { url: '', width: 300, height: 1000, mediaType: null },
      });
    });
    // newH = screenH, newW = screenH * (300/1000) = screenH * 0.3
    expect(calls[0][0]).toBeCloseTo(SCREEN_H * 0.3);
    expect(calls[1][0]).toBeCloseTo(SCREEN_H);
  });
});
