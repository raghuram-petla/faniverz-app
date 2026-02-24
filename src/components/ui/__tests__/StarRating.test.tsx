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
});
