import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

import { SearchInput } from '@/components/common/SearchInput';

describe('SearchInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with the given value', () => {
    render(<SearchInput value="hello" onChange={vi.fn()} />);
    const input = screen.getByDisplayValue('hello');
    expect(input).toBeInTheDocument();
  });

  it('uses default placeholder when none provided', () => {
    render(<SearchInput value="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('uses custom placeholder when provided', () => {
    render(<SearchInput value="" onChange={vi.fn()} placeholder="Find actors..." />);
    expect(screen.getByPlaceholderText('Find actors...')).toBeInTheDocument();
  });

  it('calls onChange with new value when input changes', () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Prabhas' } });
    expect(onChange).toHaveBeenCalledWith('Prabhas');
  });

  it('does not show loading spinner when isLoading is false', () => {
    const { container } = render(<SearchInput value="" onChange={vi.fn()} isLoading={false} />);
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
  });

  it('does not show loading spinner when isLoading is undefined', () => {
    const { container } = render(<SearchInput value="" onChange={vi.fn()} />);
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
  });

  it('shows loading spinner when isLoading is true', () => {
    const { container } = render(<SearchInput value="" onChange={vi.fn()} isLoading={true} />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('applies custom className to the wrapper div', () => {
    const { container } = render(
      <SearchInput value="" onChange={vi.fn()} className="custom-class" />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom-class');
  });

  it('does not append className when not provided', () => {
    const { container } = render(<SearchInput value="" onChange={vi.fn()} />);
    const wrapper = container.firstChild as HTMLElement;
    // Should end without trailing space
    expect(wrapper.className).not.toMatch(/ $/);
  });

  it('renders the search icon', () => {
    const { container } = render(<SearchInput value="" onChange={vi.fn()} />);
    // The Search icon is an SVG inside the wrapper
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('is a text input', () => {
    render(<SearchInput value="" onChange={vi.fn()} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'text');
  });
});
