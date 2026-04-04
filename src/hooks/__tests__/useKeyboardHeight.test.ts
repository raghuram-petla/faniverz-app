import { renderHook, act } from '@testing-library/react-native';
import { Keyboard, Platform } from 'react-native';
import { useKeyboardHeight } from '../useKeyboardHeight';

describe('useKeyboardHeight', () => {
  let listeners: Record<string, (e?: any) => void>;

  beforeEach(() => {
    listeners = {};
    jest.spyOn(Keyboard, 'addListener').mockImplementation((event: string, cb: any) => {
      listeners[event] = cb;
      return { remove: jest.fn() } as any;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 0 initially', () => {
    const { result } = renderHook(() => useKeyboardHeight());
    expect(result.current).toBe(0);
  });

  it('updates height on iOS keyboardWillShow', () => {
    Platform.OS = 'ios';
    const { result } = renderHook(() => useKeyboardHeight());

    act(() => {
      listeners['keyboardWillShow']?.({ endCoordinates: { height: 336 } });
    });

    expect(result.current).toBe(336);
  });

  it('resets height on iOS keyboardWillHide', () => {
    Platform.OS = 'ios';
    const { result } = renderHook(() => useKeyboardHeight());

    act(() => {
      listeners['keyboardWillShow']?.({ endCoordinates: { height: 336 } });
    });
    expect(result.current).toBe(336);

    act(() => {
      listeners['keyboardWillHide']?.();
    });
    expect(result.current).toBe(0);
  });

  it('updates height on Android keyboardDidShow', () => {
    Platform.OS = 'android';
    const { result } = renderHook(() => useKeyboardHeight());

    act(() => {
      listeners['keyboardDidShow']?.({ endCoordinates: { height: 280 } });
    });

    expect(result.current).toBe(280);
  });

  it('resets height on Android keyboardDidHide', () => {
    Platform.OS = 'android';
    const { result } = renderHook(() => useKeyboardHeight());

    act(() => {
      listeners['keyboardDidShow']?.({ endCoordinates: { height: 280 } });
    });
    act(() => {
      listeners['keyboardDidHide']?.();
    });
    expect(result.current).toBe(0);
  });

  it('cleans up listeners on unmount', () => {
    const removeSpy1 = jest.fn();
    const removeSpy2 = jest.fn();
    let callCount = 0;
    (Keyboard.addListener as jest.Mock).mockImplementation(() => {
      callCount++;
      return { remove: callCount === 1 ? removeSpy1 : removeSpy2 };
    });

    const { unmount } = renderHook(() => useKeyboardHeight());
    unmount();

    expect(removeSpy1).toHaveBeenCalled();
    expect(removeSpy2).toHaveBeenCalled();
  });
});
