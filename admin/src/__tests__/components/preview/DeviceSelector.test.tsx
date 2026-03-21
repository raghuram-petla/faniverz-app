import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeviceSelector } from '@/components/preview/DeviceSelector';
import type { DeviceConfig } from '@shared/constants';

const mockDevices: DeviceConfig[] = [
  {
    name: 'iPhone SE',
    width: 375,
    height: 667,
    platform: 'ios',
    safeAreaTop: 20,
    safeAreaBottom: 0,
  },
  {
    name: 'iPhone 15',
    width: 393,
    height: 852,
    platform: 'ios',
    safeAreaTop: 59,
    safeAreaBottom: 34,
  },
  {
    name: 'Pixel 7',
    width: 412,
    height: 915,
    platform: 'android',
    safeAreaTop: 48,
    safeAreaBottom: 0,
  },
];

vi.mock('@shared/constants', () => ({
  DEVICES: [
    {
      name: 'iPhone SE',
      width: 375,
      height: 667,
      platform: 'ios',
      safeAreaTop: 20,
      safeAreaBottom: 0,
    },
    {
      name: 'iPhone 15',
      width: 393,
      height: 852,
      platform: 'ios',
      safeAreaTop: 59,
      safeAreaBottom: 34,
    },
    {
      name: 'Pixel 7',
      width: 412,
      height: 915,
      platform: 'android',
      safeAreaTop: 48,
      safeAreaBottom: 0,
    },
  ],
}));

const defaultProps = {
  selected: mockDevices[0],
  onChange: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

describe('DeviceSelector', () => {
  it('renders a select element', () => {
    render(<DeviceSelector {...defaultProps} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders all device options', () => {
    render(<DeviceSelector {...defaultProps} />);
    expect(screen.getByText('iPhone SE (375×667) — ios')).toBeInTheDocument();
    expect(screen.getByText('iPhone 15 (393×852) — ios')).toBeInTheDocument();
    expect(screen.getByText('Pixel 7 (412×915) — android')).toBeInTheDocument();
  });

  it('shows selected device as current value', () => {
    render(<DeviceSelector {...defaultProps} />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('iPhone SE');
  });

  it('calls onChange with correct device when selection changes', () => {
    render(<DeviceSelector {...defaultProps} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'iPhone 15' } });
    expect(defaultProps.onChange).toHaveBeenCalledWith(mockDevices[1]);
  });

  it('calls onChange with android device', () => {
    render(<DeviceSelector {...defaultProps} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Pixel 7' } });
    expect(defaultProps.onChange).toHaveBeenCalledWith(mockDevices[2]);
  });

  it('does not call onChange when selecting non-existent device', () => {
    render(<DeviceSelector {...defaultProps} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Non-existent' } });
    expect(defaultProps.onChange).not.toHaveBeenCalled();
  });
});
