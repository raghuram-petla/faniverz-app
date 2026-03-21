import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MovieSearchResults } from '@/components/sync/MovieSearchResults';

const mockImportMutateAsync = vi.hoisted(() => vi.fn());
const mockLinkMutateAsync = vi.hoisted(() => vi.fn());
const mockLanguageCodes = vi.hoisted(() => ({ current: [] as string[] }));
const mockSelectedLanguageCode = vi.hoisted(() => ({ current: null as string | null }));

vi.mock('@/hooks/useSync', () => ({
  useImportMovies: () => ({
    mutateAsync: mockImportMutateAsync,
    isPending: false,
  }),
  useLinkTmdbId: () => ({
    mutateAsync: mockLinkMutateAsync,
  }),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    languageCodes: mockLanguageCodes.current,
  }),
}));

vi.mock('@/hooks/useLanguageContext', () => ({
  useLanguageContext: () => ({
    selectedLanguageCode: mockSelectedLanguageCode.current,
  }),
}));

vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChangesWarning: vi.fn(),
}));

vi.mock('@/lib/movie-constants', () => ({
  LANGUAGE_OPTIONS: [
    { value: 'te', label: 'Telugu' },
    { value: 'ta', label: 'Tamil' },
    { value: 'en', label: 'English' },
  ],
}));

vi.mock('@/lib/supabase-browser', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}));

vi.mock('@/components/sync/DiscoverResults', () => ({
  ImportProgressList: ({ items }: { items: Array<{ title: string; status: string }> }) => (
    <div data-testid="progress-list">
      {items.map((i) => (
        <span key={i.title}>
          {i.title}: {i.status}
        </span>
      ))}
    </div>
  ),
}));

vi.mock('lucide-react', () => ({
  Film: () => <span data-testid="film-icon" />,
  Loader2: () => <span data-testid="loader" />,
  Download: () => <span data-testid="download-icon" />,
  CheckCircle: () => <span data-testid="check-circle" />,
  AlertTriangle: () => <span data-testid="alert-triangle" />,
  Link2: () => <span data-testid="link-icon" />,
  Ban: () => <span data-testid="ban-icon" />,
}));

const makeMovie = (id: number, overrides = {}) => ({
  id,
  title: `Movie ${id}`,
  poster_path: `/poster${id}.jpg`,
  release_date: '2024-01-15',
  original_language: 'te',
  ...overrides,
});

const defaultProps = {
  movies: [makeMovie(1), makeMovie(2), makeMovie(3)],
  existingSet: new Set<number>(),
  duplicateSuspects: undefined,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockLanguageCodes.current = [];
  mockSelectedLanguageCode.current = null;
});

describe('MovieSearchResults', () => {
  it('renders movie count heading', () => {
    render(<MovieSearchResults {...defaultProps} />);
    expect(screen.getByText(/Movies \(3/)).toBeInTheDocument();
  });

  it('renders movie titles', () => {
    render(<MovieSearchResults {...defaultProps} />);
    expect(screen.getByText('Movie 1')).toBeInTheDocument();
    expect(screen.getByText('Movie 2')).toBeInTheDocument();
    expect(screen.getByText('Movie 3')).toBeInTheDocument();
  });

  it('renders poster images', () => {
    render(<MovieSearchResults {...defaultProps} />);
    const imgs = screen.getAllByAltText(/Movie \d/);
    expect(imgs.length).toBe(3);
  });

  it('shows film icon when no poster', () => {
    render(<MovieSearchResults {...defaultProps} movies={[makeMovie(1, { poster_path: null })]} />);
    // One film icon in the heading, one for the movie without poster
    expect(screen.getAllByTestId('film-icon').length).toBeGreaterThanOrEqual(2);
  });

  it('shows "In DB" badge for existing movies', () => {
    render(<MovieSearchResults {...defaultProps} existingSet={new Set([1])} />);
    expect(screen.getByText('In DB')).toBeInTheDocument();
  });

  it('shows "Duplicate?" badge for suspected duplicates', () => {
    render(
      <MovieSearchResults
        {...defaultProps}
        duplicateSuspects={{ 2: { id: 'db-2', title: 'Movie Two' } }}
      />,
    );
    expect(screen.getByText('Duplicate?')).toBeInTheDocument();
  });

  it('shows duplicate suspect title and link button', () => {
    render(
      <MovieSearchResults
        {...defaultProps}
        duplicateSuspects={{ 2: { id: 'db-2', title: 'Movie Two' } }}
      />,
    );
    expect(screen.getByText(/Movie Two/)).toBeInTheDocument();
    expect(screen.getByText('Link to TMDB')).toBeInTheDocument();
    expect(screen.getByText('Edit instead')).toBeInTheDocument();
  });

  it('renders "Select all new" button when new movies exist', () => {
    render(<MovieSearchResults {...defaultProps} />);
    expect(screen.getByText('Select all new (3)')).toBeInTheDocument();
  });

  it('selects all new movies on "Select all new" click', () => {
    render(<MovieSearchResults {...defaultProps} />);
    fireEvent.click(screen.getByText('Select all new (3)'));
    expect(screen.getByText('Deselect all')).toBeInTheDocument();
    expect(screen.getAllByText('Selected').length).toBe(3);
  });

  it('deselects all on "Deselect all" click', () => {
    render(<MovieSearchResults {...defaultProps} />);
    fireEvent.click(screen.getByText('Select all new (3)'));
    fireEvent.click(screen.getByText('Deselect all'));
    expect(screen.queryByText('Selected')).not.toBeInTheDocument();
  });

  it('shows import button when movies are selected', () => {
    render(<MovieSearchResults {...defaultProps} />);
    fireEvent.click(screen.getByText('Select all new (3)'));
    expect(screen.getByText('Import 3 selected')).toBeInTheDocument();
  });

  it('toggles individual selection on movie click', () => {
    render(<MovieSearchResults {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    // Movie buttons are after the heading buttons
    const movieBtn = buttons.find((b) => b.textContent?.includes('Movie 1'));
    if (movieBtn) fireEvent.click(movieBtn);
    expect(screen.getByText('Selected')).toBeInTheDocument();
  });

  it('shows release date for each movie', () => {
    render(<MovieSearchResults {...defaultProps} />);
    const dateTexts = screen.getAllByText(/2024-01-15/);
    expect(dateTexts.length).toBeGreaterThan(0);
  });

  it('shows "No date" when release_date is empty', () => {
    render(<MovieSearchResults {...defaultProps} movies={[makeMovie(1, { release_date: '' })]} />);
    expect(screen.getByText('No date')).toBeInTheDocument();
  });

  it('shows language filter toggle when language restriction active', () => {
    mockSelectedLanguageCode.current = 'te';
    render(<MovieSearchResults {...defaultProps} />);
    expect(screen.getByText('All languages')).toBeInTheDocument();
    expect(screen.getByText('Telugu')).toBeInTheDocument();
  });

  it('does not show language filter when no restriction', () => {
    render(<MovieSearchResults {...defaultProps} />);
    expect(screen.queryByText('All languages')).not.toBeInTheDocument();
  });

  it('shows "Not your language" badge for blocked movies', () => {
    mockSelectedLanguageCode.current = 'ta';
    render(<MovieSearchResults {...defaultProps} />);
    // All movies are 'te' but filter is 'ta', so they should be blocked
    expect(screen.getAllByText('Not your language').length).toBe(3);
  });

  it('disables existing movie buttons', () => {
    render(<MovieSearchResults {...defaultProps} existingSet={new Set([1])} />);
    const buttons = screen.getAllByRole('button');
    const existingBtn = buttons.find((b) => b.textContent?.includes('Movie 1'));
    expect(existingBtn).toBeDisabled();
  });
});
