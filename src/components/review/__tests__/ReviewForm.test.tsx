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

import ReviewForm from '../ReviewForm';

describe('ReviewForm', () => {
  const defaultProps = {
    onSubmit: jest.fn(),
    movieId: 42,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form elements', () => {
    render(<ReviewForm {...defaultProps} />);
    expect(screen.getByTestId('review-form')).toBeTruthy();
    expect(screen.getByTestId('star-rating')).toBeTruthy();
    expect(screen.getByTestId('review-title-input')).toBeTruthy();
    expect(screen.getByTestId('review-body-input')).toBeTruthy();
    expect(screen.getByTestId('spoiler-toggle')).toBeTruthy();
    expect(screen.getByTestId('submit-review')).toBeTruthy();
  });

  it('shows error when submitting without rating', () => {
    render(<ReviewForm {...defaultProps} />);
    fireEvent.press(screen.getByTestId('submit-review'));
    expect(screen.getByTestId('form-error')).toHaveTextContent('Please select a rating');
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('submits with rating only', () => {
    render(<ReviewForm {...defaultProps} />);
    fireEvent.press(screen.getByTestId('star-4'));
    fireEvent.press(screen.getByTestId('submit-review'));
    expect(defaultProps.onSubmit).toHaveBeenCalledWith({
      movie_id: 42,
      rating: 4,
      title: undefined,
      body: undefined,
      is_spoiler: false,
    });
  });

  it('submits with all fields', () => {
    render(<ReviewForm {...defaultProps} />);
    fireEvent.press(screen.getByTestId('star-5'));
    fireEvent.changeText(screen.getByTestId('review-title-input'), 'Great movie');
    fireEvent.changeText(screen.getByTestId('review-body-input'), 'Loved every scene!');
    fireEvent(screen.getByTestId('spoiler-toggle'), 'valueChange', true);
    fireEvent.press(screen.getByTestId('submit-review'));
    expect(defaultProps.onSubmit).toHaveBeenCalledWith({
      movie_id: 42,
      rating: 5,
      title: 'Great movie',
      body: 'Loved every scene!',
      is_spoiler: true,
    });
  });

  it('pre-populates for edit mode', () => {
    const existingReview = {
      id: 1,
      user_id: 'user-1',
      movie_id: 42,
      rating: 4,
      title: 'Existing title',
      body: 'Existing body',
      is_spoiler: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      profile: { display_name: 'John', avatar_url: null },
    };
    render(<ReviewForm {...defaultProps} existingReview={existingReview} />);
    expect(screen.getByTestId('review-title-input').props.value).toBe('Existing title');
    expect(screen.getByTestId('review-body-input').props.value).toBe('Existing body');
  });

  it('submits update in edit mode', () => {
    const existingReview = {
      id: 1,
      user_id: 'user-1',
      movie_id: 42,
      rating: 3,
      title: 'Old title',
      body: 'Old body',
      is_spoiler: false,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      profile: { display_name: 'John', avatar_url: null },
    };
    render(<ReviewForm {...defaultProps} existingReview={existingReview} />);
    fireEvent.press(screen.getByTestId('star-5'));
    fireEvent.press(screen.getByTestId('submit-review'));
    expect(defaultProps.onSubmit).toHaveBeenCalledWith({
      rating: 5,
      title: 'Old title',
      body: 'Old body',
      is_spoiler: false,
    });
  });

  it('shows character counts', () => {
    render(<ReviewForm {...defaultProps} />);
    expect(screen.getByTestId('title-char-count')).toHaveTextContent('0/100');
    expect(screen.getByTestId('body-char-count')).toHaveTextContent('0/2000');
    fireEvent.changeText(screen.getByTestId('review-title-input'), 'Hello');
    expect(screen.getByTestId('title-char-count')).toHaveTextContent('5/100');
  });

  it('shows disabled state when pending', () => {
    render(<ReviewForm {...defaultProps} isPending={true} />);
    expect(screen.getByTestId('submit-review').props.accessibilityState?.disabled).toBe(true);
  });
});
