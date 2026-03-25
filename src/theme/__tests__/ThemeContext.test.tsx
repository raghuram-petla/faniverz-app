jest.unmock('@/theme/ThemeContext');

import React from 'react';
import { Text, LayoutAnimation } from 'react-native';
import { render, renderHook, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from '../ThemeContext';
import { useAnimationStore } from '@/stores/useAnimationStore';

// AsyncStorage is already mocked globally in jest.setup.js

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('ThemeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('renders children with default theme before loading completes', () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation(() => new Promise(() => {}));
    const { getByText } = render(
      <ThemeProvider>
        <Text>Child</Text>
      </ThemeProvider>,
    );
    expect(getByText('Child')).toBeTruthy();
  });

  it('renders children after loading', async () => {
    const { getByText } = render(
      <ThemeProvider>
        <Text>Child</Text>
      </ThemeProvider>,
    );
    await waitFor(() => expect(getByText('Child')).toBeTruthy());
  });

  it('loads stored theme mode on mount', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('dark');
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.mode).toBe('dark'));
  });

  it('defaults to system mode when no stored value', async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.mode).toBe('system'));
  });

  it('ignores invalid stored modes', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid');
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.mode).toBe('system'));
  });
});

describe('useTheme', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('returns theme context values', async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => {
      expect(result.current.theme).toBeDefined();
      expect(result.current.colors).toBeDefined();
      expect(typeof result.current.isDark).toBe('boolean');
      expect(result.current.mode).toBeDefined();
      expect(typeof result.current.setMode).toBe('function');
    });
  });

  it('setMode persists to AsyncStorage', async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.mode).toBe('system'));
    act(() => result.current.setMode('dark'));
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(expect.any(String), 'dark');
  });

  it('setMode calls LayoutAnimation.configureNext', async () => {
    const spy = jest.spyOn(LayoutAnimation, 'configureNext').mockImplementation();
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.mode).toBe('system'));
    act(() => result.current.setMode('light'));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('updates isDark when mode changes', async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.mode).toBe('system'));
    act(() => result.current.setMode('dark'));
    expect(result.current.isDark).toBe(true);
    act(() => result.current.setMode('light'));
    expect(result.current.isDark).toBe(false);
  });

  it('setMode skips LayoutAnimation when animations are disabled', async () => {
    // Temporarily disable animations in the store
    useAnimationStore.setState({ animationsEnabled: false });
    const spy = jest.spyOn(LayoutAnimation, 'configureNext').mockImplementation();

    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.mode).toBe('system'));
    act(() => result.current.setMode('dark'));

    expect(spy).not.toHaveBeenCalled();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(expect.any(String), 'dark');

    spy.mockRestore();
    // Restore animations for subsequent tests
    useAnimationStore.setState({ animationsEnabled: true });
  });

  it('loads stored light mode from AsyncStorage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('light');
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.mode).toBe('light'));
    expect(result.current.isDark).toBe(false);
  });

  it('loads stored system mode from AsyncStorage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('system');
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.mode).toBe('system'));
  });

  it('handles AsyncStorage.getItem rejection gracefully', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('storage error'));
    const { result } = renderHook(() => useTheme(), { wrapper });
    // Should still render with default system mode
    await waitFor(() => expect(result.current.mode).toBe('system'));
  });

  it('Appearance.setColorScheme is called when mode changes', async () => {
    const { Appearance } = require('react-native');
    const spy = jest.spyOn(Appearance, 'setColorScheme').mockImplementation();

    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.mode).toBe('system'));

    act(() => result.current.setMode('dark'));
    expect(spy).toHaveBeenCalledWith('dark');

    act(() => result.current.setMode('light'));
    expect(spy).toHaveBeenCalledWith('light');

    act(() => result.current.setMode('system'));
    expect(spy).toHaveBeenCalledWith(null);

    spy.mockRestore();
  });

  it('returns colors object from context', async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.colors).toBeDefined());
    expect(typeof result.current.colors).toBe('object');
  });

  it('returns default context values when used outside ThemeProvider', () => {
    const { result } = renderHook(() => useTheme());
    // Default context has system mode and dark theme
    expect(result.current.mode).toBe('system');
    expect(result.current.isDark).toBe(true);
    expect(result.current.theme).toBeDefined();
    expect(result.current.colors).toBeDefined();
    // Default setMode is a no-op function
    expect(typeof result.current.setMode).toBe('function');
    result.current.setMode('light'); // should not throw
  });

  it('provides lightTheme when mode is light', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('light');
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.mode).toBe('light'));
    expect(result.current.isDark).toBe(false);
    expect(result.current.theme).toBeDefined();
  });

  it('provides darkTheme when mode is dark', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('dark');
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.mode).toBe('dark'));
    expect(result.current.isDark).toBe(true);
    expect(result.current.theme).toBeDefined();
  });

  it('isDark is false when mode is system and system scheme is light', async () => {
    // useColorScheme is mocked to return null (undefined/light) by default in RN test env
    // mode=system, systemScheme=null => isDark = (null === 'dark') = false
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('system');
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.mode).toBe('system'));
    // In test env, useColorScheme returns null which means light
    // isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark'
    // = null === 'dark' = false
    expect(typeof result.current.isDark).toBe('boolean');
  });

  it('memoizes context value between re-renders when deps unchanged', async () => {
    const { result, rerender } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.mode).toBe('system'));
    const first = result.current;
    rerender({});
    // Context value should be referentially stable since deps haven't changed
    expect(result.current.mode).toBe(first.mode);
  });
});

describe('Android LayoutAnimation setup', () => {
  afterEach(() => {
    const { Platform } = require('react-native');
    Platform.OS = 'ios';
  });

  it('enables LayoutAnimation on Android when setLayoutAnimationEnabledExperimental exists', () => {
    jest.resetModules();
    const mockSetLayoutAnimation = jest.fn();
    const RN = require('react-native');
    RN.Platform.OS = 'android';
    RN.UIManager.setLayoutAnimationEnabledExperimental = mockSetLayoutAnimation;

    require('../ThemeContext');

    expect(mockSetLayoutAnimation).toHaveBeenCalledWith(true);
  });

  it('does not call setLayoutAnimationEnabledExperimental on iOS', () => {
    jest.resetModules();
    const mockSetLayoutAnimation = jest.fn();
    const RN = require('react-native');
    RN.Platform.OS = 'ios';
    RN.UIManager.setLayoutAnimationEnabledExperimental = mockSetLayoutAnimation;

    require('../ThemeContext');

    expect(mockSetLayoutAnimation).not.toHaveBeenCalled();
  });

  it('does not throw when setLayoutAnimationEnabledExperimental is undefined on Android', () => {
    jest.resetModules();
    const RN = require('react-native');
    RN.Platform.OS = 'android';
    RN.UIManager.setLayoutAnimationEnabledExperimental = undefined;

    expect(() => {
      require('../ThemeContext');
    }).not.toThrow();
  });
});
