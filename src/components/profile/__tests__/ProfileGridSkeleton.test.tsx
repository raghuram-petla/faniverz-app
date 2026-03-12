import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ProfileGridSkeleton } from '../ProfileGridSkeleton';

jest.mock('@/components/ui/SkeletonBox', () => ({
  SkeletonBox: ({ testID, ...props }: Record<string, unknown>) => {
    const { View } = require('react-native');
    return <View testID={testID} {...props} />;
  },
}));

describe('ProfileGridSkeleton', () => {
  it('renders with default testID', () => {
    render(<ProfileGridSkeleton />);
    expect(screen.getByTestId('profile-grid-skeleton')).toBeTruthy();
  });

  it('renders with custom testID', () => {
    render(<ProfileGridSkeleton testID="custom-grid-skeleton" />);
    expect(screen.getByTestId('custom-grid-skeleton')).toBeTruthy();
  });

  it('accepts custom cardHeight', () => {
    const { toJSON } = render(<ProfileGridSkeleton cardHeight={200} />);
    expect(toJSON()).toBeTruthy();
  });
});
