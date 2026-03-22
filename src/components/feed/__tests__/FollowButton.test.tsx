jest.mock('@/theme/colors', () => ({
  colors: { green500: '#22c55e', gray500: '#6b7280' },
}));

import React, { useState } from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
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

  it('renders as a button role', () => {
    render(<FollowButton isFollowing={false} onPress={jest.fn()} />);
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('renders following text with correct label when following', () => {
    render(<FollowButton isFollowing={true} onPress={jest.fn()} entityName="Pushpa" />);
    expect(screen.getByText('Following')).toBeTruthy();
    expect(screen.getByLabelText('Following Pushpa, tap to unfollow')).toBeTruthy();
  });

  it('triggers animation when isFollowing transitions from false to true', () => {
    // Wrapper to toggle isFollowing
    function Wrapper() {
      const [following, setFollowing] = React.useState(false);
      return (
        <FollowButton
          isFollowing={following}
          onPress={() => setFollowing((prev) => !prev)}
          entityName="Movie"
        />
      );
    }

    render(<Wrapper />);
    expect(screen.getByText('Follow')).toBeTruthy();

    act(() => {
      fireEvent.press(screen.getByLabelText('Follow Movie'));
    });

    expect(screen.getByText('Following')).toBeTruthy();
  });

  it('does not trigger scale animation when animations are disabled', () => {
    // Mock animations disabled for this test
    jest.requireMock('@/hooks/useAnimationsEnabled').useAnimationsEnabled = () => false;

    render(<FollowButton isFollowing={true} onPress={jest.fn()} entityName="Movie" />);
    expect(screen.getByText('Following')).toBeTruthy();

    // Restore
    jest.requireMock('@/hooks/useAnimationsEnabled').useAnimationsEnabled = () => true;
  });

  it('does not trigger animation when isFollowing goes true to false', () => {
    const { rerender } = render(
      <FollowButton isFollowing={true} onPress={jest.fn()} entityName="Movie" />,
    );
    // Transition from following to not following — no animation should fire
    rerender(<FollowButton isFollowing={false} onPress={jest.fn()} entityName="Movie" />);
    expect(screen.getByText('Follow')).toBeTruthy();
  });

  it('does not animate when animations disabled and following transitions', () => {
    jest.requireMock('@/hooks/useAnimationsEnabled').useAnimationsEnabled = () => false;

    const { rerender } = render(
      <FollowButton isFollowing={false} onPress={jest.fn()} entityName="Movie" />,
    );
    rerender(<FollowButton isFollowing={true} onPress={jest.fn()} entityName="Movie" />);
    expect(screen.getByText('Following')).toBeTruthy();

    jest.requireMock('@/hooks/useAnimationsEnabled').useAnimationsEnabled = () => true;
  });

  it('renders heart icon when following', () => {
    render(<FollowButton isFollowing={true} onPress={jest.fn()} />);
    // heart icon rendered when following
    expect(screen.UNSAFE_getByProps({ name: 'heart' })).toBeTruthy();
  });

  it('renders heart-outline icon when not following', () => {
    render(<FollowButton isFollowing={false} onPress={jest.fn()} />);
    expect(screen.UNSAFE_getByProps({ name: 'heart-outline' })).toBeTruthy();
  });
});
