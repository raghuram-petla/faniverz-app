import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ProfileListSkeleton } from '../ProfileListSkeleton';

jest.mock('@/components/ui/SkeletonBox', () => ({
  SkeletonBox: ({ testID, ...props }: Record<string, unknown>) => {
    const { View } = require('react-native');
    return <View testID={testID} {...props} />;
  },
}));

describe('ProfileListSkeleton', () => {
  it('renders with default testID', () => {
    render(<ProfileListSkeleton />);
    expect(screen.getByTestId('profile-list-skeleton')).toBeTruthy();
  });

  it('renders with custom testID', () => {
    render(<ProfileListSkeleton testID="custom-skeleton" />);
    expect(screen.getByTestId('custom-skeleton')).toBeTruthy();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<ProfileListSkeleton />);
    expect(toJSON()).toBeTruthy();
  });
});
