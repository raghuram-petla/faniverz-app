import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

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

import SynopsisSection from '../SynopsisSection';

describe('SynopsisSection', () => {
  it('returns null when no overview', () => {
    const { toJSON } = render(<SynopsisSection overview={null} overviewTe={null} />);
    expect(toJSON()).toBeNull();
  });

  it('renders synopsis section', () => {
    render(<SynopsisSection overview="A great movie about..." overviewTe={null} />);
    expect(screen.getByTestId('synopsis-section')).toBeTruthy();
  });

  it('shows Synopsis title', () => {
    render(<SynopsisSection overview="Overview text" overviewTe={null} />);
    expect(screen.getByText('Synopsis')).toBeTruthy();
  });

  it('shows overview text', () => {
    render(<SynopsisSection overview="Overview text here" overviewTe={null} />);
    expect(screen.getByTestId('synopsis-text')).toBeTruthy();
  });

  it('prefers Telugu overview when available', () => {
    render(<SynopsisSection overview="English text" overviewTe="తెలుగు టెక్స్ట్" />);
    expect(screen.getByText('తెలుగు టెక్స్ట్')).toBeTruthy();
  });

  it('has Read more / Read less toggle', () => {
    render(<SynopsisSection overview="Some text" overviewTe={null} />);
    expect(screen.getByText('Read more')).toBeTruthy();

    fireEvent.press(screen.getByTestId('synopsis-toggle'));
    expect(screen.getByText('Read less')).toBeTruthy();
  });
});
