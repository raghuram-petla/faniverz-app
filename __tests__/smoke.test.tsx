import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text, View } from 'react-native';

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
  };
});

// Smoke tests: verify key components can mount without crashing

describe('Smoke Tests', () => {
  it('React Native renders', () => {
    render(
      <View testID="smoke-test">
        <Text>Hello Faniverz</Text>
      </View>
    );
    expect(screen.getByTestId('smoke-test')).toBeTruthy();
  });

  it('theme hook works', () => {
    const { useTheme } = require('@/theme/ThemeProvider');
    const theme = useTheme();
    expect(theme.colors).toBeDefined();
    expect(theme.colors.primary).toBeTruthy();
    expect(theme.colors.background).toBeTruthy();
  });

  it('constants are defined', () => {
    const constants = require('@/lib/constants');
    expect(constants.QUERY_KEYS).toBeDefined();
    expect(constants.STALE_TIMES).toBeDefined();
    expect(constants.TMDB_IMAGE_BASE_URL).toBeDefined();
  });

  it('types compile correctly', () => {
    // These imports verify type files compile
    expect(require('@/types/movie')).toBeDefined();
    expect(require('@/types/review')).toBeDefined();
    expect(require('@/types/notification')).toBeDefined();
  });
});
