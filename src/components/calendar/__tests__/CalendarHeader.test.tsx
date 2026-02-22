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

import CalendarHeader from '../CalendarHeader';

describe('CalendarHeader', () => {
  const onPrev = jest.fn();
  const onNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders month and year', () => {
    render(<CalendarHeader month={1} year={2026} onPrev={onPrev} onNext={onNext} />);
    expect(screen.getByTestId('month-year')).toBeTruthy();
    expect(screen.getByText('February 2026')).toBeTruthy();
  });

  it('calls onPrev when left arrow pressed', () => {
    render(<CalendarHeader month={0} year={2026} onPrev={onPrev} onNext={onNext} />);
    fireEvent.press(screen.getByTestId('prev-month'));
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it('calls onNext when right arrow pressed', () => {
    render(<CalendarHeader month={0} year={2026} onPrev={onPrev} onNext={onNext} />);
    fireEvent.press(screen.getByTestId('next-month'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('shows correct month names', () => {
    const { rerender } = render(
      <CalendarHeader month={0} year={2026} onPrev={onPrev} onNext={onNext} />
    );
    expect(screen.getByText('January 2026')).toBeTruthy();

    rerender(<CalendarHeader month={11} year={2025} onPrev={onPrev} onNext={onNext} />);
    expect(screen.getByText('December 2025')).toBeTruthy();
  });
});
