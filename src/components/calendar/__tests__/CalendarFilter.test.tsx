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

import CalendarFilter from '../CalendarFilter';

describe('CalendarFilter', () => {
  const onChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders 3 segments', () => {
    render(<CalendarFilter selected="all" onChange={onChange} />);
    expect(screen.getByTestId('filter-all')).toBeTruthy();
    expect(screen.getByTestId('filter-theatrical')).toBeTruthy();
    expect(screen.getByTestId('filter-ott')).toBeTruthy();
  });

  it('shows correct labels', () => {
    render(<CalendarFilter selected="all" onChange={onChange} />);
    expect(screen.getByText('All')).toBeTruthy();
    expect(screen.getByText('Theatrical')).toBeTruthy();
    expect(screen.getByText('OTT')).toBeTruthy();
  });

  it('calls onChange with theatrical when pressed', () => {
    render(<CalendarFilter selected="all" onChange={onChange} />);
    fireEvent.press(screen.getByTestId('filter-theatrical'));
    expect(onChange).toHaveBeenCalledWith('theatrical');
  });

  it('calls onChange with ott when pressed', () => {
    render(<CalendarFilter selected="all" onChange={onChange} />);
    fireEvent.press(screen.getByTestId('filter-ott'));
    expect(onChange).toHaveBeenCalledWith('ott');
  });

  it('calls onChange with all when pressed', () => {
    render(<CalendarFilter selected="theatrical" onChange={onChange} />);
    fireEvent.press(screen.getByTestId('filter-all'));
    expect(onChange).toHaveBeenCalledWith('all');
  });
});
