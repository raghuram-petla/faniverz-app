import { render, screen, fireEvent } from '@testing-library/react';
import { ToggleSwitch } from '@/components/theaters/ToggleSwitch';

describe('ToggleSwitch', () => {
  it('renders as a switch role', () => {
    render(<ToggleSwitch on={false} onChange={vi.fn()} />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('has aria-checked=true when on', () => {
    render(<ToggleSwitch on={true} onChange={vi.fn()} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('has aria-checked=false when off', () => {
    render(<ToggleSwitch on={false} onChange={vi.fn()} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onChange when clicked', () => {
    const onChange = vi.fn();
    render(<ToggleSwitch on={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
