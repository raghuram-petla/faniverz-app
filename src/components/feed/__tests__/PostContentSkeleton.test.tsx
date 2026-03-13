import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PostContentSkeleton } from '../PostContentSkeleton';

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

describe('PostContentSkeleton', () => {
  it('renders with testID', () => {
    render(<PostContentSkeleton />);
    expect(screen.getByTestId('post-content-skeleton')).toBeTruthy();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<PostContentSkeleton />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders card section skeletons (header, title, media, actions)', () => {
    render(<PostContentSkeleton />);
    const json = JSON.stringify(screen.toJSON());
    // Card has avatar skeleton (48x48 circle)
    expect(json).toContain('skeleton-48x48-r24');
  });

  it('renders 3 comment skeletons', () => {
    render(<PostContentSkeleton />);
    const json = JSON.stringify(screen.toJSON());
    // Each comment has a 32x32 circle avatar — 3 comments
    const commentAvatarMatches = json.match(/skeleton-32x32-r16/g);
    expect(commentAvatarMatches).toHaveLength(3);
  });

  it('renders skeleton boxes for both card and comments sections', () => {
    render(<PostContentSkeleton />);
    const skeletons = screen.getAllByTestId('skeleton-box');
    // Card: avatar(1) + header text(2) + title(1) + media(1) + actions(2) = 7
    // Comments header: 1
    // 3 comments: avatar(1) + text lines(2) = 3 * 3 = 9
    // Total: 7 + 1 + 9 = 17
    expect(skeletons).toHaveLength(17);
  });
});
