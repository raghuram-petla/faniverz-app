import { render, screen, fireEvent } from '@testing-library/react';
import { ManualAddPanel } from '@/components/theaters/ManualAddPanel';
import type { Movie } from '@/lib/types';

vi.mock('@/components/common/SearchInput', () => ({
  SearchInput: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    isLoading?: boolean;
  }) => (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  ),
}));

const mockMovie: Movie = {
  id: 'movie-1',
  tmdb_id: null,
  title: 'Search Result Movie',
  poster_url: null,
  backdrop_url: null,
  release_date: '2026-05-01',
  runtime: 130,
  genres: [],
  certification: null,
  synopsis: null,
  director: null,
  in_theaters: false,
  premiere_date: null,
  original_language: 'te',
  backdrop_focus_x: null,
  backdrop_focus_y: null,
  spotlight_focus_x: null,
  spotlight_focus_y: null,
  detail_focus_x: null,
  detail_focus_y: null,
  rating: 0,
  review_count: 0,
  is_featured: false,
  tmdb_last_synced_at: null,
  trailer_url: null,
  created_at: '',
  updated_at: '',
};

const defaultProps = {
  search: '',
  setSearch: vi.fn(),
  debouncedSearch: '',
  isSearching: false,
  results: [] as Movie[],
  onAdd: vi.fn(),
  isAdding: false,
};

describe('ManualAddPanel', () => {
  it('renders heading', () => {
    render(<ManualAddPanel {...defaultProps} />);
    expect(screen.getByText('Add a Movie to "In Theaters"')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<ManualAddPanel {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search movies...')).toBeInTheDocument();
  });

  it('shows helper text when search is short', () => {
    render(<ManualAddPanel {...defaultProps} />);
    expect(screen.getByText('Search for a movie to add it to "In Theaters"')).toBeInTheDocument();
  });

  it('shows "type at least 2 characters" for 1-char search', () => {
    render(<ManualAddPanel {...defaultProps} search="A" />);
    expect(screen.getByText('Type at least 2 characters')).toBeInTheDocument();
  });

  it('shows "No movies found" when search returns empty', () => {
    render(<ManualAddPanel {...defaultProps} search="ab" debouncedSearch="ab" results={[]} />);
    expect(screen.getByText('No movies found')).toBeInTheDocument();
  });

  it('renders search results', () => {
    render(
      <ManualAddPanel
        {...defaultProps}
        search="Search"
        debouncedSearch="Search"
        results={[mockMovie]}
      />,
    );
    expect(screen.getByText('Search Result Movie')).toBeInTheDocument();
  });

  it('shows form after selecting a movie', () => {
    render(
      <ManualAddPanel
        {...defaultProps}
        search="Search"
        debouncedSearch="Search"
        results={[mockMovie]}
      />,
    );
    fireEvent.click(screen.getByText('Search Result Movie'));
    expect(screen.getByText('Start Date')).toBeInTheDocument();
    expect(screen.getByText('Label')).toBeInTheDocument();
    expect(screen.getByText('Add to "In Theaters"')).toBeInTheDocument();
  });

  it('shows "Change" button after selecting a movie', () => {
    render(
      <ManualAddPanel
        {...defaultProps}
        search="Search"
        debouncedSearch="Search"
        results={[mockMovie]}
      />,
    );
    fireEvent.click(screen.getByText('Search Result Movie'));
    expect(screen.getByText('Change')).toBeInTheDocument();
  });

  it('returns to search when clicking "Change"', () => {
    render(
      <ManualAddPanel
        {...defaultProps}
        search="Search"
        debouncedSearch="Search"
        results={[mockMovie]}
      />,
    );
    fireEvent.click(screen.getByText('Search Result Movie'));
    fireEvent.click(screen.getByText('Change'));
    expect(screen.getByPlaceholderText('Search movies...')).toBeInTheDocument();
  });

  it('shows "In Theaters" badge for movies already in theaters', () => {
    const inTheaterMovie = {
      ...mockMovie,
      id: 'movie-2',
      in_theaters: true,
      title: 'Active Movie',
    };
    render(
      <ManualAddPanel
        {...defaultProps}
        search="Active"
        debouncedSearch="Active"
        results={[inTheaterMovie]}
      />,
    );
    expect(screen.getByText('In Theaters')).toBeInTheDocument();
    expect(screen.getByText('Active Movie')).toBeInTheDocument();
  });

  it('does not open form when clicking a movie already in theaters', () => {
    const inTheaterMovie = {
      ...mockMovie,
      id: 'movie-2',
      in_theaters: true,
      title: 'Active Movie',
    };
    render(
      <ManualAddPanel
        {...defaultProps}
        search="Active"
        debouncedSearch="Active"
        results={[inTheaterMovie]}
      />,
    );
    fireEvent.click(screen.getByText('Active Movie'));
    expect(screen.queryByText('Start Date')).not.toBeInTheDocument();
  });
});
