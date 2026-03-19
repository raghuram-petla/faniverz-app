import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockLookupMutate = vi.hoisted(() => vi.fn());
const mockLookupReset = vi.hoisted(() => vi.fn());
const mockLookupState = vi.hoisted(() => ({
  isPending: false,
  isError: false,
  data: undefined as unknown,
}));

vi.mock('@/hooks/useSync', () => ({
  useTmdbLookup: () => ({
    mutate: mockLookupMutate,
    reset: mockLookupReset,
    isPending: mockLookupState.isPending,
    isError: mockLookupState.isError,
    data: mockLookupState.data,
  }),
  useImportActor: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isSuccess: false,
    data: null,
  }),
  useRefreshActor: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isSuccess: false,
    data: null,
  }),
}));

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    functions: { invoke: vi.fn() },
  },
}));

import { ActorSearchResults } from '@/components/sync/ActorSearchResults';

function renderWithProvider(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockLookupState.isPending = false;
  mockLookupState.isError = false;
  mockLookupState.data = undefined;
});

const makeActors = (
  items: Array<{
    id: number;
    name: string;
    profile_path?: string | null;
    known_for_department?: string | null;
  }>,
) => items.map((a) => ({ profile_path: null, known_for_department: 'Acting', ...a }));

describe('ActorSearchResults', () => {
  it('renders actor heading with count', () => {
    renderWithProvider(
      <ActorSearchResults
        actors={makeActors([{ id: 1, name: 'Actor A' }])}
        existingSet={new Set()}
      />,
    );
    expect(screen.getByText('Actors (1)')).toBeInTheDocument();
  });

  it('shows "In DB" badge for existing actors', () => {
    renderWithProvider(
      <ActorSearchResults
        actors={makeActors([{ id: 1, name: 'Existing' }])}
        existingSet={new Set([1])}
      />,
    );
    expect(screen.getByText('In DB')).toBeInTheDocument();
  });

  it('shows "Not in DB" badge for new actors', () => {
    renderWithProvider(
      <ActorSearchResults actors={makeActors([{ id: 1, name: 'New' }])} existingSet={new Set()} />,
    );
    expect(screen.getByText('Not in DB')).toBeInTheDocument();
  });

  it('shows Details button on actor cards', () => {
    renderWithProvider(
      <ActorSearchResults actors={makeActors([{ id: 1, name: 'A' }])} existingSet={new Set()} />,
    );
    expect(screen.getByText('Details')).toBeInTheDocument();
  });

  it('calls lookup when Details is clicked', () => {
    renderWithProvider(
      <ActorSearchResults
        actors={makeActors([{ id: 99, name: 'Lookup Me' }])}
        existingSet={new Set()}
      />,
    );
    fireEvent.click(screen.getByText('Details'));
    expect(mockLookupMutate).toHaveBeenCalledWith({ tmdbId: 99, type: 'person' });
  });

  it('shows Hide button when actor is selected', () => {
    renderWithProvider(
      <ActorSearchResults
        actors={makeActors([{ id: 99, name: 'Selected' }])}
        existingSet={new Set()}
      />,
    );
    fireEvent.click(screen.getByText('Details'));
    expect(screen.getByText('Hide')).toBeInTheDocument();
  });
});
