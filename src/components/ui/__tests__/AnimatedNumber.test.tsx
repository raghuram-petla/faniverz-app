import React from 'react';
import { render, screen } from '@testing-library/react-native';
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
});
