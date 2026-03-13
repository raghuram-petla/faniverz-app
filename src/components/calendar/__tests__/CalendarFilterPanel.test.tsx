jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: new Proxy({}, { get: () => '#000' }),
    mode: 'dark',
    setMode: jest.fn(),
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CalendarFilterPanel } from '../CalendarFilterPanel';

const mockStyles = new Proxy({}, { get: () => ({}) });

const defaultProps = {
  selectedYear: null as number | null,
  selectedMonth: null as number | null,
  selectedDay: null as number | null,
  years: [2024, 2025, 2026],
  showYearPicker: false,
  onToggleYearPicker: jest.fn(),
  onSetDate: jest.fn(),
  styles: mockStyles,
};

describe('CalendarFilterPanel', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders without crashing', () => {
    const { toJSON } = render(<CalendarFilterPanel {...defaultProps} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders "Year" label', () => {
    render(<CalendarFilterPanel {...defaultProps} />);
    expect(screen.getByText('Year')).toBeTruthy();
  });

  it('renders "Month" label', () => {
    render(<CalendarFilterPanel {...defaultProps} />);
    expect(screen.getByText('Month')).toBeTruthy();
  });

  it('renders "Day" label', () => {
    render(<CalendarFilterPanel {...defaultProps} />);
    expect(screen.getByText('Day')).toBeTruthy();
  });

  it('renders "All Years" button when no year selected', () => {
    render(<CalendarFilterPanel {...defaultProps} />);
    expect(screen.getByText('All Years')).toBeTruthy();
  });

  it('renders selected year when year is set', () => {
    render(<CalendarFilterPanel {...defaultProps} selectedYear={2025} />);
    expect(screen.getByText('2025')).toBeTruthy();
  });

  it('renders all 12 month abbreviations', () => {
    render(<CalendarFilterPanel {...defaultProps} />);
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    for (const month of months) {
      expect(screen.getByText(month)).toBeTruthy();
    }
  });

  it('calls onToggleYearPicker when year button pressed', () => {
    render(<CalendarFilterPanel {...defaultProps} />);
    fireEvent.press(screen.getByText('All Years'));
    expect(defaultProps.onToggleYearPicker).toHaveBeenCalled();
  });

  it('calls onSetDate when month button pressed', () => {
    render(<CalendarFilterPanel {...defaultProps} />);
    fireEvent.press(screen.getByText('Mar'));
    expect(defaultProps.onSetDate).toHaveBeenCalledWith(null, 2, null);
  });

  it('toggles month off when pressing already-selected month', () => {
    render(<CalendarFilterPanel {...defaultProps} selectedMonth={2} />);
    fireEvent.press(screen.getByText('Mar'));
    expect(defaultProps.onSetDate).toHaveBeenCalledWith(null, null, null);
  });

  it('renders year dropdown when showYearPicker is true', () => {
    render(<CalendarFilterPanel {...defaultProps} showYearPicker={true} />);
    expect(screen.getByText('2024')).toBeTruthy();
    expect(screen.getByText('2025')).toBeTruthy();
    expect(screen.getByText('2026')).toBeTruthy();
  });

  it('renders "All Years" option in dropdown', () => {
    render(<CalendarFilterPanel {...defaultProps} showYearPicker={true} />);
    // There are two "All Years" texts: button + dropdown option
    const allYears = screen.getAllByText('All Years');
    expect(allYears.length).toBeGreaterThanOrEqual(2);
  });

  it('does not render year dropdown when showYearPicker is false', () => {
    render(<CalendarFilterPanel {...defaultProps} showYearPicker={false} />);
    expect(screen.queryByText('2024')).toBeNull();
  });

  it('selects year from dropdown', () => {
    render(<CalendarFilterPanel {...defaultProps} showYearPicker={true} />);
    fireEvent.press(screen.getByText('2025'));
    expect(defaultProps.onSetDate).toHaveBeenCalledWith(2025, null, null);
    expect(defaultProps.onToggleYearPicker).toHaveBeenCalled();
  });

  it('renders days 1-31 when no month selected', () => {
    render(<CalendarFilterPanel {...defaultProps} />);
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('31')).toBeTruthy();
  });

  it('renders correct number of days for February', () => {
    render(<CalendarFilterPanel {...defaultProps} selectedYear={2024} selectedMonth={1} />);
    expect(screen.getByText('29')).toBeTruthy();
    expect(screen.queryByText('30')).toBeNull();
  });

  it('calls onSetDate with day when day button pressed', () => {
    render(<CalendarFilterPanel {...defaultProps} />);
    fireEvent.press(screen.getByText('15'));
    expect(defaultProps.onSetDate).toHaveBeenCalledWith(null, null, 15);
  });

  it('toggles day off when pressing already-selected day', () => {
    render(<CalendarFilterPanel {...defaultProps} selectedDay={15} />);
    fireEvent.press(screen.getByText('15'));
    expect(defaultProps.onSetDate).toHaveBeenCalledWith(null, null, null);
  });
});
