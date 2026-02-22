import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => {
  const { Text } = require('react-native');
  return {
    Tabs: Object.assign(({ children }: { children: React.ReactNode }) => children, {
      Screen: ({
        name,
        options,
      }: {
        name: string;
        options: { title: string; tabBarButtonTestID: string };
      }) => <Text testID={options.tabBarButtonTestID}>{options.title}</Text>,
    }),
  };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

jest.mock('@/theme/ThemeProvider', () => {
  const { lightColors } = require('@/theme/colors');
  return {
    useTheme: () => ({ colors: lightColors, isDark: false }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

import TabsLayout from '../_layout';

describe('TabsLayout', () => {
  it('renders 4 tabs', () => {
    render(<TabsLayout />);
    expect(screen.getByTestId('tab-calendar')).toBeTruthy();
    expect(screen.getByTestId('tab-explore')).toBeTruthy();
    expect(screen.getByTestId('tab-watchlist')).toBeTruthy();
    expect(screen.getByTestId('tab-profile')).toBeTruthy();
  });

  it('has correct tab labels', () => {
    render(<TabsLayout />);
    expect(screen.getByText('Calendar')).toBeTruthy();
    expect(screen.getByText('Explore')).toBeTruthy();
    expect(screen.getByText('Watchlist')).toBeTruthy();
    expect(screen.getByText('Profile')).toBeTruthy();
  });
});
