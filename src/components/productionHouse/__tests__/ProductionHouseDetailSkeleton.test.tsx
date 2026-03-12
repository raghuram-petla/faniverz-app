import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ProductionHouseDetailSkeleton } from '../ProductionHouseDetailSkeleton';

jest.mock('@/components/ui/SkeletonBox', () => ({
  SkeletonBox: ({ testID, ...props }: Record<string, unknown>) => {
    const { View } = require('react-native');
    return <View testID={testID} {...props} />;
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

describe('ProductionHouseDetailSkeleton', () => {
  it('renders with testID', () => {
    render(<ProductionHouseDetailSkeleton />);
    expect(screen.getByTestId('production-house-detail-skeleton')).toBeTruthy();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<ProductionHouseDetailSkeleton />);
    expect(toJSON()).toBeTruthy();
  });
});
