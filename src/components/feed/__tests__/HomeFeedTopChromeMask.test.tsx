jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
  }),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { HomeFeedTopChromeMask } from '../HomeFeedTopChromeMask';

describe('HomeFeedTopChromeMask', () => {
  it('renders the safe area and header masks', () => {
    const { getByTestId } = render(
      <HomeFeedTopChromeMask
        topChrome={{
          variant: 'home-feed',
          insetTop: 44,
          headerContentHeight: 52,
          headerTranslateY: -12,
        }}
      />,
    );

    expect(getByTestId('image-viewer-top-safe-area-mask')).toBeTruthy();
    expect(getByTestId('image-viewer-top-chrome-mask')).toBeTruthy();
  });

  it('renders the shared header chrome during close', () => {
    const { UNSAFE_getByProps } = render(
      <HomeFeedTopChromeMask
        topChrome={{
          variant: 'home-feed',
          insetTop: 44,
          headerContentHeight: 52,
          headerTranslateY: -12,
        }}
        showHeaderChrome
      />,
    );

    expect(UNSAFE_getByProps({ testID: 'home-feed-header-chrome' })).toBeTruthy();
  });
});
