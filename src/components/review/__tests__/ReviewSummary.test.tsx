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

import ReviewSummary from '../ReviewSummary';

describe('ReviewSummary', () => {
  it('renders average rating and count', () => {
    render(
      <ReviewSummary
        averageRating={4.2}
        totalCount={15}
        onWriteReview={jest.fn()}
        onSeeAll={jest.fn()}
      />
    );
    expect(screen.getByTestId('average-rating')).toHaveTextContent('4.2');
    expect(screen.getByTestId('review-count')).toHaveTextContent('(15 reviews)');
  });

  it('shows singular review text for 1 review', () => {
    render(
      <ReviewSummary
        averageRating={5}
        totalCount={1}
        onWriteReview={jest.fn()}
        onSeeAll={jest.fn()}
      />
    );
    expect(screen.getByTestId('review-count')).toHaveTextContent('(1 review)');
  });

  it('shows empty state when no reviews', () => {
    render(
      <ReviewSummary
        averageRating={0}
        totalCount={0}
        onWriteReview={jest.fn()}
        onSeeAll={jest.fn()}
      />
    );
    expect(screen.getByTestId('no-reviews')).toBeTruthy();
  });

  it('calls onWriteReview', () => {
    const onWrite = jest.fn();
    render(
      <ReviewSummary
        averageRating={0}
        totalCount={0}
        onWriteReview={onWrite}
        onSeeAll={jest.fn()}
      />
    );
    fireEvent.press(screen.getByTestId('write-review-button'));
    expect(onWrite).toHaveBeenCalled();
  });

  it('calls onSeeAll', () => {
    const onSeeAll = jest.fn();
    render(
      <ReviewSummary
        averageRating={4}
        totalCount={10}
        onWriteReview={jest.fn()}
        onSeeAll={onSeeAll}
      />
    );
    fireEvent.press(screen.getByTestId('see-all-reviews'));
    expect(onSeeAll).toHaveBeenCalled();
  });

  it('hides See All when no reviews', () => {
    render(
      <ReviewSummary
        averageRating={0}
        totalCount={0}
        onWriteReview={jest.fn()}
        onSeeAll={jest.fn()}
      />
    );
    expect(screen.queryByTestId('see-all-reviews')).toBeNull();
  });
});
