import { render, screen, fireEvent } from '@testing-library/react';
import { SearchInput } from '@/components/common/SearchInput';

vi.mock('lucide-react', () => ({
  Search: ({ className }: { className?: string }) => (
    <span data-testid="search-icon" className={className} />
  ),
  Loader2: ({ className }: { className?: string }) => (
    <span data-testid="loader-icon" className={className} />
  ),
}));

describe('SearchInput', () => {
  it('renders input with placeholder', () => {
    render(<SearchInput value="" onChange={vi.fn()} placeholder="Search movies..." />);
    expect(screen.getByPlaceholderText('Search movies...')).toBeInTheDocument();
  });

  it('uses default placeholder when none provided', () => {
    render(<SearchInput value="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('calls onChange on input', () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } });
    expect(onChange).toHaveBeenCalledWith('test');
  });

  it('shows loading spinner when isLoading is true', () => {
    render(<SearchInput value="" onChange={vi.fn()} isLoading={true} />);
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
  });

  it('hides spinner when not loading', () => {
    render(<SearchInput value="" onChange={vi.fn()} isLoading={false} />);
    expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
  });

  it('renders search icon', () => {
    render(<SearchInput value="" onChange={vi.fn()} />);
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
  });

  it('displays current value', () => {
    render(<SearchInput value="current" onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('current')).toBeInTheDocument();
  });
});
