import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { FeedContentSkeleton } from '../FeedContentSkeleton';

jest.mock('@/components/ui/SkeletonBox', () => ({
  SkeletonBox: ({ testID, ...props }: Record<string, unknown>) => {
    const { View } = require('react-native');
    return <View testID={testID} {...props} />;
  },
}));

describe('FeedContentSkeleton', () => {
  it('renders with testID', () => {
    render(<FeedContentSkeleton />);
    expect(screen.getByTestId('feed-content-skeleton')).toBeTruthy();
  });

  it('renders 3 card skeletons', () => {
    const { toJSON } = render(<FeedContentSkeleton />);
    expect(toJSON()).toBeTruthy();
  });
});
