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

import CalendarDay from '../CalendarDay';

describe('CalendarDay', () => {
  const defaultProps = {
    day: 15,
    isToday: false,
    isSelected: false,
    isCurrentMonth: true,
    dots: [] as ('theatrical' | 'ott_premiere' | 'ott_original')[],
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders day number', () => {
    render(<CalendarDay {...defaultProps} />);
    expect(screen.getByText('15')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    render(<CalendarDay {...defaultProps} />);
    fireEvent.press(screen.getByTestId('calendar-day-15'));
    expect(defaultProps.onPress).toHaveBeenCalledTimes(1);
  });

  it('shows gold dot for theatrical', () => {
    render(<CalendarDay {...defaultProps} dots={['theatrical']} />);
    expect(screen.getByTestId('dot-theatrical')).toBeTruthy();
  });

  it('shows blue dot for OTT premiere', () => {
    render(<CalendarDay {...defaultProps} dots={['ott_premiere']} />);
    expect(screen.getByTestId('dot-ott_premiere')).toBeTruthy();
  });

  it('shows purple dot for OTT original', () => {
    render(<CalendarDay {...defaultProps} dots={['ott_original']} />);
    expect(screen.getByTestId('dot-ott_original')).toBeTruthy();
  });

  it('shows multiple dots for same day', () => {
    render(<CalendarDay {...defaultProps} dots={['theatrical', 'ott_premiere']} />);
    expect(screen.getByTestId('dot-theatrical')).toBeTruthy();
    expect(screen.getByTestId('dot-ott_premiere')).toBeTruthy();
  });

  it('deduplicates dot types', () => {
    render(<CalendarDay {...defaultProps} dots={['theatrical', 'theatrical']} />);
    expect(screen.getByTestId('dots-15')).toBeTruthy();
    // Should only render one dot even with duplicate types
    expect(screen.getAllByTestId('dot-theatrical')).toHaveLength(1);
  });

  it('shows no dots when empty', () => {
    render(<CalendarDay {...defaultProps} dots={[]} />);
    expect(screen.queryByTestId('dots-15')).toBeNull();
  });
});
