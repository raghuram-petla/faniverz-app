/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ReviewsTab } from '../ReviewsTab';

jest.mock('@/styles/movieDetail.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('../EditorialReviewSection', () => ({
  EditorialReviewSection: ({
    review,
    onPollVote,
  }: {
    review: { id: string };
    onPollVote: (v: string) => void;
  }) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View testID="editorial-review-section">
        <Text>{review.id}</Text>
        <TouchableOpacity testID="editorial-poll-vote" onPress={() => onPollVote('agree')} />
      </View>
    );
  },
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
    expect(screen.getByText('Write Review')).toBeTruthy();
  });

  it('calls onWriteReview when button pressed', () => {
    const onWriteReview = jest.fn();
    render(<ReviewsTab {...baseProps} onWriteReview={onWriteReview} />);
    fireEvent.press(screen.getByText('Write Review'));
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

  it('shows empty text when there are no reviews', () => {
    render(<ReviewsTab {...baseProps} reviews={[]} />);
    expect(screen.getByText('No reviews yet. Be the first to share your thoughts!')).toBeTruthy();
  });

  it('shows fallback user name when profile is null', () => {
    const reviewNoProfile = { ...mockReview, profile: null };
    render(<ReviewsTab {...baseProps} reviews={[reviewNoProfile] as any} />);
    expect(screen.getByText('User')).toBeTruthy();
  });

  it('does not call onHelpful when userId is empty (unauthenticated)', () => {
    const onHelpful = jest.fn();
    render(<ReviewsTab {...baseProps} userId="" onHelpful={onHelpful} />);
    const helpfulBtn = screen.getByLabelText(/helpful/i);
    fireEvent.press(helpfulBtn);
    expect(onHelpful).not.toHaveBeenCalled();
  });

  it('renders review without title when title is null', () => {
    const reviewNoTitle = { ...mockReview, title: null };
    render(<ReviewsTab {...baseProps} reviews={[reviewNoTitle] as any} />);
    expect(screen.getByText('Loved the action sequences')).toBeTruthy();
    expect(screen.queryByText('Great Movie')).toBeNull();
  });

  it('renders review without body when body is null', () => {
    const reviewNoBody = { ...mockReview, body: null };
    render(<ReviewsTab {...baseProps} reviews={[reviewNoBody] as any} />);
    expect(screen.getByText('Great Movie')).toBeTruthy();
  });

  it('renders EditorialReviewSection when editorialReview and onPollVote are provided', () => {
    const onPollVote = jest.fn();
    const editorialReview = { id: 'editorial-1' } as any;
    render(<ReviewsTab {...baseProps} editorialReview={editorialReview} onPollVote={onPollVote} />);
    expect(screen.getByTestId('editorial-review-section')).toBeTruthy();
  });

  it('calls onPollVote through EditorialReviewSection', () => {
    const onPollVote = jest.fn();
    const editorialReview = { id: 'editorial-1' } as any;
    render(<ReviewsTab {...baseProps} editorialReview={editorialReview} onPollVote={onPollVote} />);
    fireEvent.press(screen.getByTestId('editorial-poll-vote'));
    expect(onPollVote).toHaveBeenCalledWith('agree');
  });

  it('does not render EditorialReviewSection when editorialReview is null', () => {
    render(<ReviewsTab {...baseProps} editorialReview={null} onPollVote={jest.fn()} />);
    expect(screen.queryByTestId('editorial-review-section')).toBeNull();
  });

  it('does not render EditorialReviewSection when onPollVote is not provided', () => {
    const editorialReview = { id: 'editorial-1' } as any;
    render(<ReviewsTab {...baseProps} editorialReview={editorialReview} />);
    expect(screen.queryByTestId('editorial-review-section')).toBeNull();
  });
});
