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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('CalendarFilterPanel', () => {
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
    expect(defaultProps.onSetDate).toHaveBeenCalled();
  });

  it('renders year dropdown when showYearPicker is true', () => {
    render(<CalendarFilterPanel {...defaultProps} showYearPicker={true} />);
    expect(screen.getByText('2024')).toBeTruthy();
    expect(screen.getByText('2025')).toBeTruthy();
    expect(screen.getByText('2026')).toBeTruthy();
  });

  it('does not render year dropdown when showYearPicker is false', () => {
    render(<CalendarFilterPanel {...defaultProps} showYearPicker={false} />);
    // The year values should not be visible when dropdown is closed
    // (unless one of them is the selected year displayed on the button)
    expect(screen.queryByText('2024')).toBeNull();
  });
});
