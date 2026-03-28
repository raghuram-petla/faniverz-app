jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
  }),
}));

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: (props: Record<string, unknown>) =>
      require('react').createElement(View, {
        testID: 'expo-image',
        accessibilityLabel: props.accessibilityLabel,
      }),
  };
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HomeFeedHeaderChrome, HOME_FEED_HEADER_CONTENT_HEIGHT } from '../HomeFeedHeaderChrome';

describe('HomeFeedHeaderChrome', () => {
  it('renders the shared home feed header chrome', () => {
    const { getByTestId } = render(<HomeFeedHeaderChrome insetTop={44} interactive />);
    expect(getByTestId('home-feed-header-chrome')).toBeTruthy();
  });

  it('renders interactive controls when requested', () => {
    const { getByLabelText } = render(
      <HomeFeedHeaderChrome insetTop={44} interactive onSearchPress={jest.fn()} />,
    );
    expect(getByLabelText('Faniverz')).toBeTruthy();
    expect(getByLabelText('Search')).toBeTruthy();
    expect(getByLabelText('Notifications')).toBeTruthy();
  });

  it('invokes callbacks in interactive mode', () => {
    const onSearchPress = jest.fn();
    const onNotificationsPress = jest.fn();
    const { getByLabelText } = render(
      <HomeFeedHeaderChrome
        insetTop={44}
        interactive
        onSearchPress={onSearchPress}
        onNotificationsPress={onNotificationsPress}
      />,
    );

    fireEvent.press(getByLabelText('Search'));
    fireEvent.press(getByLabelText('Notifications'));

    expect(onSearchPress).toHaveBeenCalled();
    expect(onNotificationsPress).toHaveBeenCalled();
  });

  it('keeps controls out of accessibility when non-interactive', () => {
    const { queryByLabelText } = render(<HomeFeedHeaderChrome insetTop={44} interactive={false} />);
    expect(queryByLabelText('Search')).toBeNull();
    expect(queryByLabelText('Notifications')).toBeNull();
  });

  it('exports the shared header content height constant', () => {
    expect(HOME_FEED_HEADER_CONTENT_HEIGHT).toBe(52);
  });
});
