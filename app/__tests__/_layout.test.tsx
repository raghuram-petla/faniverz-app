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

describe('RootLayout', () => {
  it('renders without crashing', () => {
    render(<RootLayout />);
  });
});
