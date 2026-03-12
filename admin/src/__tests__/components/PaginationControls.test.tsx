import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaginationControls } from '@/components/common/PaginationControls';

describe('PaginationControls', () => {
  const defaultProps = {
    page: 0,
    totalPages: 5,
    totalCount: 47,
    pageSize: 10,
    onPrevious: vi.fn(),
    onNext: vi.fn(),
  };

  it('renders "Showing X--Y of Z" text', () => {
    render(<PaginationControls {...defaultProps} />);
    expect(screen.getByText('Showing 1--10 of 47')).toBeInTheDocument();
  });

  it('renders correct range for middle page', () => {
    render(<PaginationControls {...defaultProps} page={2} />);
    expect(screen.getByText('Showing 21--30 of 47')).toBeInTheDocument();
  });

  it('clamps "to" value to totalCount on the last page', () => {
    render(<PaginationControls {...defaultProps} page={4} />);
    expect(screen.getByText('Showing 41--47 of 47')).toBeInTheDocument();
  });

  it('renders "Page X of Y" text', () => {
    render(<PaginationControls {...defaultProps} />);
    expect(screen.getByText('Page 1 of 5')).toBeInTheDocument();
  });

  it('renders correct page number for non-first page', () => {
    render(<PaginationControls {...defaultProps} page={3} />);
    expect(screen.getByText('Page 4 of 5')).toBeInTheDocument();
  });

  it('disables previous button on first page', () => {
    render(<PaginationControls {...defaultProps} page={0} />);
    const prevButton = screen.getByTitle('Previous page');
    expect(prevButton).toBeDisabled();
  });

  it('enables previous button on non-first page', () => {
    render(<PaginationControls {...defaultProps} page={2} />);
    const prevButton = screen.getByTitle('Previous page');
    expect(prevButton).not.toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(<PaginationControls {...defaultProps} page={4} />);
    const nextButton = screen.getByTitle('Next page');
    expect(nextButton).toBeDisabled();
  });

  it('enables next button on non-last page', () => {
    render(<PaginationControls {...defaultProps} page={0} />);
    const nextButton = screen.getByTitle('Next page');
    expect(nextButton).not.toBeDisabled();
  });

  it('calls onPrevious when previous button is clicked', () => {
    const onPrevious = vi.fn();
    render(<PaginationControls {...defaultProps} page={2} onPrevious={onPrevious} />);
    fireEvent.click(screen.getByTitle('Previous page'));
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it('calls onNext when next button is clicked', () => {
    const onNext = vi.fn();
    render(<PaginationControls {...defaultProps} page={0} onNext={onNext} />);
    fireEvent.click(screen.getByTitle('Next page'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
