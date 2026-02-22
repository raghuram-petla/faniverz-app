import React from 'react';
import { render, screen } from '@testing-library/react-native';

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

import ReleaseTypeBadge from '../ReleaseTypeBadge';

describe('ReleaseTypeBadge', () => {
  it('renders theatrical label', () => {
    render(<ReleaseTypeBadge dotType="theatrical" />);
    expect(screen.getByText('Theatrical')).toBeTruthy();
  });

  it('renders OTT premiere label', () => {
    render(<ReleaseTypeBadge dotType="ott_premiere" />);
    expect(screen.getByText('OTT Premiere')).toBeTruthy();
  });

  it('renders OTT original label', () => {
    render(<ReleaseTypeBadge dotType="ott_original" />);
    expect(screen.getByText('OTT Original')).toBeTruthy();
  });

  it('has testID', () => {
    render(<ReleaseTypeBadge dotType="theatrical" />);
    expect(screen.getByTestId('release-type-badge')).toBeTruthy();
  });
});
