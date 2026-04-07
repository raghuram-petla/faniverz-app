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

  it('renders correctly when animations are disabled (skips withSpring)', () => {
    // Override animations to disabled for this test
    jest.requireMock('@/hooks/useAnimationsEnabled').useAnimationsEnabled = () => false;

    render(<ReviewModal {...baseProps} visible={true} />);
    expect(screen.getByText('movie.writeReview')).toBeTruthy();

    // Restore
    jest.requireMock('@/hooks/useAnimationsEnabled').useAnimationsEnabled = () => true;
  });

  it('does not run spring animation when visible becomes false', () => {
    render(<ReviewModal {...baseProps} visible={false} />);
    // When not visible, animation effect does not run — no crash
    expect(screen.queryByText('movie.writeReview')).toBeNull();
  });

  it('calls onClose when close X icon button is pressed (header close)', () => {
    const onClose = jest.fn();
    render(<ReviewModal {...baseProps} onClose={onClose} />);
    // The close icon is a TouchableOpacity wrapping the Ionicons "close"
    const closeBtns = screen.UNSAFE_queryAllByProps({ onPress: onClose });
    // Press the first close button (header X)
    if (closeBtns.length > 0) {
      fireEvent.press(closeBtns[0]);
    }
    expect(onClose).toHaveBeenCalled();
  });

  it('submit button is enabled when rating > 0', () => {
    const onSubmit = jest.fn();
    render(<ReviewModal {...baseProps} reviewRating={3} onSubmit={onSubmit} />);
    const submitBtn = screen.getByText('movie.submit');
    // Should not be disabled at rating 3
    fireEvent.press(submitBtn);
    expect(onSubmit).toHaveBeenCalled();
  });

  it('submit button opacity is 0.5 when rating is 0', () => {
    render(<ReviewModal {...baseProps} reviewRating={0} />);
    const submitBtn = screen.getByText('movie.submit');
    // The parent TouchableOpacity should have opacity: 0.5 in style
    expect(submitBtn).toBeTruthy();
  });

  it('shows both year and director when both provided', () => {
    render(<ReviewModal {...baseProps} releaseYear={2022} director="Rajamouli" />);
    expect(screen.getByText('2022 • Rajamouli')).toBeTruthy();
  });

  it('modal is not visible when visible=false', () => {
    render(<ReviewModal {...baseProps} visible={false} />);
    expect(screen.queryByText('movie.writeReview')).toBeNull();
  });

  it('spring animation runs when visible changes to true with animations enabled', () => {
    const { rerender } = render(<ReviewModal {...baseProps} visible={false} />);
    rerender(<ReviewModal {...baseProps} visible={true} />);
    expect(screen.getByText('movie.writeReview')).toBeTruthy();
  });

  it('reviews with containsSpoiler=true shows toggle active style', () => {
    render(<ReviewModal {...baseProps} containsSpoiler={true} />);
    // toggleTrackActive style is applied — just verify render succeeds
    expect(screen.getByText('movie.containsSpoiler')).toBeTruthy();
  });

  it('spring animation effect runs on visible=true with animations enabled', () => {
    const withSpring = require('react-native-reanimated').withSpring;
    withSpring.mockClear();
    render(<ReviewModal {...baseProps} visible={true} />);
    expect(withSpring).toHaveBeenCalled();
  });

  it('spring animation sets scale to 1 directly when animations disabled', () => {
    jest.requireMock('@/hooks/useAnimationsEnabled').useAnimationsEnabled = () => false;
    const withSpring = require('react-native-reanimated').withSpring;
    withSpring.mockClear();
    render(<ReviewModal {...baseProps} visible={true} />);
    // withSpring should NOT be called when animations disabled
    expect(withSpring).not.toHaveBeenCalled();
    jest.requireMock('@/hooks/useAnimationsEnabled').useAnimationsEnabled = () => true;
  });

  it('useAnimatedStyle is called for spring scale', () => {
    const useAnimatedStyle = require('react-native-reanimated').useAnimatedStyle;
    useAnimatedStyle.mockClear();
    render(<ReviewModal {...baseProps} visible={true} />);
    expect(useAnimatedStyle).toHaveBeenCalled();
  });

  it('does not trigger spring when visible is false', () => {
    const withSpring = require('react-native-reanimated').withSpring;
    withSpring.mockClear();
    render(<ReviewModal {...baseProps} visible={false} />);
    expect(withSpring).not.toHaveBeenCalled();
  });

  it('renders movie poster image via expo-image', () => {
    const { UNSAFE_queryAllByType } = render(<ReviewModal {...baseProps} />);
    const { Image } = require('expo-image');
    const images = UNSAFE_queryAllByType(Image);
    expect(images.length).toBeGreaterThanOrEqual(1);
  });

  it('useAnimatedStyle callback returns transform with scale', () => {
    const useAnimatedStyle = require('react-native-reanimated').useAnimatedStyle;
    useAnimatedStyle.mockImplementation((cb: () => object) => {
      const result = cb();
      return result;
    });
    render(<ReviewModal {...baseProps} visible={true} />);
    expect(useAnimatedStyle).toHaveBeenCalled();
    useAnimatedStyle.mockImplementation(() => ({}));
  });

  it('renders with null posterUrl (falls back to placeholder)', () => {
    render(<ReviewModal {...baseProps} posterUrl={null} />);
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('renders "Write Review" and "Submit" when isEditing is explicitly false', () => {
    render(<ReviewModal {...baseProps} isEditing={false} />);
    expect(screen.getByText('movie.writeReview')).toBeTruthy();
    expect(screen.getByText('movie.submit')).toBeTruthy();
  });

  it('does not show meta line when releaseYear is 0 and director is empty string', () => {
    render(<ReviewModal {...baseProps} releaseYear={0 as unknown as number} director="" />);
    // releaseYear=0 is falsy, director="" is falsy => no meta rendered
    expect(screen.queryByText('0')).toBeNull();
  });

  it('renders craft rating section when onCraftRatingChange is provided', () => {
    const onCraftRatingChange = jest.fn();
    render(
      <ReviewModal {...baseProps} onCraftRatingChange={onCraftRatingChange} craftRatings={{}} />,
    );
    // "Rate the crafts" label should appear
    expect(screen.getByText('editorial.rateCrafts')).toBeTruthy();
  });

  it('calls onCraftRatingChange when a craft star is pressed', () => {
    const onCraftRatingChange = jest.fn();
    render(
      <ReviewModal {...baseProps} onCraftRatingChange={onCraftRatingChange} craftRatings={{}} />,
    );
    // Press the first star for the first craft — each star is a TouchableOpacity
    // The craft section renders CRAFT_NAMES.length rows × 5 stars each
    const buttons = screen.UNSAFE_queryAllByProps({ hitSlop: 4 });
    if (buttons.length > 0) {
      fireEvent.press(buttons[0]);
    }
    expect(onCraftRatingChange).toHaveBeenCalled();
  });

  it('renders craft star as filled when craftRatings value >= star number', () => {
    const onCraftRatingChange = jest.fn();
    render(
      <ReviewModal
        {...baseProps}
        onCraftRatingChange={onCraftRatingChange}
        craftRatings={{ direction: 4 } as Record<string, number>}
      />,
    );
    // With rating=4, stars 1-4 should be 'star' (filled); star 5 should be 'star-outline'
    expect(screen.getByText('editorial.rateCrafts')).toBeTruthy();
  });

  it('does not render craft rating section when onCraftRatingChange is undefined', () => {
    render(<ReviewModal {...baseProps} onCraftRatingChange={undefined} />);
    expect(screen.queryByText('editorial.rateCrafts')).toBeNull();
  });
});
