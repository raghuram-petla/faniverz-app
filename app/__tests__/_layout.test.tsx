import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => {
  const { Text } = require('react-native');
  return {
    Slot: () => <Text testID="slot">Slot</Text>,
    Redirect: ({ href }: { href: string }) => <Text testID="redirect">{href}</Text>,
  };
});

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

jest.mock('@/lib/queryClient', () => ({
  queryClient: {
    mount: jest.fn(),
    unmount: jest.fn(),
    getDefaultOptions: () => ({ queries: {} }),
  },
}));

const mockGetSession = jest.fn().mockResolvedValue({ data: { session: null } });
const mockOnAuthStateChange = jest.fn().mockReturnValue({
  data: { subscription: { unsubscribe: jest.fn() } },
});

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (cb: unknown) => mockOnAuthStateChange(cb),
    },
  },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
}));

import * as SplashScreen from 'expo-splash-screen';
import RootLayout from '../_layout';

describe('Root Layout', () => {
  it('calls preventAutoHideAsync on module load', () => {
    expect(SplashScreen.preventAutoHideAsync).toHaveBeenCalled();
  });

  it('renders providers and slot', async () => {
    render(<RootLayout />);

    await waitFor(() => {
      expect(screen.getByTestId('slot')).toBeTruthy();
    });
  });

  it('hides splash screen when auth is loaded', async () => {
    render(<RootLayout />);

    await waitFor(() => {
      expect(SplashScreen.hideAsync).toHaveBeenCalled();
    });
  });
});
