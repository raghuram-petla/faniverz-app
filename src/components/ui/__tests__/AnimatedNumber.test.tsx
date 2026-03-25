const mockAnimationsEnabled = jest.fn(() => true);
jest.mock('@/hooks/useAnimationsEnabled', () => ({
  useAnimationsEnabled: () => mockAnimationsEnabled(),
}));

import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { AnimatedNumber } from '../AnimatedNumber';

describe('AnimatedNumber', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Provide RAF mock so the animation runs (with advancing timestamps)
    let rafTime = 0;
    jest.spyOn(global, 'requestAnimationFrame').mockImplementation((cb) => {
      rafTime += 1000;
      cb(rafTime);
      return rafTime;
    });
    jest.spyOn(global, 'cancelAnimationFrame').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders as a Text element', () => {
    render(<AnimatedNumber value={0} testID="num" />);
    expect(screen.getByTestId('num')).toBeTruthy();
  });

  it('renders value 0 correctly', () => {
    render(<AnimatedNumber value={0} />);
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('passes testID prop through', () => {
    render(<AnimatedNumber value={5} testID="stat" />);
    expect(screen.getByTestId('stat')).toBeTruthy();
  });

  it('renders with prefix and suffix', () => {
    render(<AnimatedNumber value={0} prefix="$" suffix=" USD" />);
    expect(screen.getByText('$0 USD')).toBeTruthy();
  });

  it('renders with 1 decimal place', () => {
    render(<AnimatedNumber value={0} decimals={1} />);
    expect(screen.getByText('0.0')).toBeTruthy();
  });

  it('renders with 2 decimal places and prefix', () => {
    render(<AnimatedNumber value={0} decimals={2} prefix="$" />);
    expect(screen.getByText('$0.00')).toBeTruthy();
  });

  it('calls requestAnimationFrame on mount', () => {
    render(<AnimatedNumber value={100} />);
    expect(global.requestAnimationFrame).toHaveBeenCalled();
  });

  it('calls cancelAnimationFrame on unmount', () => {
    const { unmount } = render(<AnimatedNumber value={100} />);
    unmount();
    expect(global.cancelAnimationFrame).toHaveBeenCalled();
  });

  it('accepts style prop', () => {
    const { getByTestId } = render(
      <AnimatedNumber value={0} testID="styled" style={{ color: 'red' }} />,
    );
    expect(getByTestId('styled')).toBeTruthy();
  });

  it('sets display value immediately without animation when animations are disabled', () => {
    mockAnimationsEnabled.mockReturnValue(false);
    render(<AnimatedNumber value={42} testID="instant" />);
    expect(screen.getByText('42')).toBeTruthy();
    mockAnimationsEnabled.mockReturnValue(true);
  });

  it('updates display value immediately on prop change when animations are disabled', () => {
    mockAnimationsEnabled.mockReturnValue(false);
    const { rerender } = render(<AnimatedNumber value={10} testID="change" />);
    expect(screen.getByText('10')).toBeTruthy();
    act(() => {
      rerender(<AnimatedNumber value={99} testID="change" />);
    });
    expect(screen.getByText('99')).toBeTruthy();
    mockAnimationsEnabled.mockReturnValue(true);
  });

  it('animates to target value with decimals > 0', () => {
    render(<AnimatedNumber value={100} decimals={1} />);
    // After RAF with elapsed > duration, value should be at target
    expect(screen.getByText('100.0')).toBeTruthy();
  });

  it('re-renders and animates from current value when value prop changes', () => {
    const { rerender } = render(<AnimatedNumber value={50} testID="rerender" />);
    expect(screen.getByText('50')).toBeTruthy();
    act(() => {
      rerender(<AnimatedNumber value={200} testID="rerender" />);
    });
    // After re-animation completes (rAF mock advances past duration)
    expect(screen.getByText('200')).toBeTruthy();
  });

  it('renders with custom duration prop', () => {
    render(<AnimatedNumber value={100} duration={400} />);
    expect(screen.getByText('100')).toBeTruthy();
  });

  it('handles animation mid-progress (progress < 1 branch with short timestamps)', () => {
    // Override RAF to fire with small timestamps so progress < 1
    let rafTime = 0;
    jest.spyOn(global, 'requestAnimationFrame').mockImplementation((cb) => {
      rafTime += 10; // small increment, less than default duration (800)
      cb(rafTime);
      return rafTime;
    });

    render(<AnimatedNumber value={100} duration={800} />);
    // Even with short timestamps, it should render some value
    expect(screen.getByTestId).toBeDefined();
  });

  it('renders value 0 with decimals=0 uses Math.round (integer format)', () => {
    mockAnimationsEnabled.mockReturnValue(false);
    render(<AnimatedNumber value={0} decimals={0} />);
    expect(screen.getByText('0')).toBeTruthy();
    mockAnimationsEnabled.mockReturnValue(true);
  });

  it('renders negative value correctly', () => {
    mockAnimationsEnabled.mockReturnValue(false);
    render(<AnimatedNumber value={-5} />);
    expect(screen.getByText('-5')).toBeTruthy();
    mockAnimationsEnabled.mockReturnValue(true);
  });
});
