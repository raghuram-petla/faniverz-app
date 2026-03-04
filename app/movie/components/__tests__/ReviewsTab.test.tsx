import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ReviewsTab } from '../ReviewsTab';

jest.mock('../../[id].styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/components/ui/StarRating', () => {
  const { View } = require('react-native');
  return { StarRating: () => <View /> };
});

jest.mock('@/utils/formatDate', () => ({
  formatDate: jest.fn(() => 'Dec 10, 2024'),
}));

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

const mockReview = {
  id: 'r1',
  rating: 4,
  title: 'Great Movie',
  body: 'Loved the action sequences',
  contains_spoiler: false,
  helpful_count: 5,
  created_at: '2024-12-10',
  profile: { display_name: 'MovieFan' },
};

const spoilerReview = {
  ...mockReview,
  id: 'r2',
  contains_spoiler: true,
  profile: { display_name: 'Spoilerman' },
};

const baseProps = {
  rating: 4.5,
  reviewCount: 120,
  reviews: [mockReview] as any,
  userId: 'user-1',
  onWriteReview: jest.fn(),
  onHelpful: jest.fn(),
};

describe('ReviewsTab', () => {
  it('renders rating value', () => {
    render(<ReviewsTab {...baseProps} />);
    expect(screen.getByText('4.5')).toBeTruthy();
  });

  it('renders review count', () => {
    render(<ReviewsTab {...baseProps} />);
    expect(screen.getByText(/120/)).toBeTruthy();
  });

  it('renders "Write Review" button', () => {
    render(<ReviewsTab {...baseProps} />);
    expect(screen.getByText(/Write.*Review/i)).toBeTruthy();
  });

  it('calls onWriteReview when button pressed', () => {
    const onWriteReview = jest.fn();
    render(<ReviewsTab {...baseProps} onWriteReview={onWriteReview} />);
    fireEvent.press(screen.getByText(/Write.*Review/i));
    expect(onWriteReview).toHaveBeenCalled();
  });

  it('renders review cards with user names', () => {
    render(<ReviewsTab {...baseProps} />);
    expect(screen.getByText('MovieFan')).toBeTruthy();
  });

  it('renders spoiler badge when review has spoiler', () => {
    render(<ReviewsTab {...baseProps} reviews={[spoilerReview] as any} />);
    expect(screen.getByText('Contains Spoiler')).toBeTruthy();
  });

  it('calls onHelpful with review id when helpful button pressed', () => {
    const onHelpful = jest.fn();
    render(<ReviewsTab {...baseProps} onHelpful={onHelpful} />);
    const helpfulBtn = screen.getByLabelText(/helpful/i);
    fireEvent.press(helpfulBtn);
    expect(onHelpful).toHaveBeenCalledWith('r1');
  });
});
