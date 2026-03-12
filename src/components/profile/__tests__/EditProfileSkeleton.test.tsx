import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { EditProfileSkeleton } from '../EditProfileSkeleton';

jest.mock('@/components/ui/SkeletonBox', () => ({
  SkeletonBox: ({ testID, ...props }: Record<string, unknown>) => {
    const { View } = require('react-native');
    return <View testID={testID} {...props} />;
  },
}));

describe('EditProfileSkeleton', () => {
  it('renders with testID', () => {
    render(<EditProfileSkeleton />);
    expect(screen.getByTestId('edit-profile-skeleton')).toBeTruthy();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<EditProfileSkeleton />);
    expect(toJSON()).toBeTruthy();
  });
});
