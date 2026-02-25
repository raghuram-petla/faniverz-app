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

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/lib/queryClient', () => ({
  queryClient: {},
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import React from 'react';
import { render } from '@testing-library/react-native';
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
    // When !fontsLoaded, returns null
    expect(toJSON()).toBeNull();
  });

  it('renders the full layout when fonts are loaded without crashing', () => {
    mockUseFonts.mockReturnValue([true]);
    // Should not throw when fonts are loaded (covers the fontsLoaded=true branch)
    expect(() => render(<RootLayout />)).not.toThrow();
  });

  it('calls SplashScreen.hideAsync when fonts finish loading', () => {
    mockUseFonts.mockReturnValue([true]);
    render(<RootLayout />);
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });

  it('does not call SplashScreen.hideAsync when fonts are not loaded', () => {
    mockUseFonts.mockReturnValue([false]);
    render(<RootLayout />);
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });
});
