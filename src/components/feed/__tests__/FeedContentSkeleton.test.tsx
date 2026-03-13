import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { FeedContentSkeleton } from '../FeedContentSkeleton';

jest.mock('@/components/ui/SkeletonBox', () => ({
  SkeletonBox: ({ width, height, borderRadius }: Record<string, unknown>) => {
    const { View } = require('react-native');
    return (
      <View
        testID="skeleton-box"
        accessibilityLabel={`skeleton-${width}x${height}-r${borderRadius}`}
      />
    );
  },
}));

describe('FeedContentSkeleton', () => {
  it('renders with testID', () => {
    render(<FeedContentSkeleton />);
    expect(screen.getByTestId('feed-content-skeleton')).toBeTruthy();
  });

  it('renders 3 card skeletons', () => {
    const { toJSON } = render(<FeedContentSkeleton />);
    const json = JSON.stringify(toJSON());
    // Each card has an avatar skeleton (48x48 circle) — 3 cards = 3 such skeletons
    const avatarMatches = json.match(/skeleton-48x48-r24/g);
    expect(avatarMatches).toHaveLength(3);
  });

  it('renders skeleton boxes for header, badge, title, media, and actions per card', () => {
    render(<FeedContentSkeleton />);
    const skeletons = screen.getAllByTestId('skeleton-box');
    // Each card: avatar(1) + header text(2) + badge(1) + title(1) + media(1) + actions(3) = 9
    // 3 cards = 27 skeleton boxes
    expect(skeletons).toHaveLength(27);
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<FeedContentSkeleton />);
    expect(toJSON()).toBeTruthy();
  });
});
