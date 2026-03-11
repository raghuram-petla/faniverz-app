jest.mock('@/styles/actorDetail.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/components/common/HomeButton', () => ({
  HomeButton: () => null,
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ActorCollapsibleHeader } from '../ActorCollapsibleHeader';

const makeSharedValue = (v: number) => ({ value: v });

describe('ActorCollapsibleHeader', () => {
  const defaultProps = {
    name: 'Test Actor',
    photoUrl: 'https://example.com/photo.jpg',
    scrollOffset: makeSharedValue(0) as never,
    insetTop: 44,
    onBack: jest.fn(),
  };

  it('renders back button', () => {
    render(<ActorCollapsibleHeader {...defaultProps} />);
    expect(screen.getByLabelText('Go back')).toBeTruthy();
  });

  it('calls onBack on back button press', () => {
    const onBack = jest.fn();
    render(<ActorCollapsibleHeader {...defaultProps} onBack={onBack} />);
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('renders actor name in collapsed bar', () => {
    render(<ActorCollapsibleHeader {...defaultProps} />);
    expect(screen.getByText('Test Actor')).toBeTruthy();
  });

  it('shows avatar-tap when photoUrl and onPhotoPress provided', () => {
    render(<ActorCollapsibleHeader {...defaultProps} onPhotoPress={jest.fn()} />);
    expect(screen.getByTestId('avatar-tap')).toBeTruthy();
  });

  it('calls onPhotoPress on avatar tap', () => {
    const onPhotoPress = jest.fn();
    render(<ActorCollapsibleHeader {...defaultProps} onPhotoPress={onPhotoPress} />);
    fireEvent.press(screen.getByTestId('avatar-tap'));
    expect(onPhotoPress).toHaveBeenCalled();
  });

  it('does not show avatar-tap when no onPhotoPress', () => {
    render(<ActorCollapsibleHeader {...defaultProps} />);
    expect(screen.queryByTestId('avatar-tap')).toBeNull();
  });

  it('renders rightContent when provided', () => {
    const { Text } = require('react-native');
    render(<ActorCollapsibleHeader {...defaultProps} rightContent={<Text>Follow</Text>} />);
    expect(screen.getByText('Follow')).toBeTruthy();
  });
});
