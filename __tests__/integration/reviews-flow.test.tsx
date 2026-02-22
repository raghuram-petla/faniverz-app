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

// --- Unit-level integration: ReviewForm submit flow ---
import ReviewForm from '@/components/review/ReviewForm';
import ReviewCard from '@/components/review/ReviewCard';
import ReviewSummary from '@/components/review/ReviewSummary';
import StarRating from '@/components/ui/StarRating';
import type { ReviewWithProfile } from '@/features/reviews/api';

const makeReview = (overrides?: Partial<ReviewWithProfile>): ReviewWithProfile => ({
  id: 1,
  user_id: 'user-1',
  movie_id: 42,
  rating: 4,
  title: 'Great movie',
  body: 'Loved every bit of it.',
  is_spoiler: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  profile: { display_name: 'John', avatar_url: null },
  ...overrides,
});

describe('Reviews Integration Flow', () => {
  describe('Write Review → Card Display', () => {
    it('form submission produces data that ReviewCard can display', () => {
      const onSubmit = jest.fn();
      const { unmount } = render(<ReviewForm onSubmit={onSubmit} movieId={42} />);

      // Fill form
      fireEvent.press(screen.getByTestId('star-4'));
      fireEvent.changeText(screen.getByTestId('review-title-input'), 'Amazing film');
      fireEvent.changeText(
        screen.getByTestId('review-body-input'),
        'Really enjoyed watching this.'
      );
      fireEvent.press(screen.getByTestId('submit-review'));

      expect(onSubmit).toHaveBeenCalledWith({
        movie_id: 42,
        rating: 4,
        title: 'Amazing film',
        body: 'Really enjoyed watching this.',
        is_spoiler: false,
      });

      unmount();

      // Render the review that would come back from API
      const review = makeReview({
        rating: 4,
        title: 'Amazing film',
        body: 'Really enjoyed watching this.',
      });

      render(<ReviewCard review={review} isOwn={true} onEdit={jest.fn()} onDelete={jest.fn()} />);
      expect(screen.getByTestId('review-title')).toHaveTextContent('Amazing film');
      expect(screen.getByTestId('review-body')).toHaveTextContent('Really enjoyed watching this.');
    });
  });

  describe('Edit Review Flow', () => {
    it('pre-populates form and submits update data', () => {
      const existingReview = makeReview({ rating: 3, title: 'Good', body: 'OK movie' });
      const onSubmit = jest.fn();

      render(<ReviewForm existingReview={existingReview} onSubmit={onSubmit} movieId={42} />);

      // Verify pre-populated
      expect(screen.getByTestId('review-title-input').props.value).toBe('Good');
      expect(screen.getByTestId('review-body-input').props.value).toBe('OK movie');

      // Change rating and submit
      fireEvent.press(screen.getByTestId('star-5'));
      fireEvent.press(screen.getByTestId('submit-review'));

      expect(onSubmit).toHaveBeenCalledWith({
        rating: 5,
        title: 'Good',
        body: 'OK movie',
        is_spoiler: false,
      });
    });
  });

  describe('Spoiler Flow', () => {
    it('review with spoiler shows blur, tap reveals content', () => {
      const review = makeReview({ is_spoiler: true, body: 'The hero dies!' });
      render(<ReviewCard review={review} isOwn={false} />);

      // Body hidden, spoiler blur shown
      expect(screen.getByTestId('spoiler-blur')).toBeTruthy();
      expect(screen.queryByTestId('review-body')).toBeNull();

      // Tap to reveal
      fireEvent.press(screen.getByTestId('spoiler-blur'));
      expect(screen.getByTestId('review-body')).toHaveTextContent('The hero dies!');
    });
  });

  describe('ReviewSummary → Navigation', () => {
    it('triggers write and see-all callbacks', () => {
      const onWrite = jest.fn();
      const onSeeAll = jest.fn();

      render(
        <ReviewSummary
          averageRating={4.2}
          totalCount={10}
          onWriteReview={onWrite}
          onSeeAll={onSeeAll}
        />
      );

      fireEvent.press(screen.getByTestId('write-review-button'));
      expect(onWrite).toHaveBeenCalled();

      fireEvent.press(screen.getByTestId('see-all-reviews'));
      expect(onSeeAll).toHaveBeenCalled();
    });
  });

  describe('StarRating Integration', () => {
    it('interactive star selection works end-to-end', () => {
      const onChange = jest.fn();
      render(<StarRating rating={0} interactive onRatingChange={onChange} />);

      fireEvent.press(screen.getByTestId('star-3'));
      expect(onChange).toHaveBeenCalledWith(3);

      fireEvent.press(screen.getByTestId('star-5'));
      expect(onChange).toHaveBeenCalledWith(5);
    });
  });
});
