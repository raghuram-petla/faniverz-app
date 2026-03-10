import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SortDropdown, SortDropdownProps } from '../SortDropdown';

const mockStyles = new Proxy({}, { get: () => ({}) });

const defaultProps: SortDropdownProps = {
  visible: true,
  sortBy: 'popular',
  onSelectSort: jest.fn(),
  styles: mockStyles,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SortDropdown', () => {
  it('renders nothing when not visible', () => {
    const { toJSON } = render(<SortDropdown {...defaultProps} visible={false} />);
    expect(toJSON()).toBeNull();
  });

  it('renders all sort options when visible', () => {
    render(<SortDropdown {...defaultProps} />);
    expect(screen.getByText('Popular')).toBeTruthy();
    expect(screen.getByText('Rating')).toBeTruthy();
    expect(screen.getByText('Latest')).toBeTruthy();
    expect(screen.getByText('Upcoming')).toBeTruthy();
  });

  it('calls onSelectSort with correct value when option pressed', () => {
    render(<SortDropdown {...defaultProps} />);
    fireEvent.press(screen.getByText('Rating'));
    expect(defaultProps.onSelectSort).toHaveBeenCalledWith('top_rated');
  });

  it('calls onSelectSort for Latest option', () => {
    render(<SortDropdown {...defaultProps} />);
    fireEvent.press(screen.getByText('Latest'));
    expect(defaultProps.onSelectSort).toHaveBeenCalledWith('latest');
  });

  it('calls onSelectSort for Upcoming option', () => {
    render(<SortDropdown {...defaultProps} />);
    fireEvent.press(screen.getByText('Upcoming'));
    expect(defaultProps.onSelectSort).toHaveBeenCalledWith('upcoming');
  });
});
