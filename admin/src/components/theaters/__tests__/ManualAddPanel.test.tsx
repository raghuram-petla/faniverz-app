import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('@/components/common/SearchInput', () => ({
  SearchInput: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  }) => (
    <input
      data-testid="search-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

vi.mock('@/lib/utils', () => ({
  formatDate: (d: string) => d,
}));

vi.mock('@shared/imageUrl', () => ({
  getImageUrl: (_url: string) => _url,
}));

import { ManualAddPanel } from '@/components/theaters/ManualAddPanel';
import type { Movie } from '@/lib/types';

const makeMovie = (overrides: Partial<Movie> = {}): Movie =>
  ({
    id: 'movie-1',
    title: 'Test Movie',
    poster_url: null,
    release_date: '2024-01-01',
    in_theaters: false,
    tmdb_id: null,
    ...overrides,
  }) as Movie;

describe('ManualAddPanel', () => {
  const mockSetSearch = vi.fn();
  const mockOnAdd = vi.fn();

  const defaultProps = {
    search: '',
    setSearch: mockSetSearch,
    debouncedSearch: '',
    isSearching: false,
    results: [],
    onAdd: mockOnAdd,
    isAdding: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the panel heading', () => {
    render(<ManualAddPanel {...defaultProps} />);
    expect(screen.getByText('Add a Movie to "In Theaters"')).toBeInTheDocument();
  });

  it('renders search input in initial state', () => {
    render(<ManualAddPanel {...defaultProps} />);
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  it('shows hint text when search length is 1', () => {
    render(<ManualAddPanel {...defaultProps} search="a" debouncedSearch="" />);
    expect(screen.getByText('Type at least 2 characters')).toBeInTheDocument();
  });

  it('shows results list when debouncedSearch >= 2 and there are results', () => {
    const movie = makeMovie({ title: 'Found Movie' });
    render(<ManualAddPanel {...defaultProps} search="fo" debouncedSearch="fo" results={[movie]} />);
    expect(screen.getByText('Found Movie')).toBeInTheDocument();
  });

  it('shows "No movies found" when debouncedSearch >= 2 and no results', () => {
    render(
      <ManualAddPanel
        {...defaultProps}
        search="xy"
        debouncedSearch="xy"
        results={[]}
        isSearching={false}
      />,
    );
    expect(screen.getByText('No movies found')).toBeInTheDocument();
  });

  it('does not show results when debouncedSearch is empty', () => {
    const movie = makeMovie({ title: 'Found Movie' });
    render(<ManualAddPanel {...defaultProps} results={[movie]} />);
    expect(screen.queryByText('Found Movie')).not.toBeInTheDocument();
  });

  it('shows movie poster image when poster_url is set', () => {
    const movie = makeMovie({ title: 'Poster Movie', poster_url: 'https://img.com/poster.jpg' });
    const { container } = render(
      <ManualAddPanel {...defaultProps} search="po" debouncedSearch="po" results={[movie]} />,
    );
    // img has empty alt so role="presentation" not "img" — use querySelector
    expect(container.querySelector('img')).toBeInTheDocument();
  });

  it('shows film placeholder when poster_url is null', () => {
    const movie = makeMovie({ title: 'No Poster Movie', poster_url: null });
    render(<ManualAddPanel {...defaultProps} search="no" debouncedSearch="no" results={[movie]} />);
    // No img tag rendered
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('selects a movie when clicked and shows form', () => {
    const movie = makeMovie({ title: 'Selectable Movie' });
    render(<ManualAddPanel {...defaultProps} search="se" debouncedSearch="se" results={[movie]} />);
    fireEvent.click(screen.getByText('Selectable Movie'));
    expect(screen.getByText('Start Date')).toBeInTheDocument();
    expect(screen.getByText('Add to "In Theaters"')).toBeInTheDocument();
  });

  it('shows "In Theaters" badge for movies already in theaters and disables click', () => {
    const movie = makeMovie({ title: 'Already There', in_theaters: true });
    render(<ManualAddPanel {...defaultProps} search="al" debouncedSearch="al" results={[movie]} />);
    expect(screen.getByText('In Theaters')).toBeInTheDocument();
    // Clicking should not select the movie
    fireEvent.click(screen.getByText('Already There'));
    expect(screen.queryByText('Start Date')).not.toBeInTheDocument();
  });

  it('shows "Change" and "Clear" buttons when movie is selected', () => {
    const movie = makeMovie({ title: 'My Movie' });
    render(<ManualAddPanel {...defaultProps} search="my" debouncedSearch="my" results={[movie]} />);
    fireEvent.click(screen.getByText('My Movie'));
    expect(screen.getByText('Change')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('clicking Change returns to search view', () => {
    const movie = makeMovie({ title: 'My Movie' });
    render(<ManualAddPanel {...defaultProps} search="my" debouncedSearch="my" results={[movie]} />);
    fireEvent.click(screen.getByText('My Movie'));
    fireEvent.click(screen.getByText('Change'));
    // After Change, selectedMovie is null, so we see search input again
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  it('clicking Clear resets search and returns to initial state', () => {
    const movie = makeMovie({ title: 'My Movie' });
    render(<ManualAddPanel {...defaultProps} search="my" debouncedSearch="my" results={[movie]} />);
    fireEvent.click(screen.getByText('My Movie'));
    fireEvent.click(screen.getByText('Clear'));
    expect(mockSetSearch).toHaveBeenCalledWith('');
    expect(screen.queryByText('Start Date')).not.toBeInTheDocument();
  });

  it('calls onAdd with correct args when Add button is clicked', () => {
    const movie = makeMovie({
      id: 'movie-123',
      title: 'Addable Movie',
      release_date: '2024-06-01',
    });
    render(<ManualAddPanel {...defaultProps} search="ad" debouncedSearch="ad" results={[movie]} />);
    fireEvent.click(screen.getByText('Addable Movie'));
    fireEvent.click(screen.getByText('Add to "In Theaters"'));
    expect(mockOnAdd).toHaveBeenCalledWith(
      'movie-123',
      'Addable Movie',
      null,
      expect.any(String), // start date (today's date)
      null, // label (empty → null)
      '2024-06-01',
    );
  });

  it('calls onAdd with label when label field is filled', () => {
    const movie = makeMovie({ title: 'Re-release' });
    render(<ManualAddPanel {...defaultProps} search="re" debouncedSearch="re" results={[movie]} />);
    fireEvent.click(screen.getByText('Re-release'));
    // Fill in label
    const labelInput = screen.getByPlaceholderText("e.g. Re-release, Director's Cut");
    fireEvent.change(labelInput, { target: { value: "Director's Cut" } });
    fireEvent.click(screen.getByText('Add to "In Theaters"'));
    expect(mockOnAdd).toHaveBeenCalledWith(
      expect.any(String),
      'Re-release',
      null,
      expect.any(String),
      "Director's Cut",
      expect.anything(),
    );
  });

  it('resets selected movie and search after successful add', () => {
    const movie = makeMovie({ title: 'Added Movie' });
    render(<ManualAddPanel {...defaultProps} search="ad" debouncedSearch="ad" results={[movie]} />);
    fireEvent.click(screen.getByText('Added Movie'));
    fireEvent.click(screen.getByText('Add to "In Theaters"'));
    expect(mockSetSearch).toHaveBeenCalledWith('');
    expect(screen.queryByText('Start Date')).not.toBeInTheDocument();
  });

  it('shows Loader2 spinner when isAdding is true', () => {
    const movie = makeMovie({ title: 'Loading Movie' });
    render(
      <ManualAddPanel
        {...defaultProps}
        search="lo"
        debouncedSearch="lo"
        results={[movie]}
        isAdding
      />,
    );
    fireEvent.click(screen.getByText('Loading Movie'));
    // With isAdding=true, button is disabled
    const addButton = screen.getByText('Add to "In Theaters"').closest('button');
    expect(addButton).toBeDisabled();
  });

  it('shows release date in movie list', () => {
    const movie = makeMovie({ title: 'Dated Movie', release_date: '2024-03-15' });
    render(<ManualAddPanel {...defaultProps} search="da" debouncedSearch="da" results={[movie]} />);
    expect(screen.getByText('2024-03-15')).toBeInTheDocument();
  });

  it('shows "No date" when release_date is null', () => {
    const movie = makeMovie({ title: 'No Date Movie', release_date: null });
    render(<ManualAddPanel {...defaultProps} search="no" debouncedSearch="no" results={[movie]} />);
    expect(screen.getByText('No date')).toBeInTheDocument();
  });

  it('shows "No release date" in selected movie header when release_date is null', () => {
    const movie = makeMovie({ title: 'No Date', release_date: null });
    render(<ManualAddPanel {...defaultProps} search="no" debouncedSearch="no" results={[movie]} />);
    fireEvent.click(screen.getByText('No Date'));
    expect(screen.getByText('No release date')).toBeInTheDocument();
  });

  it('Add button is disabled when startDate is empty', () => {
    const movie = makeMovie({ title: 'Movie' });
    render(<ManualAddPanel {...defaultProps} search="mo" debouncedSearch="mo" results={[movie]} />);
    fireEvent.click(screen.getByText('Movie'));
    // Clear the start date input (type=date)
    const startDateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(startDateInput, { target: { value: '' } });
    const addButton = screen.getByText('Add to "In Theaters"').closest('button');
    expect(addButton).toBeDisabled();
  });

  it('shows prompt text when debouncedSearch is short', () => {
    render(<ManualAddPanel {...defaultProps} debouncedSearch="" />);
    expect(screen.getByText('Search for a movie to add it to "In Theaters"')).toBeInTheDocument();
  });
});
