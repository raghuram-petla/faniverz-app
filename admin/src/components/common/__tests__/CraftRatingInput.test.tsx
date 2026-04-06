import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

import { CraftRatingInput } from '@/components/common/CraftRatingInput';

describe('CraftRatingInput', () => {
  const defaultProps = {
    label: 'Story',
    value: 0,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the label text', () => {
    render(<CraftRatingInput {...defaultProps} />);
    expect(screen.getByText('Story')).toBeInTheDocument();
  });

  it('renders 5 star buttons', () => {
    render(<CraftRatingInput {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);
  });

  it('each star button has an accessible aria-label', () => {
    render(<CraftRatingInput {...defaultProps} />);
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByLabelText(`Rate Story ${i} stars`)).toBeInTheDocument();
    }
  });

  it('shows dash when value is 0', () => {
    render(<CraftRatingInput {...defaultProps} value={0} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('shows numeric value when value is set', () => {
    render(<CraftRatingInput {...defaultProps} value={3} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('highlights stars up to the current value', () => {
    const { container } = render(<CraftRatingInput {...defaultProps} value={3} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(5);

    // First 3 stars should be filled (yellow)
    for (let i = 0; i < 3; i++) {
      expect(svgs[i].className.baseVal || svgs[i].getAttribute('class')).toContain(
        'fill-yellow-400',
      );
    }
    // Last 2 stars should be unfilled (disabled)
    for (let i = 3; i < 5; i++) {
      expect(svgs[i].className.baseVal || svgs[i].getAttribute('class')).toContain('fill-none');
    }
  });

  it('highlights all 5 stars when value is 5', () => {
    const { container } = render(<CraftRatingInput {...defaultProps} value={5} />);
    const svgs = container.querySelectorAll('svg');

    for (let i = 0; i < 5; i++) {
      expect(svgs[i].className.baseVal || svgs[i].getAttribute('class')).toContain(
        'fill-yellow-400',
      );
    }
  });

  it('highlights no stars when value is 0', () => {
    const { container } = render(<CraftRatingInput {...defaultProps} value={0} />);
    const svgs = container.querySelectorAll('svg');

    for (let i = 0; i < 5; i++) {
      expect(svgs[i].className.baseVal || svgs[i].getAttribute('class')).toContain('fill-none');
    }
  });

  it('calls onChange with the clicked star number', () => {
    const onChange = vi.fn();
    render(<CraftRatingInput {...defaultProps} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('Rate Story 3 stars'));
    expect(onChange).toHaveBeenCalledWith(3);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('calls onChange with 1 when first star is clicked', () => {
    const onChange = vi.fn();
    render(<CraftRatingInput {...defaultProps} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('Rate Story 1 stars'));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('calls onChange with 5 when last star is clicked', () => {
    const onChange = vi.fn();
    render(<CraftRatingInput {...defaultProps} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('Rate Story 5 stars'));
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('renders with a different label', () => {
    render(<CraftRatingInput label="Direction" value={2} onChange={vi.fn()} />);
    expect(screen.getByText('Direction')).toBeInTheDocument();
    expect(screen.getByLabelText('Rate Direction 1 stars')).toBeInTheDocument();
  });

  it('buttons have type="button" to prevent form submission', () => {
    render(<CraftRatingInput {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toHaveAttribute('type', 'button');
    });
  });
});
