import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ReviewsContentSkeleton } from '../ReviewsContentSkeleton';

jest.mock('@/components/ui/SkeletonBox', () => ({
  SkeletonBox: ({ testID, ...props }: Record<string, unknown>) => {
    const { View } = require('react-native');
    return <View testID={testID} {...props} />;
  },
}));

describe('ReviewsContentSkeleton', () => {
  it('renders with testID', () => {
    render(<ReviewsContentSkeleton />);
    expect(screen.getByTestId('reviews-content-skeleton')).toBeTruthy();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<ReviewsContentSkeleton />);
    expect(toJSON()).toBeTruthy();
  });
});
