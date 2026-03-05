import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeedBulkActions } from '@/components/feed/FeedBulkActions';

describe('FeedBulkActions', () => {
  const defaultProps = {
    selectedCount: 3,
    onPinSelected: vi.fn(),
    onUnpinSelected: vi.fn(),
    onFeatureSelected: vi.fn(),
    onDeleteSelected: vi.fn(),
    onClearSelection: vi.fn(),
  };

  it('renders when items are selected', () => {
    render(<FeedBulkActions {...defaultProps} />);
    expect(screen.getByText('3 selected')).toBeInTheDocument();
  });

  it('renders nothing when no items selected', () => {
    const { container } = render(<FeedBulkActions {...defaultProps} selectedCount={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('calls onPinSelected when Pin is clicked', () => {
    render(<FeedBulkActions {...defaultProps} />);
    fireEvent.click(screen.getByText('Pin'));
    expect(defaultProps.onPinSelected).toHaveBeenCalled();
  });

  it('calls onUnpinSelected when Unpin is clicked', () => {
    render(<FeedBulkActions {...defaultProps} />);
    fireEvent.click(screen.getByText('Unpin'));
    expect(defaultProps.onUnpinSelected).toHaveBeenCalled();
  });

  it('calls onFeatureSelected when Feature is clicked', () => {
    render(<FeedBulkActions {...defaultProps} />);
    fireEvent.click(screen.getByText('Feature'));
    expect(defaultProps.onFeatureSelected).toHaveBeenCalled();
  });

  it('calls onDeleteSelected when Delete is clicked', () => {
    render(<FeedBulkActions {...defaultProps} />);
    fireEvent.click(screen.getByText('Delete'));
    expect(defaultProps.onDeleteSelected).toHaveBeenCalled();
  });

  it('calls onClearSelection when clear button is clicked', () => {
    render(<FeedBulkActions {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Clear selection'));
    expect(defaultProps.onClearSelection).toHaveBeenCalled();
  });
});
