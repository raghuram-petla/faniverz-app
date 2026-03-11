import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { MovieQuickAction } from '../MovieQuickAction';

describe('MovieQuickAction', () => {
  const baseProps = {
    actionType: 'follow' as const,
    isActive: false,
    onPress: jest.fn(),
    movieTitle: 'Pushpa 2',
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders follow label when actionType is follow', () => {
    render(<MovieQuickAction {...baseProps} />);
    expect(screen.getByLabelText('Follow Pushpa 2')).toBeTruthy();
  });

  it('renders following label when active follow', () => {
    render(<MovieQuickAction {...baseProps} isActive />);
    expect(screen.getByLabelText('Following Pushpa 2, tap to unfollow')).toBeTruthy();
  });

  it('renders save label when actionType is watchlist', () => {
    render(<MovieQuickAction {...baseProps} actionType="watchlist" />);
    expect(screen.getByLabelText('Save Pushpa 2')).toBeTruthy();
  });

  it('renders saved label when active watchlist', () => {
    render(<MovieQuickAction {...baseProps} actionType="watchlist" isActive />);
    expect(screen.getByLabelText('Pushpa 2 saved, tap to remove')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<MovieQuickAction {...baseProps} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText('Follow Pushpa 2'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
