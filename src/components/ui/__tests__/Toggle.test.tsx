import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Toggle } from '../Toggle';

describe('Toggle', () => {
  it('renders in off state', () => {
    const { getByRole } = render(<Toggle value={false} onValueChange={jest.fn()} />);
    const toggle = getByRole('switch');
    expect(toggle.props.accessibilityState).toEqual({ checked: false });
  });

  it('renders in on state', () => {
    const { getByRole } = render(<Toggle value={true} onValueChange={jest.fn()} />);
    const toggle = getByRole('switch');
    expect(toggle.props.accessibilityState).toEqual({ checked: true });
  });

  it('calls onValueChange(true) when pressed while off', () => {
    const onValueChange = jest.fn();
    const { getByRole } = render(<Toggle value={false} onValueChange={onValueChange} />);
    fireEvent.press(getByRole('switch'));
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('calls onValueChange(false) when pressed while on', () => {
    const onValueChange = jest.fn();
    const { getByRole } = render(<Toggle value={true} onValueChange={onValueChange} />);
    fireEvent.press(getByRole('switch'));
    expect(onValueChange).toHaveBeenCalledWith(false);
  });
});
