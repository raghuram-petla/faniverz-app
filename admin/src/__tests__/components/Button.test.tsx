import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/common/Button';

describe('Button', () => {
  it('renders button with children text', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('applies primary variant classes by default', () => {
    render(<Button>Go</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-red-600');
    expect(btn.className).toContain('font-semibold');
  });

  it('applies secondary variant classes', () => {
    render(<Button variant="secondary">Cancel</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-input');
    expect(btn.className).toContain('text-on-surface-muted');
  });

  it('applies danger variant classes', () => {
    render(<Button variant="danger">Delete</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-red-600/20');
    expect(btn.className).toContain('text-status-red');
  });

  it('renders icon alongside children', () => {
    render(<Button icon={<span data-testid="icon">+</span>}>Add</Button>);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('applies fullWidth class when prop is true', () => {
    render(<Button fullWidth>Wide</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('w-full');
    expect(btn.className).toContain('justify-center');
  });

  it('passes disabled prop through', () => {
    render(<Button disabled>Nope</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls onClick when clicked', () => {
    const handler = vi.fn();
    render(<Button onClick={handler}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('applies blue variant classes', () => {
    render(<Button variant="blue">Sync</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-blue-600');
    expect(btn.className).toContain('text-white');
  });

  it('applies size classes correctly', () => {
    render(<Button size="sm">Small</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('px-3');
    expect(btn.className).toContain('py-1');
    expect(btn.className).toContain('text-xs');
  });
});
