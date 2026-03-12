import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SurpriseContentSkeleton } from '../SurpriseContentSkeleton';

jest.mock('@/components/ui/SkeletonBox', () => ({
  SkeletonBox: ({ testID, ...props }: Record<string, unknown>) => {
    const { View } = require('react-native');
    return <View testID={testID} {...props} />;
  },
}));

describe('SurpriseContentSkeleton', () => {
  it('renders with testID', () => {
    render(<SurpriseContentSkeleton />);
    expect(screen.getByTestId('surprise-content-skeleton')).toBeTruthy();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<SurpriseContentSkeleton />);
    expect(toJSON()).toBeTruthy();
  });
});
