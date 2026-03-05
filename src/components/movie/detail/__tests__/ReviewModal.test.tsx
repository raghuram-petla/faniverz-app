import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ReviewModal } from '../ReviewModal';

jest.mock('@/styles/movieDetail.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/components/ui/StarRating', () => {
  const { View } = require('react-native');
  return { StarRating: () => <View /> };
});

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

const baseProps = {
  visible: true,
  movieTitle: 'Pushpa 2',
  posterUrl: 'https://example.com/poster.jpg',
  releaseYear: 2024,
  director: 'Sukumar',
  reviewRating: 0,
  reviewTitle: '',
  reviewBody: '',
  containsSpoiler: false,
  onRatingChange: jest.fn(),
  onTitleChange: jest.fn(),
  onBodyChange: jest.fn(),
  onSpoilerToggle: jest.fn(),
  onSubmit: jest.fn(),
  onClose: jest.fn(),
};

describe('ReviewModal', () => {
  it('renders "Write Review" modal title', () => {
    render(<ReviewModal {...baseProps} />);
    expect(screen.getByText(/Write.*Review/i)).toBeTruthy();
  });

  it('renders movie title', () => {
    render(<ReviewModal {...baseProps} />);
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('renders review title input with placeholder', () => {
    render(<ReviewModal {...baseProps} />);
    expect(screen.getByPlaceholderText(/title/i)).toBeTruthy();
  });

  it('renders review body input with placeholder', () => {
    render(<ReviewModal {...baseProps} />);
    expect(screen.getByPlaceholderText('Write your review...')).toBeTruthy();
  });

  it('renders "Contains Spoiler" text', () => {
    render(<ReviewModal {...baseProps} />);
    expect(screen.getByText(/Contains Spoiler/i)).toBeTruthy();
  });

  it('renders Submit button', () => {
    render(<ReviewModal {...baseProps} />);
    expect(screen.getByText(/Submit/i)).toBeTruthy();
  });

  it('renders Cancel button', () => {
    render(<ReviewModal {...baseProps} />);
    expect(screen.getByText(/Cancel/i)).toBeTruthy();
  });

  it('submit button does not call onSubmit when rating is 0', () => {
    const onSubmit = jest.fn();
    render(<ReviewModal {...baseProps} reviewRating={0} onSubmit={onSubmit} />);
    fireEvent.press(screen.getByText(/Submit/i));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
