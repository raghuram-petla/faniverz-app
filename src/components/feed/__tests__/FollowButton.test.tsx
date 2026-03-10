jest.mock('@/theme/colors', () => ({
  colors: { green500: '#22c55e', gray500: '#6b7280' },
}));

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { FollowButton } from '../FollowButton';

describe('FollowButton', () => {
  it('renders "Follow" text when not following', () => {
    render(<FollowButton isFollowing={false} onPress={jest.fn()} />);
    expect(screen.getByText('Follow')).toBeTruthy();
  });

  it('renders "Following" text when following', () => {
    render(<FollowButton isFollowing={true} onPress={jest.fn()} />);
    expect(screen.getByText('Following')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<FollowButton isFollowing={false} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText('Follow entity'));
    expect(onPress).toHaveBeenCalled();
  });

  it('shows correct accessibility label when not following', () => {
    render(<FollowButton isFollowing={false} onPress={jest.fn()} entityName="Test Movie" />);
    expect(screen.getByLabelText('Follow Test Movie')).toBeTruthy();
  });

  it('shows correct accessibility label when following', () => {
    render(<FollowButton isFollowing={true} onPress={jest.fn()} entityName="Test Movie" />);
    expect(screen.getByLabelText('Following Test Movie, tap to unfollow')).toBeTruthy();
  });

  it('uses default entity name in accessibility label', () => {
    render(<FollowButton isFollowing={false} onPress={jest.fn()} />);
    expect(screen.getByLabelText('Follow entity')).toBeTruthy();
  });
});
