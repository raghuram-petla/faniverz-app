import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardItem } from '@/components/common/Card';

describe('Card', () => {
  it('renders children', () => {
    render(
      <Card>
        <p>Content</p>
      </Card>,
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('applies elevated variant by default', () => {
    const { container } = render(<Card>Hello</Card>);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('bg-surface-elevated');
    expect(div.className).toContain('rounded-xl');
  });

  it('applies bordered variant', () => {
    const { container } = render(<Card variant="bordered">Bordered</Card>);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('bg-surface-card');
    expect(div.className).toContain('border');
    expect(div.className).toContain('border-outline');
  });

  it('applies custom padding', () => {
    const { container } = render(<Card padding="lg">Big</Card>);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('p-6');
  });

  it('applies small padding', () => {
    const { container } = render(<Card padding="sm">Small</Card>);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('px-3');
    expect(div.className).toContain('py-2');
  });

  it('applies subtle variant', () => {
    const { container } = render(<Card variant="subtle">Sub</Card>);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('bg-input');
  });
});

describe('CardItem', () => {
  it('renders with flex layout class', () => {
    const { container } = render(<CardItem>Item</CardItem>);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('flex');
    expect(div.className).toContain('items-center');
    expect(div.className).toContain('gap-3');
  });

  it('renders children', () => {
    render(
      <CardItem>
        <span>Inner</span>
      </CardItem>,
    );
    expect(screen.getByText('Inner')).toBeInTheDocument();
  });
});
