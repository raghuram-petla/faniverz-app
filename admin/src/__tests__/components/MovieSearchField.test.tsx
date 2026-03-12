import { render, screen, fireEvent } from '@testing-library/react';
import {
  MovieSearchField,
  MovieSearchFieldProps,
} from '@/components/notifications/MovieSearchField';

vi.mock('lucide-react', () => ({
  Search: (props: Record<string, unknown>) => <div data-testid="search-icon" {...props} />,
}));

const mockMovies = [
  { id: 'mov-1', title: 'Pushpa 2' },
  { id: 'mov-2', title: 'Game Changer' },
  { id: 'mov-3', title: 'Pushpa: The Rise' },
];

const defaultProps: MovieSearchFieldProps = {
  movies: mockMovies,
  movieSearch: '',
  movieId: '',
  inputClass: 'test-input-class',
  onSearchChange: vi.fn(),
  onMovieSelect: vi.fn(),
  onClear: vi.fn(),
};

function renderField(overrides: Partial<MovieSearchFieldProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<MovieSearchField {...props} />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MovieSearchField', () => {
  describe('rendering', () => {
    it('renders the search input with placeholder', () => {
      renderField();
      expect(screen.getByPlaceholderText('Search movies...')).toBeInTheDocument();
    });

    it('renders the label "Movie (optional)"', () => {
      renderField();
      expect(screen.getByText('Movie (optional)')).toBeInTheDocument();
    });

    it('renders the search icon', () => {
      renderField();
      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });

    it('applies the inputClass to the input element', () => {
      renderField({ inputClass: 'my-custom-class' });
      const input = screen.getByPlaceholderText('Search movies...');
      expect(input.className).toContain('my-custom-class');
    });

    it('displays the movieSearch value in the input', () => {
      renderField({ movieSearch: 'Pushpa' });
      const input = screen.getByPlaceholderText('Search movies...');
      expect(input).toHaveValue('Pushpa');
    });
  });

  describe('search change', () => {
    it('calls onSearchChange when typing in the input', () => {
      const onSearchChange = vi.fn();
      renderField({ onSearchChange });

      fireEvent.change(screen.getByPlaceholderText('Search movies...'), {
        target: { value: 'Push' },
      });

      expect(onSearchChange).toHaveBeenCalledWith('Push');
    });

    it('calls onSearchChange with empty string when clearing input', () => {
      const onSearchChange = vi.fn();
      renderField({ movieSearch: 'Pushpa', onSearchChange });

      fireEvent.change(screen.getByPlaceholderText('Search movies...'), {
        target: { value: '' },
      });

      expect(onSearchChange).toHaveBeenCalledWith('');
    });
  });

  describe('dropdown visibility', () => {
    it('does not show dropdown when movieSearch is empty', () => {
      renderField({ movieSearch: '' });
      expect(screen.queryByText('Pushpa 2')).not.toBeInTheDocument();
    });

    it('shows dropdown with matching movies when movieSearch has text', () => {
      renderField({ movieSearch: 'Pushpa' });
      expect(screen.getByText('Pushpa 2')).toBeInTheDocument();
      expect(screen.getByText('Pushpa: The Rise')).toBeInTheDocument();
    });

    it('does not show non-matching movies in dropdown', () => {
      renderField({ movieSearch: 'Pushpa' });
      expect(screen.queryByText('Game Changer')).not.toBeInTheDocument();
    });

    it('does not show dropdown when a movieId is already selected', () => {
      renderField({ movieSearch: 'Pushpa', movieId: 'mov-1' });
      expect(screen.queryByText('Pushpa 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Pushpa: The Rise')).not.toBeInTheDocument();
    });

    it('does not show dropdown when movies is undefined', () => {
      renderField({ movies: undefined, movieSearch: 'Pushpa' });
      expect(screen.queryByText('Pushpa 2')).not.toBeInTheDocument();
    });

    it('does not show dropdown when no movies match the search text', () => {
      renderField({ movieSearch: 'Nonexistent' });
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('movie filtering', () => {
    it('filters movies case-insensitively', () => {
      renderField({ movieSearch: 'pushpa' });
      expect(screen.getByText('Pushpa 2')).toBeInTheDocument();
      expect(screen.getByText('Pushpa: The Rise')).toBeInTheDocument();
    });

    it('shows all movies when search matches all', () => {
      renderField({ movieSearch: '' });
      // Empty search hides the dropdown entirely
      expect(screen.queryByText('Pushpa 2')).not.toBeInTheDocument();
    });

    it('filters to exact partial match', () => {
      renderField({ movieSearch: 'Game' });
      expect(screen.getByText('Game Changer')).toBeInTheDocument();
      expect(screen.queryByText('Pushpa 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Pushpa: The Rise')).not.toBeInTheDocument();
    });

    it('limits dropdown to 10 results', () => {
      const manyMovies = Array.from({ length: 15 }, (_, i) => ({
        id: `mov-${i}`,
        title: `Movie ${i}`,
      }));
      renderField({ movies: manyMovies, movieSearch: 'Movie' });

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(10);
    });
  });

  describe('movie selection', () => {
    it('calls onMovieSelect with id and title when a movie is clicked', () => {
      const onMovieSelect = vi.fn();
      renderField({ movieSearch: 'Pushpa', onMovieSelect });

      fireEvent.click(screen.getByText('Pushpa 2'));

      expect(onMovieSelect).toHaveBeenCalledTimes(1);
      expect(onMovieSelect).toHaveBeenCalledWith('mov-1', 'Pushpa 2');
    });

    it('calls onMovieSelect with correct data for second movie', () => {
      const onMovieSelect = vi.fn();
      renderField({ movieSearch: 'Pushpa', onMovieSelect });

      fireEvent.click(screen.getByText('Pushpa: The Rise'));

      expect(onMovieSelect).toHaveBeenCalledWith('mov-3', 'Pushpa: The Rise');
    });
  });

  describe('selected state', () => {
    it('shows "Selected" text when movieId is set', () => {
      renderField({ movieId: 'mov-1' });
      expect(screen.getByText('Selected')).toBeInTheDocument();
    });

    it('shows "Clear" button when movieId is set', () => {
      renderField({ movieId: 'mov-1' });
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('does not show "Selected" or "Clear" when movieId is empty', () => {
      renderField({ movieId: '' });
      expect(screen.queryByText('Selected')).not.toBeInTheDocument();
      expect(screen.queryByText('Clear')).not.toBeInTheDocument();
    });

    it('calls onClear when Clear button is clicked', () => {
      const onClear = vi.fn();
      renderField({ movieId: 'mov-1', onClear });

      fireEvent.click(screen.getByText('Clear'));

      expect(onClear).toHaveBeenCalledTimes(1);
    });
  });
});
