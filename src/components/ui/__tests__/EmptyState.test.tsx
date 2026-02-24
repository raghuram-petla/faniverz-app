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
});
