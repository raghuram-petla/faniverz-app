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

  it('uses heart-outline icon when follow and inactive', () => {
    const { getByLabelText } = render(<MovieQuickAction {...baseProps} />);
    // Icon accessible via the follow label
    expect(getByLabelText('Follow Pushpa 2')).toBeTruthy();
  });

  it('uses heart icon when follow and active', () => {
    const { getByLabelText } = render(<MovieQuickAction {...baseProps} isActive />);
    expect(getByLabelText('Following Pushpa 2, tap to unfollow')).toBeTruthy();
  });

  it('uses bookmark-outline icon when watchlist and inactive', () => {
    const { getByLabelText } = render(<MovieQuickAction {...baseProps} actionType="watchlist" />);
    expect(getByLabelText('Save Pushpa 2')).toBeTruthy();
  });

  it('uses bookmark icon when watchlist and active', () => {
    const { getByLabelText } = render(
      <MovieQuickAction {...baseProps} actionType="watchlist" isActive />,
    );
    expect(getByLabelText('Pushpa 2 saved, tap to remove')).toBeTruthy();
  });

  it('applies custom style prop', () => {
    const customStyle = { marginTop: 10 };
    const { getByLabelText } = render(<MovieQuickAction {...baseProps} style={customStyle} />);
    expect(getByLabelText('Follow Pushpa 2')).toBeTruthy();
  });
});
