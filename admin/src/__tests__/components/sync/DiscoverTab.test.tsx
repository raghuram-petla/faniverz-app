import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockDiscoverMutate = vi.hoisted(() => vi.fn());
const mockImportMutateAsync = vi.hoisted(() => vi.fn());
const mockDiscoverReset = vi.hoisted(() => vi.fn());
const mockDiscoverData = vi.hoisted(() => ({ current: undefined as unknown }));
const mockDiscoverState = vi.hoisted(() => ({
  isPending: false,
  isError: false,
  error: null as Error | null,
}));

vi.mock('@/hooks/useSync', () => ({
  useDiscoverMovies: () => ({
    mutate: mockDiscoverMutate,
    reset: mockDiscoverReset,
    data: mockDiscoverData.current,
    isPending: mockDiscoverState.isPending,
    isError: mockDiscoverState.isError,
    error: mockDiscoverState.error,
  }),
  useImportMovies: () => ({
    mutateAsync: mockImportMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    functions: { invoke: vi.fn() },
  },
}));

import { DiscoverTab } from '@/components/sync/DiscoverTab';

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderWithProvider(ui: React.ReactElement) {
  const qc = createQueryClient();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDiscoverData.current = undefined;
  mockDiscoverState.isPending = false;
  mockDiscoverState.isError = false;
  mockDiscoverState.error = null;
});

describe('DiscoverTab', () => {
  it('renders the discover form with year and month selects', () => {
    renderWithProvider(<DiscoverTab />);
    expect(screen.getByText('Discover Telugu Movies')).toBeInTheDocument();
    expect(screen.getByText('Year')).toBeInTheDocument();
    expect(screen.getByText('Month')).toBeInTheDocument();
    expect(screen.getByText('Discover')).toBeInTheDocument();
  });

  it('renders the year select with current year selected', () => {
    renderWithProvider(<DiscoverTab />);
    const currentYear = new Date().getFullYear();
    const yearSelect = screen.getByText('Year').nextElementSibling as HTMLSelectElement;
    expect(yearSelect.value).toBe(String(currentYear));
  });

  it('renders the month select with "All months" as default', () => {
    renderWithProvider(<DiscoverTab />);
    expect(screen.getByText('All months')).toBeInTheDocument();
  });

  it('calls discover mutate when Discover button is clicked', () => {
    renderWithProvider(<DiscoverTab />);
    fireEvent.click(screen.getByText('Discover'));
    expect(mockDiscoverMutate).toHaveBeenCalledTimes(1);
  });

  it('passes year and month to discover mutate', () => {
    renderWithProvider(<DiscoverTab />);
    const currentYear = new Date().getFullYear();
    fireEvent.click(screen.getByText('Discover'));
    expect(mockDiscoverMutate).toHaveBeenCalledWith({
      year: currentYear,
      month: undefined,
    });
  });

  it('passes selected month to discover mutate', () => {
    renderWithProvider(<DiscoverTab />);
    const monthSelect = screen.getByText('Month').nextElementSibling as HTMLSelectElement;
    fireEvent.change(monthSelect, { target: { value: '3' } });
    fireEvent.click(screen.getByText('Discover'));
    expect(mockDiscoverMutate).toHaveBeenCalledWith(expect.objectContaining({ month: 3 }));
  });

  it('shows error message when discover fails', () => {
    mockDiscoverState.isError = true;
    mockDiscoverState.error = new Error('TMDB API timeout');
    renderWithProvider(<DiscoverTab />);
    expect(screen.getByText('TMDB API timeout')).toBeInTheDocument();
  });

  it('shows generic error when error is not an Error instance', () => {
    mockDiscoverState.isError = true;
    mockDiscoverState.error = null;
    renderWithProvider(<DiscoverTab />);
    expect(screen.getByText('Discovery failed')).toBeInTheDocument();
  });

  it('shows results summary when data is returned', () => {
    mockDiscoverData.current = {
      results: [
        { id: 1, title: 'Movie A', poster_path: null, release_date: '2024-01-01' },
        { id: 2, title: 'Movie B', poster_path: null, release_date: '2024-02-01' },
        { id: 3, title: 'Movie C', poster_path: '/poster.jpg', release_date: '2024-03-01' },
      ],
      existingTmdbIds: [1],
    };
    renderWithProvider(<DiscoverTab />);
    expect(screen.getByText('3')).toBeInTheDocument(); // total found
    expect(screen.getByText('1 imported')).toBeInTheDocument();
    expect(screen.getByText('2 new')).toBeInTheDocument();
  });

  it('renders movie cards for results', () => {
    mockDiscoverData.current = {
      results: [{ id: 100, title: 'Pushpa 2', poster_path: null, release_date: '2024-12-05' }],
      existingTmdbIds: [],
    };
    renderWithProvider(<DiscoverTab />);
    expect(screen.getByText('Pushpa 2')).toBeInTheDocument();
    expect(screen.getByText('2024-12-05')).toBeInTheDocument();
  });

  it('marks existing movies with "Imported" badge', () => {
    mockDiscoverData.current = {
      results: [{ id: 100, title: 'Already Here', poster_path: null, release_date: '2024-01-01' }],
      existingTmdbIds: [100],
    };
    renderWithProvider(<DiscoverTab />);
    expect(screen.getByText('Imported')).toBeInTheDocument();
  });

  it('shows "Select all new" button when there are new movies', () => {
    mockDiscoverData.current = {
      results: [{ id: 1, title: 'New Movie', poster_path: null, release_date: '2024-01-01' }],
      existingTmdbIds: [],
    };
    renderWithProvider(<DiscoverTab />);
    expect(screen.getByText('Select all new (1)')).toBeInTheDocument();
  });

  it('selects a new movie when clicked and shows "Selected" badge', () => {
    mockDiscoverData.current = {
      results: [{ id: 200, title: 'Selectable', poster_path: null, release_date: '2024-06-01' }],
      existingTmdbIds: [],
    };
    renderWithProvider(<DiscoverTab />);
    fireEvent.click(screen.getByText('Selectable'));
    expect(screen.getByText('Selected')).toBeInTheDocument();
  });

  it('shows import button after selecting movies', () => {
    mockDiscoverData.current = {
      results: [{ id: 300, title: 'To Import', poster_path: null, release_date: '2024-07-01' }],
      existingTmdbIds: [],
    };
    renderWithProvider(<DiscoverTab />);
    fireEvent.click(screen.getByText('To Import'));
    expect(screen.getByText('Import 1 selected')).toBeInTheDocument();
  });

  it('deselects a movie when clicked again', () => {
    mockDiscoverData.current = {
      results: [{ id: 400, title: 'Toggle Me', poster_path: null, release_date: '2024-08-01' }],
      existingTmdbIds: [],
    };
    renderWithProvider(<DiscoverTab />);
    fireEvent.click(screen.getByText('Toggle Me'));
    expect(screen.getByText('Selected')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Toggle Me'));
    expect(screen.queryByText('Selected')).not.toBeInTheDocument();
  });

  it('select all new selects all non-existing movies', () => {
    mockDiscoverData.current = {
      results: [
        { id: 500, title: 'New One', poster_path: null, release_date: '2024-01-01' },
        { id: 501, title: 'New Two', poster_path: null, release_date: '2024-02-01' },
        { id: 502, title: 'Existing', poster_path: null, release_date: '2024-03-01' },
      ],
      existingTmdbIds: [502],
    };
    renderWithProvider(<DiscoverTab />);
    fireEvent.click(screen.getByText('Select all new (2)'));
    expect(screen.getByText('Import 2 selected')).toBeInTheDocument();
  });

  it('renders poster image when poster_path is provided', () => {
    mockDiscoverData.current = {
      results: [
        { id: 600, title: 'Poster Movie', poster_path: '/abc.jpg', release_date: '2024-01-01' },
      ],
      existingTmdbIds: [],
    };
    renderWithProvider(<DiscoverTab />);
    const img = screen.getByAltText('Poster Movie') as HTMLImageElement;
    expect(img.src).toContain('https://image.tmdb.org/t/p/w200/abc.jpg');
  });

  it('shows "No date" when release_date is empty', () => {
    mockDiscoverData.current = {
      results: [{ id: 700, title: 'No Date Movie', poster_path: null, release_date: '' }],
      existingTmdbIds: [],
    };
    renderWithProvider(<DiscoverTab />);
    expect(screen.getByText('No date')).toBeInTheDocument();
  });
});
