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

import ReviewCard from '../ReviewCard';
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

describe('ReviewCard', () => {
  it('renders reviewer name and rating', () => {
    render(<ReviewCard review={makeReview()} isOwn={false} />);
    expect(screen.getByTestId('reviewer-name')).toHaveTextContent('John');
    expect(screen.getByTestId('star-rating')).toBeTruthy();
  });

  it('renders review title and body', () => {
    render(<ReviewCard review={makeReview()} isOwn={false} />);
    expect(screen.getByTestId('review-title')).toHaveTextContent('Great movie');
    expect(screen.getByTestId('review-body')).toHaveTextContent('Loved every bit of it.');
  });

  it('shows spoiler blur when is_spoiler is true', () => {
    render(<ReviewCard review={makeReview({ is_spoiler: true })} isOwn={false} />);
    expect(screen.getByTestId('spoiler-blur')).toBeTruthy();
    expect(screen.queryByTestId('review-body')).toBeNull();
  });

  it('reveals spoiler on tap', () => {
    render(<ReviewCard review={makeReview({ is_spoiler: true })} isOwn={false} />);
    fireEvent.press(screen.getByTestId('spoiler-blur'));
    expect(screen.getByTestId('review-body')).toBeTruthy();
  });

  it('shows edit/delete for own review', () => {
    render(
      <ReviewCard review={makeReview()} isOwn={true} onEdit={jest.fn()} onDelete={jest.fn()} />
    );
    expect(screen.getByTestId('own-review-actions')).toBeTruthy();
    expect(screen.getByTestId('edit-review')).toBeTruthy();
    expect(screen.getByTestId('delete-review')).toBeTruthy();
  });

  it('hides edit/delete for others reviews', () => {
    render(<ReviewCard review={makeReview()} isOwn={false} />);
    expect(screen.queryByTestId('own-review-actions')).toBeNull();
  });

  it('calls onEdit and onDelete', () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    render(<ReviewCard review={makeReview()} isOwn={true} onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.press(screen.getByTestId('edit-review'));
    expect(onEdit).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('delete-review'));
    expect(onDelete).toHaveBeenCalled();
  });

  it('shows avatar initial', () => {
    render(<ReviewCard review={makeReview()} isOwn={false} />);
    expect(screen.getByTestId('reviewer-avatar')).toBeTruthy();
  });
});
