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

import StarRating from '../StarRating';

describe('StarRating', () => {
  it('renders 5 stars by default', () => {
    render(<StarRating rating={3} />);
    expect(screen.getByTestId('star-rating')).toBeTruthy();
    expect(screen.getByTestId('star-1')).toBeTruthy();
    expect(screen.getByTestId('star-5')).toBeTruthy();
  });

  it('shows filled stars for rating', () => {
    render(<StarRating rating={3} />);
    expect(screen.getByTestId('star-1')).toHaveTextContent('★');
    expect(screen.getByTestId('star-3')).toHaveTextContent('★');
    expect(screen.getByTestId('star-4')).toHaveTextContent('☆');
  });

  it('calls onRatingChange in interactive mode', () => {
    const onChange = jest.fn();
    render(<StarRating rating={0} interactive onRatingChange={onChange} />);
    fireEvent.press(screen.getByTestId('star-4'));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('does not call onRatingChange in read-only mode', () => {
    const onChange = jest.fn();
    render(<StarRating rating={3} onRatingChange={onChange} />);
    fireEvent.press(screen.getByTestId('star-4'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('has correct accessibility label', () => {
    render(<StarRating rating={4} />);
    expect(screen.getByLabelText('Rating: 4 out of 5')).toBeTruthy();
  });
});
