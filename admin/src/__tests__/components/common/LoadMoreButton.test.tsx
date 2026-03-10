import { render, screen, fireEvent } from '@testing-library/react';
import { LoadMoreButton } from '@/components/common/LoadMoreButton';

vi.mock('lucide-react', () => ({
  Loader2: ({ className }: { className?: string }) => (
    <span data-testid="loader-icon" className={className} />
  ),
}));

describe('LoadMoreButton', () => {
  it('renders nothing when hasNextPage is false', () => {
    const { container } = render(
      <LoadMoreButton hasNextPage={false} isFetchingNextPage={false} fetchNextPage={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows "Load More" when not fetching', () => {
    render(
      <LoadMoreButton hasNextPage={true} isFetchingNextPage={false} fetchNextPage={vi.fn()} />,
    );
    expect(screen.getByText('Load More')).toBeInTheDocument();
  });

  it('shows spinner and "Loading..." when fetching', () => {
    render(<LoadMoreButton hasNextPage={true} isFetchingNextPage={true} fetchNextPage={vi.fn()} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
  });

  it('calls fetchNextPage on click', () => {
    const fetchNextPage = vi.fn();
    render(
      <LoadMoreButton
        hasNextPage={true}
        isFetchingNextPage={false}
        fetchNextPage={fetchNextPage}
      />,
    );
    fireEvent.click(screen.getByText('Load More'));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('button is disabled when fetching', () => {
    render(<LoadMoreButton hasNextPage={true} isFetchingNextPage={true} fetchNextPage={vi.fn()} />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});
