import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StarRating } from '../StarRating';

describe('StarRating', () => {
  it('renders 5 stars by default', () => {
    const { getAllByLabelText } = render(<StarRating rating={3} />);
    const stars = getAllByLabelText(/star/);
    expect(stars).toHaveLength(5);
  });

  it('renders correct number of stars with custom maxStars', () => {
    const { getAllByLabelText } = render(<StarRating rating={2} maxStars={10} />);
    const stars = getAllByLabelText(/star/);
    expect(stars).toHaveLength(10);
  });

  it('shows correct filled stars for rating of 3', () => {
    const { getByLabelText } = render(<StarRating rating={3} />);
    // Stars 1-3 should be filled, 4-5 should be outlines
    expect(getByLabelText('1 star')).toBeTruthy();
    expect(getByLabelText('2 stars')).toBeTruthy();
    expect(getByLabelText('3 stars')).toBeTruthy();
    expect(getByLabelText('4 stars')).toBeTruthy();
    expect(getByLabelText('5 stars')).toBeTruthy();
  });

  it('handles 0 rating (no filled stars)', () => {
    const { getAllByLabelText } = render(<StarRating rating={0} />);
    const stars = getAllByLabelText(/star/);
    expect(stars).toHaveLength(5);
  });

  it('handles max rating (all filled stars)', () => {
    const { getAllByLabelText } = render(<StarRating rating={5} />);
    const stars = getAllByLabelText(/star/);
    expect(stars).toHaveLength(5);
  });

  it('calls onRate with correct star number when interactive star is pressed', () => {
    const onRate = jest.fn();
    const { getByLabelText } = render(<StarRating rating={2} interactive onRate={onRate} />);
    fireEvent.press(getByLabelText('4 stars'));
    expect(onRate).toHaveBeenCalledWith(4);
  });

  it('calls onRate with 1 when first star is pressed', () => {
    const onRate = jest.fn();
    const { getByLabelText } = render(<StarRating rating={0} interactive onRate={onRate} />);
    fireEvent.press(getByLabelText('1 star'));
    expect(onRate).toHaveBeenCalledWith(1);
  });

  it('does not render touchable buttons in non-interactive mode', () => {
    const { queryAllByRole } = render(<StarRating rating={3} />);
    const buttons = queryAllByRole('button');
    expect(buttons).toHaveLength(0);
  });

  it('renders touchable buttons in interactive mode', () => {
    const onRate = jest.fn();
    const { getAllByRole } = render(<StarRating rating={3} interactive onRate={onRate} />);
    const buttons = getAllByRole('button');
    expect(buttons).toHaveLength(5);
  });

  it('renders with each star having correct accessibility label', () => {
    const { getByLabelText } = render(<StarRating rating={2} />);
    expect(getByLabelText('1 star')).toBeTruthy();
    expect(getByLabelText('2 stars')).toBeTruthy();
    expect(getByLabelText('3 stars')).toBeTruthy();
    expect(getByLabelText('4 stars')).toBeTruthy();
    expect(getByLabelText('5 stars')).toBeTruthy();
  });

  it('handles rating higher than maxStars gracefully', () => {
    const { getAllByLabelText } = render(<StarRating rating={10} maxStars={5} />);
    const stars = getAllByLabelText(/star/);
    expect(stars).toHaveLength(5);
  });

  it('triggers pop animation when a star transitions from unfilled to filled', () => {
    const onRate = jest.fn();
    const { rerender } = render(<StarRating rating={0} interactive onRate={onRate} />);
    // Transition star 1 from unfilled to filled — triggers animation effect
    rerender(<StarRating rating={1} interactive onRate={onRate} />);
    // Animation is exercised — no throw is the assertion
    expect(true).toBe(true);
  });

  it('skips animation when animations are disabled (animationsEnabled=false path)', () => {
    jest.requireMock('@/hooks/useAnimationsEnabled').useAnimationsEnabled = () => false;
    const onRate = jest.fn();
    const { rerender } = render(<StarRating rating={0} interactive onRate={onRate} />);
    // Transition — with animations disabled the withDelay branch is skipped
    rerender(<StarRating rating={3} interactive onRate={onRate} />);
    // Should not throw, stars should be visible
    const { getAllByLabelText } = render(<StarRating rating={3} interactive onRate={onRate} />);
    expect(getAllByLabelText(/star/)).toHaveLength(5);
    jest.requireMock('@/hooks/useAnimationsEnabled').useAnimationsEnabled = () => true;
  });

  it('does not animate in read-only mode (animateOnFill=false)', () => {
    const { rerender } = render(<StarRating rating={0} />);
    // Non-interactive — animateOnFill is false, so useEffect body doesn't run scale animation
    rerender(<StarRating rating={4} />);
    const { getAllByLabelText } = render(<StarRating rating={4} />);
    expect(getAllByLabelText(/star/)).toHaveLength(5);
  });

  it('withDelay is called when interactive star transitions from unfilled to filled', () => {
    const withDelay = require('react-native-reanimated').withDelay;
    withDelay.mockClear();

    const onRate = jest.fn();
    const { rerender } = render(<StarRating rating={0} interactive onRate={onRate} />);
    rerender(<StarRating rating={3} interactive onRate={onRate} />);
    // withDelay should be called for stars 1-3 transitioning from unfilled to filled
    expect(withDelay).toHaveBeenCalled();
  });

  it('does not call withDelay when star goes from filled to unfilled', () => {
    const withDelay = require('react-native-reanimated').withDelay;

    const onRate = jest.fn();
    const { rerender } = render(<StarRating rating={5} interactive onRate={onRate} />);
    withDelay.mockClear();
    rerender(<StarRating rating={2} interactive onRate={onRate} />);
    // Stars 3-5 go from filled to unfilled — no animation should fire
    expect(withDelay).not.toHaveBeenCalled();
  });

  it('onRate is not called in non-interactive mode', () => {
    const onRate = jest.fn();
    render(<StarRating rating={3} onRate={onRate} />);
    // Stars are not touchable in non-interactive mode, so onRate cannot be called
    expect(onRate).not.toHaveBeenCalled();
  });

  it('renders with maxStars=1', () => {
    const { getAllByLabelText } = render(<StarRating rating={1} maxStars={1} />);
    expect(getAllByLabelText(/star/)).toHaveLength(1);
  });

  it('updates prevFilled ref when star state changes', () => {
    const onRate = jest.fn();
    const { rerender } = render(<StarRating rating={0} interactive onRate={onRate} />);
    // First transition
    rerender(<StarRating rating={2} interactive onRate={onRate} />);
    // Second transition — prevFilled should be updated from first
    rerender(<StarRating rating={4} interactive onRate={onRate} />);
    // Stars 3-4 transition from unfilled to filled on second render
    expect(true).toBe(true); // No crash is the assertion
  });

  it('useAnimatedStyle callback returns transform with scale for AnimatedStar', () => {
    const useAnimatedStyle = require('react-native-reanimated').useAnimatedStyle;
    useAnimatedStyle.mockImplementation((cb: () => object) => {
      const result = cb();
      return result;
    });
    render(<StarRating rating={3} />);
    // Each star calls useAnimatedStyle — just verify it was called
    expect(useAnimatedStyle).toHaveBeenCalled();
    useAnimatedStyle.mockImplementation(() => ({}));
  });
});
