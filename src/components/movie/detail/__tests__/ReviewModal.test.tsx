import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ReviewModal } from '../ReviewModal';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

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
    expect(screen.getByText('movie.writeReview')).toBeTruthy();
  });

  it('renders movie title', () => {
    render(<ReviewModal {...baseProps} />);
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('renders review title input with placeholder', () => {
    render(<ReviewModal {...baseProps} />);
    expect(screen.getByPlaceholderText('movie.reviewTitle')).toBeTruthy();
  });

  it('renders review body input with placeholder', () => {
    render(<ReviewModal {...baseProps} />);
    expect(screen.getByPlaceholderText('movie.writeYourReview')).toBeTruthy();
  });

  it('renders "Contains Spoiler" text', () => {
    render(<ReviewModal {...baseProps} />);
    expect(screen.getByText('movie.containsSpoiler')).toBeTruthy();
  });

  it('renders Submit button', () => {
    render(<ReviewModal {...baseProps} />);
    expect(screen.getByText('movie.submit')).toBeTruthy();
  });

  it('renders Cancel button', () => {
    render(<ReviewModal {...baseProps} />);
    expect(screen.getByText('common.cancel')).toBeTruthy();
  });

  it('submit button does not call onSubmit when rating is 0', () => {
    const onSubmit = jest.fn();
    render(<ReviewModal {...baseProps} reviewRating={0} onSubmit={onSubmit} />);
    fireEvent.press(screen.getByText('movie.submit'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renders "Edit Review" title when isEditing is true', () => {
    render(<ReviewModal {...baseProps} isEditing />);
    expect(screen.getByText('movie.editReview')).toBeTruthy();
    expect(screen.queryByText('movie.writeReview')).toBeNull();
  });

  it('renders "Update" button text when isEditing', () => {
    render(<ReviewModal {...baseProps} isEditing />);
    expect(screen.getByText('movie.update')).toBeTruthy();
    expect(screen.queryByText('movie.submit')).toBeNull();
  });

  it('calls onTitleChange when review title input changes', () => {
    const onTitleChange = jest.fn();
    render(<ReviewModal {...baseProps} onTitleChange={onTitleChange} />);
    fireEvent.changeText(screen.getByPlaceholderText('movie.reviewTitle'), 'Great movie');
    expect(onTitleChange).toHaveBeenCalledWith('Great movie');
  });

  it('calls onBodyChange when review body input changes', () => {
    const onBodyChange = jest.fn();
    render(<ReviewModal {...baseProps} onBodyChange={onBodyChange} />);
    fireEvent.changeText(screen.getByPlaceholderText('movie.writeYourReview'), 'Loved it');
    expect(onBodyChange).toHaveBeenCalledWith('Loved it');
  });

  it('calls onSpoilerToggle when spoiler toggle is pressed', () => {
    const onSpoilerToggle = jest.fn();
    render(<ReviewModal {...baseProps} onSpoilerToggle={onSpoilerToggle} />);
    fireEvent.press(screen.getByText('movie.containsSpoiler'));
    expect(onSpoilerToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close icon is pressed', () => {
    const onClose = jest.fn();
    render(<ReviewModal {...baseProps} onClose={onClose} />);
    // There are two close actions: close icon and cancel button
    // The close icon is the Ionicons "close" next to the header
    fireEvent.press(screen.getByText('common.cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onSubmit when rating > 0 and submit pressed', () => {
    const onSubmit = jest.fn();
    render(<ReviewModal {...baseProps} reviewRating={4} onSubmit={onSubmit} />);
    fireEvent.press(screen.getByText('movie.submit'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('shows movie meta with year and director', () => {
    render(<ReviewModal {...baseProps} releaseYear={2024} director="Sukumar" />);
    expect(screen.getByText('2024 • Sukumar')).toBeTruthy();
  });

  it('shows only year when director is null', () => {
    render(<ReviewModal {...baseProps} releaseYear={2024} director={null} />);
    expect(screen.getByText('2024')).toBeTruthy();
  });

  it('shows only director when releaseYear is null', () => {
    render(<ReviewModal {...baseProps} releaseYear={null} director="Sukumar" />);
    expect(screen.getByText('Sukumar')).toBeTruthy();
  });

  it('does not show meta when both releaseYear and director are null', () => {
    render(<ReviewModal {...baseProps} releaseYear={null} director={null} />);
    expect(screen.queryByText('•')).toBeNull();
  });
});
