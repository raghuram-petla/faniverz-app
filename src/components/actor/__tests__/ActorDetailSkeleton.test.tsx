import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ActorDetailSkeleton } from '../ActorDetailSkeleton';

jest.mock('@/components/ui/SkeletonBox', () => ({
  SkeletonBox: ({ testID, ...props }: Record<string, unknown>) => {
    const { View } = require('react-native');
    return <View testID={testID} {...props} />;
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

describe('ActorDetailSkeleton', () => {
  it('renders with testID', () => {
    render(<ActorDetailSkeleton />);
    expect(screen.getByTestId('actor-detail-skeleton')).toBeTruthy();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<ActorDetailSkeleton />);
    expect(toJSON()).toBeTruthy();
  });
});
