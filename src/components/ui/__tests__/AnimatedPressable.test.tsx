import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { AnimatedPressable } from '../AnimatedPressable';

describe('AnimatedPressable', () => {
  it('renders children correctly', () => {
    const { getByText } = render(
      <AnimatedPressable>
        <Text>Press Me</Text>
      </AnimatedPressable>,
    );
    expect(getByText('Press Me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <AnimatedPressable onPress={onPress}>
        <Text>Press Me</Text>
      </AnimatedPressable>,
    );
    fireEvent.press(getByText('Press Me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('calls onLongPress when long-pressed', () => {
    const onLongPress = jest.fn();
    const { getByText } = render(
      <AnimatedPressable onLongPress={onLongPress}>
        <Text>Hold Me</Text>
      </AnimatedPressable>,
    );
    fireEvent(getByText('Hold Me'), 'onLongPress');
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('applies testID to the pressable', () => {
    const { getByTestId } = render(
      <AnimatedPressable testID="animated-btn">
        <Text>Test ID</Text>
      </AnimatedPressable>,
    );
    expect(getByTestId('animated-btn')).toBeTruthy();
  });

  it('applies accessibilityLabel', () => {
    const { getByLabelText } = render(
      <AnimatedPressable accessibilityLabel="Submit button">
        <Text>Submit</Text>
      </AnimatedPressable>,
    );
    expect(getByLabelText('Submit button')).toBeTruthy();
  });

  it('applies default accessibilityRole of button', () => {
    const { getByRole } = render(
      <AnimatedPressable>
        <Text>Button</Text>
      </AnimatedPressable>,
    );
    expect(getByRole('button')).toBeTruthy();
  });

  it('applies custom accessibilityRole', () => {
    const { getByRole } = render(
      <AnimatedPressable accessibilityRole="link">
        <Text>Link</Text>
      </AnimatedPressable>,
    );
    expect(getByRole('link')).toBeTruthy();
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <AnimatedPressable onPress={onPress} disabled>
        <Text>Disabled</Text>
      </AnimatedPressable>,
    );
    fireEvent.press(getByText('Disabled'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders without onPress handler (no crash)', () => {
    const { getByText } = render(
      <AnimatedPressable>
        <Text>No Handler</Text>
      </AnimatedPressable>,
    );
    expect(getByText('No Handler')).toBeTruthy();
  });

  it('applies custom style prop', () => {
    const { getByTestId } = render(
      <AnimatedPressable testID="styled-btn" style={{ backgroundColor: 'red' }}>
        <Text>Styled</Text>
      </AnimatedPressable>,
    );
    const pressable = getByTestId('styled-btn');
    // The style array should contain our custom style
    const flatStyle = Array.isArray(pressable.props.style)
      ? pressable.props.style
      : [pressable.props.style];
    const hasRedBg = flatStyle.some(
      (s: Record<string, unknown>) => s && s.backgroundColor === 'red',
    );
    expect(hasRedBg).toBe(true);
  });

  it('handles pressIn and pressOut events without crashing', () => {
    const { getByTestId } = render(
      <AnimatedPressable testID="press-events">
        <Text>Events</Text>
      </AnimatedPressable>,
    );
    const pressable = getByTestId('press-events');
    // Should not throw when pressIn/pressOut fire
    fireEvent(pressable, 'onPressIn');
    fireEvent(pressable, 'onPressOut');
  });

  it('handles pressIn without animation when animations disabled', () => {
    jest.requireMock('@/hooks/useAnimationsEnabled').useAnimationsEnabled = () => false;

    const { getByTestId } = render(
      <AnimatedPressable testID="no-anim-press" pressScale={0.9}>
        <Text>No Anim</Text>
      </AnimatedPressable>,
    );
    const pressable = getByTestId('no-anim-press');
    // Should not throw — scale set directly without withTiming
    fireEvent(pressable, 'onPressIn');
    fireEvent(pressable, 'onPressOut');

    jest.requireMock('@/hooks/useAnimationsEnabled').useAnimationsEnabled = () => true;
  });

  it('uses custom pressScale value', () => {
    const { getByTestId } = render(
      <AnimatedPressable testID="custom-scale" pressScale={0.85}>
        <Text>Custom Scale</Text>
      </AnimatedPressable>,
    );
    const pressable = getByTestId('custom-scale');
    // Fires pressIn — no crash, scale applied
    fireEvent(pressable, 'onPressIn');
    fireEvent(pressable, 'onPressOut');
  });

  it('applies accessibilityRole of none', () => {
    const { getByTestId } = render(
      <AnimatedPressable testID="none-role" accessibilityRole="none">
        <Text>None Role</Text>
      </AnimatedPressable>,
    );
    const pressable = getByTestId('none-role');
    expect(pressable.props.accessibilityRole).toBe('none');
  });

  it('renders without crashing when pressScale is at boundary (1.0)', () => {
    const { getByTestId } = render(
      <AnimatedPressable testID="boundary-scale" pressScale={1.0}>
        <Text>Boundary</Text>
      </AnimatedPressable>,
    );
    fireEvent(getByTestId('boundary-scale'), 'onPressIn');
    fireEvent(getByTestId('boundary-scale'), 'onPressOut');
  });

  it('renders without onLongPress handler (no crash)', () => {
    const { getByText } = render(
      <AnimatedPressable>
        <Text>No Long Press Handler</Text>
      </AnimatedPressable>,
    );
    expect(getByText('No Long Press Handler')).toBeTruthy();
  });
});
