import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders the provided message', () => {
    render(<EmptyState message="No items found." />);
    expect(screen.getByText('No items found.')).toBeInTheDocument();
  });

  it('applies centered layout and subtle text color classes', () => {
    render(<EmptyState message="Nothing here." />);
    const el = screen.getByText('Nothing here.');
    expect(el.className).toContain('text-center');
    expect(el.className).toContain('py-20');
    expect(el.className).toContain('text-on-surface-subtle');
  });

  it('renders a div element', () => {
    const { container } = render(<EmptyState message="Empty." />);
    expect(container.firstChild?.nodeName).toBe('DIV');
  });
});
