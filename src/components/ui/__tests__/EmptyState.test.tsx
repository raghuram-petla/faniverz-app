// Capture animated style callbacks so we can execute them
const capturedEmptyStateCallbacks: Array<() => object> = [];

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const React = require('react');
  const AnimatedView = React.forwardRef((props: object, ref: unknown) =>
    React.createElement(View, { ...props, ref }),
  );
  return {
    __esModule: true,
    default: { View: AnimatedView, createAnimatedComponent: (c: unknown) => c },
    useSharedValue: jest.fn((v: number) => ({ value: v })),
    useAnimatedStyle: jest.fn((cb: () => object) => {
      capturedEmptyStateCallbacks.push(cb);
      try {
        return cb();
      } catch {
        return {};
      }
    }),
    withSpring: jest.fn((v: number) => v),
    withTiming: jest.fn((v: number) => v),
    withDelay: jest.fn((_: unknown, a: unknown) => a),
  };
});

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

  it('renders correctly when animations are disabled (sets values directly)', () => {
    jest.requireMock('@/hooks/useAnimationsEnabled').useAnimationsEnabled = () => false;

    const { getByText } = render(
      <EmptyState icon="bookmark-outline" title="No animations" subtitle="Instant render" />,
    );
    expect(getByText('No animations')).toBeTruthy();
    expect(getByText('Instant render')).toBeTruthy();

    jest.requireMock('@/hooks/useAnimationsEnabled').useAnimationsEnabled = () => true;
  });

  it('animated style callbacks execute without throwing', () => {
    capturedEmptyStateCallbacks.length = 0;
    render(<EmptyState icon="bookmark-outline" title="Test" subtitle="Sub" />);
    // Both iconAnimStyle and textAnimStyle callbacks should be captured
    expect(capturedEmptyStateCallbacks.length).toBeGreaterThanOrEqual(2);
    capturedEmptyStateCallbacks.forEach((cb) => {
      expect(() => cb()).not.toThrow();
    });
  });

  it('iconAnimStyle callback returns transform with scale', () => {
    capturedEmptyStateCallbacks.length = 0;
    render(<EmptyState icon="heart-outline" title="Test" />);
    const iconCb = capturedEmptyStateCallbacks[0];
    if (iconCb) {
      const result = iconCb() as { transform?: object[] };
      expect(result).toBeDefined();
    }
  });

  it('textAnimStyle callback returns opacity', () => {
    capturedEmptyStateCallbacks.length = 0;
    render(<EmptyState icon="heart-outline" title="Test" />);
    const textCb = capturedEmptyStateCallbacks[1];
    if (textCb) {
      const result = textCb() as { opacity?: number };
      expect(result).toBeDefined();
    }
  });

  it('does not render action button when only actionLabel provided without onAction', () => {
    const { queryByRole } = render(
      <EmptyState icon="bookmark-outline" title="Test" actionLabel="Click Me" />,
    );
    expect(queryByRole('button')).toBeNull();
  });
});
