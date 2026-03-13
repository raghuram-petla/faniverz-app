jest.mock('@/components/ui/SkeletonBox', () => ({
  SkeletonBox: ({ testID, ...props }: Record<string, unknown>) => {
    const { View } = require('react-native');
    return <View testID={testID ?? 'skeleton-box'} {...props} />;
  },
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { DiscoverContentSkeleton } from '../DiscoverContentSkeleton';

describe('DiscoverContentSkeleton', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<DiscoverContentSkeleton />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders with testID', () => {
    render(<DiscoverContentSkeleton />);
    expect(screen.getByTestId('discover-content-skeleton')).toBeTruthy();
  });

  it('renders 6 skeleton card items', () => {
    render(<DiscoverContentSkeleton />);
    const boxes = screen.getAllByTestId('skeleton-box');
    // 6 items x 2 boxes each (poster + title) = 12
    expect(boxes.length).toBe(12);
  });
});
