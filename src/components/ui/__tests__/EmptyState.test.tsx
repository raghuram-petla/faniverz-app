import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders icon and title', () => {
    const { getByText } = render(
      <EmptyState icon="bookmark-outline" title="Your watchlist is empty" />,
    );
    expect(getByText('Your watchlist is empty')).toBeTruthy();
  });

  it('renders subtitle when provided', () => {
    const { getByText } = render(
      <EmptyState
        icon="bookmark-outline"
        title="Your watchlist is empty"
        subtitle="Start adding movies to your watchlist"
      />,
    );
    expect(getByText('Start adding movies to your watchlist')).toBeTruthy();
  });

  it('does not render subtitle when not provided', () => {
    const { queryByText } = render(
      <EmptyState icon="bookmark-outline" title="Your watchlist is empty" />,
    );
    // There should be only the title text, no subtitle
    expect(queryByText('Start adding movies')).toBeNull();
  });

  it('renders action button with actionLabel', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <EmptyState
        icon="bookmark-outline"
        title="Your watchlist is empty"
        actionLabel="Discover Movies"
        onAction={onAction}
      />,
    );
    expect(getByText('Discover Movies')).toBeTruthy();
  });

  it('does not render button when actionLabel not provided', () => {
    const { queryByRole } = render(
      <EmptyState icon="bookmark-outline" title="Your watchlist is empty" />,
    );
    expect(queryByRole('button')).toBeNull();
  });

  it('onAction is called when button pressed', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <EmptyState
        icon="bookmark-outline"
        title="Your watchlist is empty"
        actionLabel="Discover Movies"
        onAction={onAction}
      />,
    );
    fireEvent.press(getByText('Discover Movies'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('action button fires callback on multiple presses', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <EmptyState
        icon="bookmark-outline"
        title="Empty"
        actionLabel="Try Again"
        onAction={onAction}
      />,
    );
    fireEvent.press(getByText('Try Again'));
    fireEvent.press(getByText('Try Again'));
    expect(onAction).toHaveBeenCalledTimes(2);
  });

  it('does not render button when only actionLabel is provided without onAction', () => {
    const { queryByText } = render(
      <EmptyState icon="bookmark-outline" title="Empty" actionLabel="Discover Movies" />,
    );
    expect(queryByText('Discover Movies')).toBeNull();
  });

  it('does not render button when only onAction is provided without actionLabel', () => {
    const { queryByRole } = render(
      <EmptyState icon="bookmark-outline" title="Empty" onAction={jest.fn()} />,
    );
    expect(queryByRole('button')).toBeNull();
  });

  it('renders with different icon names', () => {
    const { getByText } = render(<EmptyState icon="heart-outline" title="No favorites" />);
    expect(getByText('No favorites')).toBeTruthy();
  });
});
