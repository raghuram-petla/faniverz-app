import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { DiscoverContentSkeleton } from '../DiscoverContentSkeleton';

jest.mock('@/components/ui/SkeletonBox', () => ({
  SkeletonBox: ({ testID, ...props }: Record<string, unknown>) => {
    const { View } = require('react-native');
    return <View testID={testID} {...props} />;
  },
}));

describe('DiscoverContentSkeleton', () => {
  it('renders with testID', () => {
    render(<DiscoverContentSkeleton />);
    expect(screen.getByTestId('discover-content-skeleton')).toBeTruthy();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<DiscoverContentSkeleton />);
    expect(toJSON()).toBeTruthy();
  });
});
