import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockMovieSearchData = vi.hoisted(() => ({ current: undefined as unknown[] | undefined }));
const mockActorSearchData = vi.hoisted(() => ({ current: undefined as unknown[] | undefined }));
const mockRefreshMovieMutate = vi.hoisted(() => vi.fn());
const mockRefreshActorMutate = vi.hoisted(() => vi.fn());
const mockRefreshMovieState = vi.hoisted(() => ({
  isPending: false,
  isSuccess: false,
  isError: false,
  error: null as Error | null,
  data: null as { result: { castCount: number; crewCount: number } } | null,
}));
const mockRefreshActorState = vi.hoisted(() => ({
  isPending: false,
  isSuccess: false,
  isError: false,
  error: null as Error | null,
  data: null as { result: { fields: string[] } } | null,
}));

vi.mock('@/hooks/useSync', () => ({
  useMovieSearch: () => ({
    data: mockMovieSearchData.current,
  }),
  useActorSearch: () => ({
    data: mockActorSearchData.current,
  }),
  useRefreshMovie: () => ({
    mutate: mockRefreshMovieMutate,
    isPending: mockRefreshMovieState.isPending,
    isSuccess: mockRefreshMovieState.isSuccess,
    isError: mockRefreshMovieState.isError,
    error: mockRefreshMovieState.error,
    data: mockRefreshMovieState.data,
  }),
  useRefreshActor: () => ({
    mutate: mockRefreshActorMutate,
    isPending: mockRefreshActorState.isPending,
    isSuccess: mockRefreshActorState.isSuccess,
    isError: mockRefreshActorState.isError,
    error: mockRefreshActorState.error,
    data: mockRefreshActorState.data,
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
      ilike: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    functions: { invoke: vi.fn() },
  },
}));

import { RefreshTab } from '@/components/sync/RefreshTab';

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderWithProvider(ui: React.ReactElement) {
  const qc = createQueryClient();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  mockMovieSearchData.current = undefined;
  mockActorSearchData.current = undefined;
  mockRefreshMovieState.isPending = false;
  mockRefreshMovieState.isSuccess = false;
  mockRefreshMovieState.isError = false;
  mockRefreshMovieState.error = null;
  mockRefreshMovieState.data = null;
  mockRefreshActorState.isPending = false;
  mockRefreshActorState.isSuccess = false;
  mockRefreshActorState.isError = false;
  mockRefreshActorState.error = null;
  mockRefreshActorState.data = null;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('RefreshTab', () => {
  it('renders both Refresh Movie and Refresh Actor sections', () => {
    renderWithProvider(<RefreshTab />);
    expect(screen.getByText('Refresh Movie')).toBeInTheDocument();
    expect(screen.getByText('Refresh Actor')).toBeInTheDocument();
  });

  it('renders movie search input with placeholder', () => {
    renderWithProvider(<RefreshTab />);
    expect(screen.getByPlaceholderText('Search movie by title...')).toBeInTheDocument();
  });

  it('renders actor search input with placeholder', () => {
    renderWithProvider(<RefreshTab />);
    expect(screen.getByPlaceholderText('Search actor by name...')).toBeInTheDocument();
  });

  it('shows movie search dropdown when results are available and typing', () => {
    mockMovieSearchData.current = [
      {
        id: 'm1',
        title: 'Pushpa',
        release_date: '2021-12-17',
        tmdb_id: 100,
        tmdb_last_synced_at: null,
      },
      {
        id: 'm2',
        title: 'Pushpa 2',
        release_date: '2024-12-05',
        tmdb_id: 101,
        tmdb_last_synced_at: '2024-01-01T00:00:00Z',
      },
    ];
    renderWithProvider(<RefreshTab />);
    const movieInput = screen.getByPlaceholderText('Search movie by title...');
    fireEvent.change(movieInput, { target: { value: 'Push' } });
    expect(screen.getByText('Pushpa')).toBeInTheDocument();
    expect(screen.getByText('Pushpa 2')).toBeInTheDocument();
  });

  it('selects a movie from dropdown and shows details', () => {
    mockMovieSearchData.current = [
      {
        id: 'm1',
        title: 'RRR',
        release_date: '2022-03-25',
        tmdb_id: 200,
        tmdb_last_synced_at: null,
      },
    ];
    renderWithProvider(<RefreshTab />);
    const movieInput = screen.getByPlaceholderText('Search movie by title...');
    fireEvent.change(movieInput, { target: { value: 'RRR' } });
    fireEvent.click(screen.getByText('RRR'));
    // After selection, shows movie details with refresh button
    expect(screen.getByText('Refresh from TMDB')).toBeInTheDocument();
    expect(screen.getByText('Never synced')).toBeInTheDocument();
  });

  it('shows synced time for movies that have been synced', () => {
    const recentDate = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
    mockMovieSearchData.current = [
      {
        id: 'm1',
        title: 'Recently Updated',
        release_date: '2024-01-01',
        tmdb_id: 300,
        tmdb_last_synced_at: recentDate,
      },
    ];
    renderWithProvider(<RefreshTab />);
    const movieInput = screen.getByPlaceholderText('Search movie by title...');
    fireEvent.change(movieInput, { target: { value: 'Recently' } });
    fireEvent.click(screen.getByText('Recently Updated'));
    // Should show "Synced Xh ago" text
    expect(screen.getByText(/Synced \d+h ago/)).toBeInTheDocument();
  });

  it('disables refresh button when movie has no tmdb_id', () => {
    mockMovieSearchData.current = [
      {
        id: 'm1',
        title: 'No TMDB',
        release_date: '2024-01-01',
        tmdb_id: null,
        tmdb_last_synced_at: null,
      },
    ];
    renderWithProvider(<RefreshTab />);
    const movieInput = screen.getByPlaceholderText('Search movie by title...');
    fireEvent.change(movieInput, { target: { value: 'No TMDB' } });
    fireEvent.click(screen.getByText('No TMDB'));
    expect(
      screen.getByText('This movie has no TMDB ID and cannot be refreshed.'),
    ).toBeInTheDocument();
  });

  it('calls refreshMovie mutate when Refresh from TMDB is clicked for movie', () => {
    mockMovieSearchData.current = [
      {
        id: 'm1',
        title: 'Refresh Me',
        release_date: '2024-01-01',
        tmdb_id: 400,
        tmdb_last_synced_at: null,
      },
    ];
    renderWithProvider(<RefreshTab />);
    const movieInput = screen.getByPlaceholderText('Search movie by title...');
    fireEvent.change(movieInput, { target: { value: 'Refresh' } });
    fireEvent.click(screen.getByText('Refresh Me'));
    // There are two "Refresh from TMDB" buttons; get the first one (movie section)
    const refreshButtons = screen.getAllByText('Refresh from TMDB');
    fireEvent.click(refreshButtons[0]);
    expect(mockRefreshMovieMutate).toHaveBeenCalledWith('m1');
  });

  it('shows movie refresh success message', () => {
    mockRefreshMovieState.isSuccess = true;
    mockRefreshMovieState.data = { result: { castCount: 15, crewCount: 8 } };
    mockMovieSearchData.current = [
      {
        id: 'm1',
        title: 'Done Movie',
        release_date: '2024-01-01',
        tmdb_id: 500,
        tmdb_last_synced_at: null,
      },
    ];
    renderWithProvider(<RefreshTab />);
    const movieInput = screen.getByPlaceholderText('Search movie by title...');
    fireEvent.change(movieInput, { target: { value: 'Done' } });
    fireEvent.click(screen.getByText('Done Movie'));
    expect(screen.getByText(/15 cast, 8 crew/)).toBeInTheDocument();
  });

  it('shows movie refresh error message', () => {
    mockRefreshMovieState.isError = true;
    mockRefreshMovieState.error = new Error('TMDB rate limit exceeded');
    mockMovieSearchData.current = [
      {
        id: 'm1',
        title: 'Error Movie',
        release_date: '2024-01-01',
        tmdb_id: 600,
        tmdb_last_synced_at: null,
      },
    ];
    renderWithProvider(<RefreshTab />);
    const movieInput = screen.getByPlaceholderText('Search movie by title...');
    fireEvent.change(movieInput, { target: { value: 'Error' } });
    fireEvent.click(screen.getByText('Error Movie'));
    expect(screen.getByText('TMDB rate limit exceeded')).toBeInTheDocument();
  });

  it('shows actor search dropdown when results are available', () => {
    mockActorSearchData.current = [
      {
        id: 'a1',
        name: 'Mahesh Babu',
        tmdb_person_id: 100,
        photo_url: null,
        biography: null,
        birth_date: null,
      },
    ];
    renderWithProvider(<RefreshTab />);
    const actorInput = screen.getByPlaceholderText('Search actor by name...');
    fireEvent.change(actorInput, { target: { value: 'Mahesh' } });
    expect(screen.getByText('Mahesh Babu')).toBeInTheDocument();
  });

  it('selects an actor and shows details with bio/photo/dob status', () => {
    mockActorSearchData.current = [
      {
        id: 'a1',
        name: 'Prabhas',
        tmdb_person_id: 200,
        photo_url: 'https://img.com/p.jpg',
        biography: 'A great actor',
        birth_date: '1979-10-23',
      },
    ];
    renderWithProvider(<RefreshTab />);
    const actorInput = screen.getByPlaceholderText('Search actor by name...');
    fireEvent.change(actorInput, { target: { value: 'Prabhas' } });
    fireEvent.click(screen.getByText('Prabhas'));
    // Shows status indicators
    expect(screen.getAllByText(/Bio:/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Photo:/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/DOB:/)[0]).toBeInTheDocument();
  });

  it('disables refresh button when actor has no tmdb_person_id', () => {
    mockActorSearchData.current = [
      {
        id: 'a1',
        name: 'No TMDB Actor',
        tmdb_person_id: null,
        photo_url: null,
        biography: null,
        birth_date: null,
      },
    ];
    renderWithProvider(<RefreshTab />);
    const actorInput = screen.getByPlaceholderText('Search actor by name...');
    fireEvent.change(actorInput, { target: { value: 'No TMDB' } });
    fireEvent.click(screen.getByText('No TMDB Actor'));
    expect(screen.getByText('No TMDB person ID. Cannot refresh.')).toBeInTheDocument();
  });

  it('calls refreshActor mutate when Refresh from TMDB is clicked for actor', () => {
    mockActorSearchData.current = [
      {
        id: 'a1',
        name: 'Chiranjeevi',
        tmdb_person_id: 300,
        photo_url: null,
        biography: null,
        birth_date: null,
      },
    ];
    renderWithProvider(<RefreshTab />);
    const actorInput = screen.getByPlaceholderText('Search actor by name...');
    fireEvent.change(actorInput, { target: { value: 'Chiran' } });
    fireEvent.click(screen.getByText('Chiranjeevi'));
    const refreshButtons = screen.getAllByText('Refresh from TMDB');
    // Click the actor refresh button (last one)
    fireEvent.click(refreshButtons[refreshButtons.length - 1]);
    expect(mockRefreshActorMutate).toHaveBeenCalledWith('a1');
  });

  it('shows actor refresh success message', () => {
    mockRefreshActorState.isSuccess = true;
    mockRefreshActorState.data = { result: { fields: ['biography', 'photo_url'] } };
    mockActorSearchData.current = [
      {
        id: 'a1',
        name: 'Done Actor',
        tmdb_person_id: 400,
        photo_url: null,
        biography: null,
        birth_date: null,
      },
    ];
    renderWithProvider(<RefreshTab />);
    const actorInput = screen.getByPlaceholderText('Search actor by name...');
    fireEvent.change(actorInput, { target: { value: 'Done' } });
    fireEvent.click(screen.getByText('Done Actor'));
    expect(screen.getByText(/biography, photo_url/)).toBeInTheDocument();
  });

  it('shows actor refresh error message', () => {
    mockRefreshActorState.isError = true;
    mockRefreshActorState.error = new Error('Actor not found in TMDB');
    mockActorSearchData.current = [
      {
        id: 'a1',
        name: 'Error Actor',
        tmdb_person_id: 500,
        photo_url: null,
        biography: null,
        birth_date: null,
      },
    ];
    renderWithProvider(<RefreshTab />);
    const actorInput = screen.getByPlaceholderText('Search actor by name...');
    fireEvent.change(actorInput, { target: { value: 'Error' } });
    fireEvent.click(screen.getByText('Error Actor'));
    expect(screen.getByText('Actor not found in TMDB')).toBeInTheDocument();
  });
});
