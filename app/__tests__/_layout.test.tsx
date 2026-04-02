jest.mock('@/i18n', () => ({
  languageReady: Promise.resolve(),
}));

jest.mock('@expo-google-fonts/exo-2', () => ({
  useFonts: jest.fn(() => [false]),
  Exo2_800ExtraBold_Italic: 'Exo2_800ExtraBold_Italic',
}));

jest.mock('expo-router', () => {
  const StackComponent = ({ children }: { children?: React.ReactNode }) => children ?? null;
  StackComponent.Screen = () => null;
  return { Stack: StackComponent };
});

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

jest.mock('@tanstack/react-query', () => ({
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@tanstack/react-query-persist-client', () => ({
  PersistQueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/lib/queryClient', () => ({
  queryClient: {},
  queryPersister: {},
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/features/notifications/usePushToken', () => ({
  usePushToken: jest.fn(),
}));

jest.mock('@/features/notifications/useNotificationHandler', () => ({
  useNotificationHandler: jest.fn(),
}));

const mockIsDark = { value: true };
jest.mock('@/theme', () => ({
  ThemeProvider: ({ children }: { children: unknown }) => children,
  useTheme: () => ({
    theme: { background: '#000', surfaceElevated: '#111' },
    colors: {},
    isDark: mockIsDark.value,
    mode: 'dark',
    setMode: jest.fn(),
  }),
}));

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import RootLayout from '../_layout';
import { useFonts } from '@expo-google-fonts/exo-2';
import * as SplashScreen from 'expo-splash-screen';

const mockUseFonts = useFonts as jest.Mock;

describe('RootLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFonts.mockReturnValue([false]);
  });

  it('renders without crashing when fonts are not loaded', () => {
    const { toJSON } = render(<RootLayout />);
    // When !fontsLoaded, returns null (i18n may or may not be ready)
    expect(toJSON()).toBeNull();
  });

  it('renders the full layout when fonts are loaded and i18n is ready', async () => {
    mockUseFonts.mockReturnValue([true]);
    // languageReady resolves asynchronously, so wait for re-render
    await waitFor(() => {
      expect(() => render(<RootLayout />)).not.toThrow();
    });
  });

  it('calls SplashScreen.hideAsync when fonts and i18n are ready', async () => {
    mockUseFonts.mockReturnValue([true]);
    render(<RootLayout />);
    await waitFor(() => {
      expect(SplashScreen.hideAsync).toHaveBeenCalled();
    });
  });

  it('does not call SplashScreen.hideAsync when fonts are not loaded', () => {
    mockUseFonts.mockReturnValue([false]);
    render(<RootLayout />);
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });

  it('renders with light StatusBar style when isDark is false', async () => {
    mockIsDark.value = false;
    mockUseFonts.mockReturnValue([true]);
    await waitFor(() => {
      expect(() => render(<RootLayout />)).not.toThrow();
    });
    mockIsDark.value = true;
  });
});
