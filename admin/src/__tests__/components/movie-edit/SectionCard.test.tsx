import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SectionCard } from '@/components/movie-edit/SectionCard';

const TestIcon = ({ className }: { className?: string }) => (
  <span data-testid="test-icon" className={className} />
);

describe('SectionCard', () => {
  it('renders title text', () => {
    render(
      <SectionCard title="Basic Info" icon={TestIcon}>
        <p>Content</p>
      </SectionCard>,
    );
    expect(screen.getByText('Basic Info')).toBeInTheDocument();
  });

  it('renders icon component', () => {
    render(
      <SectionCard title="Details" icon={TestIcon}>
        <p>Content</p>
      </SectionCard>,
    );
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <SectionCard title="Cast" icon={TestIcon}>
        <p>Cast list here</p>
      </SectionCard>,
    );
    expect(screen.getByText('Cast list here')).toBeInTheDocument();
  });

  it('renders action slot when provided', () => {
    render(
      <SectionCard
        title="Videos"
        icon={TestIcon}
        action={<button data-testid="add-btn">+ Add</button>}
      >
        <p>Videos</p>
      </SectionCard>,
    );
    expect(screen.getByTestId('add-btn')).toBeInTheDocument();
    expect(screen.getByText('+ Add')).toBeInTheDocument();
  });

  it('does not render action slot when not provided', () => {
    const { container } = render(
      <SectionCard title="Info" icon={TestIcon}>
        <p>Content</p>
      </SectionCard>,
    );
    const header = container.querySelector('.flex.items-center.justify-between');
    expect(header?.children.length).toBe(1);
  });

  it('applies correct wrapper classes', () => {
    const { container } = render(
      <SectionCard title="Test" icon={TestIcon}>
        <div />
      </SectionCard>,
    );
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain('bg-surface-muted');
    expect(wrapper?.className).toContain('rounded-xl');
    expect(wrapper?.className).toContain('p-6');
  });
});
