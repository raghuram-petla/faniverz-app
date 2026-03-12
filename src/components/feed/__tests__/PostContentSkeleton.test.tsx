import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PostContentSkeleton } from '../PostContentSkeleton';

jest.mock('@/components/ui/SkeletonBox', () => ({
  SkeletonBox: ({ testID, ...props }: Record<string, unknown>) => {
    const { View } = require('react-native');
    return <View testID={testID} {...props} />;
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
});
