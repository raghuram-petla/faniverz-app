import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeedFilterTabs } from '@/components/feed/FeedFilterTabs';

describe('FeedFilterTabs', () => {
  it('renders all tab buttons', () => {
    render(<FeedFilterTabs selected="all" onChange={vi.fn()} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Videos')).toBeInTheDocument();
    expect(screen.getByText('Posters')).toBeInTheDocument();
    expect(screen.getByText('Surprise')).toBeInTheDocument();
    expect(screen.getByText('Updates')).toBeInTheDocument();
  });

  it('calls onChange when tab is clicked', () => {
    const onChange = vi.fn();
    render(<FeedFilterTabs selected="all" onChange={onChange} />);
    fireEvent.click(screen.getByText('Videos'));
    expect(onChange).toHaveBeenCalledWith('video');
  });

  it('highlights selected tab', () => {
    render(<FeedFilterTabs selected="video" onChange={vi.fn()} />);
    const videosTab = screen.getByText('Videos');
    expect(videosTab.className).toContain('bg-red-600');
  });

  it('does not highlight unselected tabs', () => {
    render(<FeedFilterTabs selected="video" onChange={vi.fn()} />);
    const allTab = screen.getByText('All');
    expect(allTab.className).not.toContain('bg-red-600');
  });
});
