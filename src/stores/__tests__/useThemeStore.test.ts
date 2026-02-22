import { renderHook, act } from '@testing-library/react-native';
import { useThemeStore } from '../useThemeStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('useThemeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: 'system' });
  });

  it('defaults to system mode', () => {
    const { result } = renderHook(() => useThemeStore());
    expect(result.current.mode).toBe('system');
  });

  it('setMode changes mode to light', () => {
    const { result } = renderHook(() => useThemeStore());
    act(() => {
      result.current.setMode('light');
    });
    expect(result.current.mode).toBe('light');
  });

  it('setMode changes mode to dark', () => {
    const { result } = renderHook(() => useThemeStore());
    act(() => {
      result.current.setMode('dark');
    });
    expect(result.current.mode).toBe('dark');
  });

  it('setMode changes mode back to system', () => {
    const { result } = renderHook(() => useThemeStore());
    act(() => {
      result.current.setMode('dark');
    });
    act(() => {
      result.current.setMode('system');
    });
    expect(result.current.mode).toBe('system');
  });
});
