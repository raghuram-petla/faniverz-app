import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockLookupMutate = vi.hoisted(() => vi.fn());
const mockLookupReset = vi.hoisted(() => vi.fn());
const mockImportMutateAsync = vi.hoisted(() => vi.fn());
const mockRefreshActorMutateAsync = vi.hoisted(() => vi.fn());
const mockLookupData = vi.hoisted(() => ({ current: undefined as unknown }));
const mockLookupState = vi.hoisted(() => ({
  isPending: false,
  isError: false,
  error: null as Error | null,
}));
const mockImportState = vi.hoisted(() => ({
  isPending: false,
  isSuccess: false,
}));
const mockRefreshActorState = vi.hoisted(() => ({
  isPending: false,
  isSuccess: false,
  data: null as { result: { fields: string[] } } | null,
}));

vi.mock('@/hooks/useSync', () => ({
  useTmdbLookup: () => ({
    mutate: mockLookupMutate,
    reset: mockLookupReset,
    data: mockLookupData.current,
    isPending: mockLookupState.isPending,
    isError: mockLookupState.isError,
    error: mockLookupState.error,
  }),
  useImportMovies: () => ({
    mutateAsync: mockImportMutateAsync,
    isPending: mockImportState.isPending,
    isSuccess: mockImportState.isSuccess,
  }),
  useRefreshActor: () => ({
    mutateAsync: mockRefreshActorMutateAsync,
    isPending: mockRefreshActorState.isPending,
    isSuccess: mockRefreshActorState.isSuccess,
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
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    functions: { invoke: vi.fn() },
  },
}));

import { ImportTab } from '@/components/sync/ImportTab';

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderWithProvider(ui: React.ReactElement) {
  const qc = createQueryClient();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockLookupData.current = undefined;
  mockLookupState.isPending = false;
  mockLookupState.isError = false;
  mockLookupState.error = null;
  mockImportState.isPending = false;
  mockImportState.isSuccess = false;
  mockRefreshActorState.isPending = false;
  mockRefreshActorState.isSuccess = false;
  mockRefreshActorState.data = null;
});

describe('ImportTab', () => {
  it('renders the lookup form with type select, TMDB ID input, and Lookup button', () => {
    renderWithProvider(<ImportTab />);
    expect(screen.getByText('Import by TMDB ID')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Lookup')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. 823464')).toBeInTheDocument();
  });

  it('renders Movie and Person options in the type select', () => {
    renderWithProvider(<ImportTab />);
    expect(screen.getByText('Movie')).toBeInTheDocument();
    expect(screen.getByText('Person')).toBeInTheDocument();
  });

  it('disables Lookup button when TMDB ID is empty', () => {
    renderWithProvider(<ImportTab />);
    const lookupBtn = screen.getByText('Lookup');
    expect(lookupBtn).toBeDisabled();
  });

  it('enables Lookup button when TMDB ID is entered', () => {
    renderWithProvider(<ImportTab />);
    fireEvent.change(screen.getByPlaceholderText('e.g. 823464'), {
      target: { value: '12345' },
    });
    const lookupBtn = screen.getByText('Lookup');
    expect(lookupBtn).not.toBeDisabled();
  });

  it('calls lookup mutate with movie type and TMDB ID when Lookup is clicked', () => {
    renderWithProvider(<ImportTab />);
    fireEvent.change(screen.getByPlaceholderText('e.g. 823464'), {
      target: { value: '823464' },
    });
    fireEvent.click(screen.getByText('Lookup'));
    expect(mockLookupMutate).toHaveBeenCalledWith({ tmdbId: 823464, type: 'movie' });
  });

  it('calls lookup mutate when Enter key is pressed in the input', () => {
    renderWithProvider(<ImportTab />);
    const input = screen.getByPlaceholderText('e.g. 823464');
    fireEvent.change(input, { target: { value: '99999' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockLookupMutate).toHaveBeenCalledWith({ tmdbId: 99999, type: 'movie' });
  });

  it('shows error message when lookup fails', () => {
    mockLookupState.isError = true;
    mockLookupState.error = new Error('TMDB ID not found');
    renderWithProvider(<ImportTab />);
    expect(screen.getByText('TMDB ID not found')).toBeInTheDocument();
  });

  it('shows generic error when lookup error is not an Error instance', () => {
    mockLookupState.isError = true;
    mockLookupState.error = null;
    renderWithProvider(<ImportTab />);
    expect(screen.getByText('Lookup failed')).toBeInTheDocument();
  });

  it('shows movie preview when movie result is returned', () => {
    mockLookupData.current = {
      type: 'movie',
      existsInDb: false,
      existingId: null,
      data: {
        tmdbId: 823464,
        title: 'Pushpa 2',
        overview: 'A sequel to Pushpa',
        releaseDate: '2024-12-05',
        runtime: 180,
        genres: ['Action', 'Drama'],
        posterUrl: 'https://image.tmdb.org/t/p/w200/poster.jpg',
        backdropUrl: null,
        director: 'Sukumar',
        castCount: 25,
        crewCount: 10,
      },
    };
    renderWithProvider(<ImportTab />);
    expect(screen.getByText('Pushpa 2')).toBeInTheDocument();
    expect(screen.getByText('2024-12-05')).toBeInTheDocument();
    expect(screen.getByText('180 min')).toBeInTheDocument();
    expect(screen.getByText('Sukumar')).toBeInTheDocument();
    expect(screen.getByText('Action, Drama')).toBeInTheDocument();
    expect(screen.getByText('25 members')).toBeInTheDocument();
    expect(screen.getByText('A sequel to Pushpa')).toBeInTheDocument();
  });

  it('shows "Not in database" for new movies', () => {
    mockLookupData.current = {
      type: 'movie',
      existsInDb: false,
      existingId: null,
      data: {
        tmdbId: 1,
        title: 'New',
        overview: '',
        releaseDate: '',
        runtime: null,
        genres: [],
        posterUrl: null,
        backdropUrl: null,
        director: null,
        castCount: 0,
        crewCount: 0,
      },
    };
    renderWithProvider(<ImportTab />);
    expect(screen.getByText('Not in database')).toBeInTheDocument();
    expect(screen.getByText('Import Movie')).toBeInTheDocument();
  });

  it('shows "Already in database" for existing movies', () => {
    mockLookupData.current = {
      type: 'movie',
      existsInDb: true,
      existingId: 'abc-123',
      data: {
        tmdbId: 1,
        title: 'Existing',
        overview: '',
        releaseDate: '',
        runtime: null,
        genres: [],
        posterUrl: null,
        backdropUrl: null,
        director: null,
        castCount: 0,
        crewCount: 0,
      },
    };
    renderWithProvider(<ImportTab />);
    expect(screen.getByText('Already in database')).toBeInTheDocument();
    expect(screen.getByText('Re-sync from TMDB')).toBeInTheDocument();
  });

  it('shows person preview when person result is returned', () => {
    mockLookupData.current = {
      type: 'person',
      existsInDb: true,
      existingId: 'actor-1',
      data: {
        tmdbPersonId: 456,
        name: 'Allu Arjun',
        biography: 'A famous actor',
        birthday: '1983-04-08',
        placeOfBirth: 'Chennai, India',
        photoUrl: 'https://image.tmdb.org/t/p/w200/photo.jpg',
        gender: 2,
      },
    };
    renderWithProvider(<ImportTab />);
    expect(screen.getByText('Allu Arjun')).toBeInTheDocument();
    expect(screen.getByText('1983-04-08')).toBeInTheDocument();
    expect(screen.getByText('Chennai, India')).toBeInTheDocument();
    expect(screen.getByText('A famous actor')).toBeInTheDocument();
    expect(screen.getByText('In database')).toBeInTheDocument();
    expect(screen.getByText('Refresh from TMDB')).toBeInTheDocument();
  });

  it('shows "Not in database" message for person not in DB', () => {
    mockLookupData.current = {
      type: 'person',
      existsInDb: false,
      existingId: null,
      data: {
        tmdbPersonId: 789,
        name: 'New Actor',
        biography: null,
        birthday: null,
        placeOfBirth: null,
        photoUrl: null,
        gender: 0,
      },
    };
    renderWithProvider(<ImportTab />);
    expect(screen.getByText('Not in database — import via movie import')).toBeInTheDocument();
  });

  it('shows import success message', () => {
    mockImportState.isSuccess = true;
    renderWithProvider(<ImportTab />);
    expect(screen.getByText('Import completed successfully.')).toBeInTheDocument();
  });

  it('shows actor refresh success message with updated fields', () => {
    mockRefreshActorState.isSuccess = true;
    mockRefreshActorState.data = { result: { fields: ['biography', 'photo_url'] } };
    renderWithProvider(<ImportTab />);
    expect(screen.getByText(/Actor refreshed successfully/)).toBeInTheDocument();
    expect(screen.getByText(/biography, photo_url/)).toBeInTheDocument();
  });

  it('renders movie poster when posterUrl is provided', () => {
    mockLookupData.current = {
      type: 'movie',
      existsInDb: false,
      existingId: null,
      data: {
        tmdbId: 1,
        title: 'With Poster',
        overview: '',
        releaseDate: '',
        runtime: null,
        genres: [],
        posterUrl: 'https://example.com/poster.jpg',
        backdropUrl: null,
        director: null,
        castCount: 0,
        crewCount: 0,
      },
    };
    renderWithProvider(<ImportTab />);
    const img = screen.getByAltText('With Poster') as HTMLImageElement;
    expect(img.src).toBe('https://example.com/poster.jpg');
  });

  it('renders person photo when photoUrl is provided', () => {
    mockLookupData.current = {
      type: 'person',
      existsInDb: false,
      existingId: null,
      data: {
        tmdbPersonId: 1,
        name: 'Photo Person',
        biography: null,
        birthday: null,
        placeOfBirth: null,
        photoUrl: 'https://example.com/photo.jpg',
        gender: 0,
      },
    };
    renderWithProvider(<ImportTab />);
    const img = screen.getByAltText('Photo Person') as HTMLImageElement;
    expect(img.src).toBe('https://example.com/photo.jpg');
  });

  it('shows dash for missing optional movie fields', () => {
    mockLookupData.current = {
      type: 'movie',
      existsInDb: false,
      existingId: null,
      data: {
        tmdbId: 1,
        title: 'Sparse',
        overview: '',
        releaseDate: '',
        runtime: null,
        genres: [],
        posterUrl: null,
        backdropUrl: null,
        director: null,
        castCount: 0,
        crewCount: 0,
      },
    };
    renderWithProvider(<ImportTab />);
    // Release, Runtime, Director, Genres all show dash
    const dashes = screen.getAllByText('\u2014');
    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });
});
