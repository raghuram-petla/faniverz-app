jest.unmock('@/theme/ThemeContext');

import React from 'react';
import { Text, LayoutAnimation } from 'react-native';
import { render, renderHook, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from '../ThemeContext';

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
});
