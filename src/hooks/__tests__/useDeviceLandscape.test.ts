import { renderHook, act } from '@testing-library/react-native';

// @contract Captures the Accelerometer listener so tests can simulate tilt events
// Variables prefixed with "mock" are allowed in jest.mock factory (hoisting rule)
let mockAccelerometerListener: ((data: { x: number; y: number; z: number }) => void) | null = null;
const mockRemove = jest.fn();

jest.mock('expo-sensors', () => ({
  Accelerometer: {
    setUpdateInterval: jest.fn(),
    addListener: jest.fn((cb) => {
      mockAccelerometerListener = cb;
      return { remove: mockRemove };
    }),
  },
}));

import { useDeviceLandscape } from '../useDeviceLandscape';
import { Accelerometer } from 'expo-sensors';
import { Platform } from 'react-native';

const emitTilt = (x: number) => {
  act(() => {
    mockAccelerometerListener?.({ x, y: 0, z: 0 });
  });
};

describe('useDeviceLandscape — iOS', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccelerometerListener = null;
    // Ensure iOS
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
  });

  it('returns 0 (portrait) initially when enabled', () => {
    const { result } = renderHook(() => useDeviceLandscape(true));
    expect(result.current).toBe(0);
  });

  it('returns 0 and does not subscribe when disabled', () => {
    const { result } = renderHook(() => useDeviceLandscape(false));
    expect(result.current).toBe(0);
    expect(Accelerometer.addListener).not.toHaveBeenCalled();
  });

  it('subscribes with the configured update interval when enabled', () => {
    renderHook(() => useDeviceLandscape(true));
    expect(Accelerometer.setUpdateInterval).toHaveBeenCalledWith(200);
    expect(Accelerometer.addListener).toHaveBeenCalled();
  });

  it('rotates to 90° when phone tilts left (iOS x < -0.6)', () => {
    const { result } = renderHook(() => useDeviceLandscape(true));
    // On iOS: nx = x = -0.8 → nx < 0 → tilt left → 90°
    emitTilt(-0.8);
    expect(result.current).toBe(90);
  });

  it('rotates to -90° when phone tilts right (iOS x > 0.6)', () => {
    const { result } = renderHook(() => useDeviceLandscape(true));
    // On iOS: nx = x = 0.8 → nx > 0 → tilt right → -90°
    emitTilt(0.8);
    expect(result.current).toBe(-90);
  });

  it('returns to 0 when tilt falls below untilt threshold', () => {
    const { result } = renderHook(() => useDeviceLandscape(true));
    emitTilt(-0.8);
    expect(result.current).toBe(90);
    // absNx = 0.2 < UNTILT_THRESHOLD (0.4) → portrait
    emitTilt(-0.2);
    expect(result.current).toBe(0);
  });

  it('stays portrait in hysteresis zone (0.4 < absNx < 0.6)', () => {
    const { result } = renderHook(() => useDeviceLandscape(true));
    // absNx = 0.5 — above UNTILT (0.4) but below TILT (0.6) from portrait → no change
    emitTilt(-0.5);
    expect(result.current).toBe(0);
  });

  it('stays landscape in hysteresis zone while already in landscape', () => {
    const { result } = renderHook(() => useDeviceLandscape(true));
    emitTilt(-0.8);
    expect(result.current).toBe(90);
    // absNx = 0.5 — between UNTILT (0.4) and TILT (0.6) while landscape → stays 90
    emitTilt(-0.5);
    expect(result.current).toBe(90);
  });

  it('flips from left landscape (90) to right landscape (-90) when direction reverses', () => {
    const { result } = renderHook(() => useDeviceLandscape(true));
    emitTilt(-0.8);
    expect(result.current).toBe(90);
    emitTilt(0.8);
    expect(result.current).toBe(-90);
  });

  it('stays at same rotation when tilt direction is unchanged while landscape', () => {
    const { result } = renderHook(() => useDeviceLandscape(true));
    emitTilt(-0.8);
    expect(result.current).toBe(90);
    // Stronger tilt in same direction — already 90, remains 90
    emitTilt(-0.9);
    expect(result.current).toBe(90);
  });

  it('resets to 0 when disabled while in landscape', () => {
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useDeviceLandscape(enabled),
      { initialProps: { enabled: true } },
    );
    emitTilt(-0.8);
    expect(result.current).toBe(90);

    rerender({ enabled: false });
    expect(result.current).toBe(0);
  });

  it('removes the subscription on cleanup', () => {
    const { unmount } = renderHook(() => useDeviceLandscape(true));
    unmount();
    expect(mockRemove).toHaveBeenCalled();
  });

  it('re-subscribes when enabled transitions from false to true', () => {
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useDeviceLandscape(enabled),
      { initialProps: { enabled: false } },
    );
    expect(Accelerometer.addListener).not.toHaveBeenCalled();
    rerender({ enabled: true });
    expect(Accelerometer.addListener).toHaveBeenCalledTimes(1);
  });
});

describe('useDeviceLandscape — Android axis inversion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccelerometerListener = null;
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
  });

  it('inverts x on Android: positive x (0.8) → nx=-0.8 → 90°', () => {
    const { result } = renderHook(() => useDeviceLandscape(true));
    // nx = -x = -0.8 → tilt left → 90°
    emitTilt(0.8);
    expect(result.current).toBe(90);
  });

  it('inverts x on Android: negative x (-0.8) → nx=0.8 → -90°', () => {
    const { result } = renderHook(() => useDeviceLandscape(true));
    // nx = -x = 0.8 → tilt right → -90°
    emitTilt(-0.8);
    expect(result.current).toBe(-90);
  });
});
