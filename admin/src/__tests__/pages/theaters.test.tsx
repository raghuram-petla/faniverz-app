import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TheatersPage from '@/app/(dashboard)/theaters/page';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChangesWarning: vi.fn(),
}));

let mockIsReadOnly = false;

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    isReadOnly: mockIsReadOnly,
    isPHAdmin: false,
    productionHouseIds: [],
    canCreate: () => true,
    canDeleteTopLevel: () => true,
    canManageAdmin: () => true,
    role: 'super_admin',
    isSuperAdmin: true,
  }),
}));

vi.mock('@/hooks/useImpersonation', () => ({
  useEffectiveUser: () => ({
    id: 'user-1',
    role: 'super_admin',
    productionHouseIds: [],
    languageIds: [],
    languageCodes: [],
  }),
  useImpersonation: () => ({
    isImpersonating: false,
    effectiveUser: null,
    realUser: null,
    startImpersonation: vi.fn(),
    startRoleImpersonation: vi.fn(),
    stopImpersonation: vi.fn(),
  }),
}));

const mockAddMutateAsync = vi.fn().mockResolvedValue({});
const mockRemoveMutateAsync = vi.fn().mockResolvedValue({});

let mockTheaterMovies: Array<{
  id: string;
  title: string;
  poster_url: string | null;
  release_date: string | null;
}> = [];
let mockUpcomingMovies: Array<{
  id: string;
  title: string;
  poster_url: string | null;
  release_date: string | null;
}> = [];

vi.mock('@/hooks/useTheaterMovies', () => ({
  useTheaterMovies: () => ({
    data: mockTheaterMovies,
    isLoading: false,
  }),
  useUpcomingMovies: () => ({
    data: mockUpcomingMovies,
    isLoading: false,
  }),
  useTheaterSearch: () => ({
    data: [],
    isFetching: false,
  }),
  useAddToTheaters: () => ({
    mutateAsync: mockAddMutateAsync,
    isPending: false,
  }),
  useRemoveFromTheaters: () => ({
    mutateAsync: mockRemoveMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/hooks/useDebouncedSearch', () => ({
  useDebouncedSearch: () => ({
    search: '',
    setSearch: vi.fn(),
    debouncedSearch: '',
  }),
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
const capturedProps: Record<string, any> = {};

vi.mock('@/components/theaters/ManualAddPanel', () => ({
  ManualAddPanel: (props: any) => {
    capturedProps.ManualAddPanel = props;
    return (
      <div data-testid="manual-add-panel">
        <span>Add a Movie to &quot;In Theaters&quot;</span>
        <input placeholder="Search movies..." />
      </div>
    );
  },
}));

vi.mock('@/components/theaters/MovieColumn', () => ({
  MovieColumn: (props: any) => {
    const key = `MovieColumn_${props.title.replace(/\s+/g, '')}`;
    capturedProps[key] = props;
    return (
      <div data-testid={`column-${props.title.toLowerCase().replace(/\s+/g, '-')}`}>
        <span>{props.title}</span>
        {props.movies.length === 0 && <span>{props.emptyText}</span>}
        {props.movies.map((m: any) => (
          <div key={m.id} data-testid={`movie-${m.id}`}>
            {m.title}
          </div>
        ))}
      </div>
    );
  },
}));

vi.mock('@/components/theaters/PendingChangesSection', () => ({
  PendingChangesDock: (props: any) => {
    capturedProps.PendingChangesDock = props;
    return <div data-testid="pending-changes-dock" />;
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/theaters',
  useParams: () => ({}),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('TheatersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsReadOnly = false;
    mockTheaterMovies = [];
    mockUpcomingMovies = [];
    Object.keys(capturedProps).forEach((k) => delete capturedProps[k]);
  });

  it('renders "In Theaters" section heading', () => {
    renderWithProviders(<TheatersPage />);
    expect(screen.getByText('In Theaters')).toBeInTheDocument();
  });

  it('renders "Upcoming" section', () => {
    renderWithProviders(<TheatersPage />);
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
  });

  it('renders ManualAddPanel when not read-only', () => {
    renderWithProviders(<TheatersPage />);
    expect(screen.getByTestId('manual-add-panel')).toBeInTheDocument();
  });

  it('hides ManualAddPanel when read-only', () => {
    mockIsReadOnly = true;
    renderWithProviders(<TheatersPage />);
    expect(screen.queryByTestId('manual-add-panel')).not.toBeInTheDocument();
  });

  it('hides Save Changes button when no changes pending', () => {
    renderWithProviders(<TheatersPage />);
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
  });

  it('shows empty state when no movies are in theaters', () => {
    renderWithProviders(<TheatersPage />);
    expect(screen.getByText('No movies currently in theaters')).toBeInTheDocument();
  });

  it('shows "No upcoming releases" empty state', () => {
    renderWithProviders(<TheatersPage />);
    expect(screen.getByText('No upcoming releases')).toBeInTheDocument();
  });

  it('shows pending changes dock when a toggle is made', () => {
    mockUpcomingMovies = [
      { id: 'm1', title: 'Test Movie', poster_url: null, release_date: '2026-04-01' },
    ];
    renderWithProviders(<TheatersPage />);

    // Simulate toggling upcoming movie to "In Theaters"
    act(() => {
      capturedProps.MovieColumn_Upcoming.onToggle(
        { id: 'm1', title: 'Test Movie', poster_url: null, release_date: '2026-04-01' },
        '2026-03-22',
      );
    });

    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByText('Discard')).toBeInTheDocument();
    expect(screen.getByText(/1 unsaved change/)).toBeInTheDocument();
  });

  it('clicking Discard clears pending changes', () => {
    mockUpcomingMovies = [{ id: 'm1', title: 'Test Movie', poster_url: null, release_date: null }];
    renderWithProviders(<TheatersPage />);

    act(() => {
      capturedProps.MovieColumn_Upcoming.onToggle(
        { id: 'm1', title: 'Test Movie', poster_url: null, release_date: null },
        '2026-03-22',
      );
    });

    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Discard'));
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
  });

  it('handleSave calls addToTheaters for additions', async () => {
    mockUpcomingMovies = [{ id: 'm1', title: 'Test Movie', poster_url: null, release_date: null }];
    renderWithProviders(<TheatersPage />);

    act(() => {
      capturedProps.MovieColumn_Upcoming.onToggle(
        { id: 'm1', title: 'Test Movie', poster_url: null, release_date: null },
        '2026-03-22',
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Save Changes'));
    });

    expect(mockAddMutateAsync).toHaveBeenCalledWith({
      movieId: 'm1',
      startDate: '2026-03-22',
      label: null,
      premiereDate: null,
      newReleaseDate: null,
    });
  });

  it('handleSave calls removeFromTheaters for removals', async () => {
    mockTheaterMovies = [
      { id: 'm2', title: 'Theater Movie', poster_url: null, release_date: null },
    ];
    renderWithProviders(<TheatersPage />);

    act(() => {
      capturedProps.MovieColumn_InTheaters.onToggle(
        { id: 'm2', title: 'Theater Movie', poster_url: null, release_date: null },
        '2026-03-22',
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Save Changes'));
    });

    expect(mockRemoveMutateAsync).toHaveBeenCalledWith({
      movieId: 'm2',
      endDate: '2026-03-22',
    });
  });

  it('shows success message after saving', async () => {
    mockUpcomingMovies = [{ id: 'm1', title: 'Test Movie', poster_url: null, release_date: null }];
    renderWithProviders(<TheatersPage />);

    act(() => {
      capturedProps.MovieColumn_Upcoming.onToggle(
        { id: 'm1', title: 'Test Movie', poster_url: null, release_date: null },
        '2026-03-22',
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Save Changes'));
    });

    expect(screen.getByText(/Changes saved successfully/)).toBeInTheDocument();
  });

  it('handleSave resets to idle on error', async () => {
    mockAddMutateAsync.mockRejectedValueOnce(new Error('Network error'));
    mockUpcomingMovies = [{ id: 'm1', title: 'Test Movie', poster_url: null, release_date: null }];
    renderWithProviders(<TheatersPage />);

    act(() => {
      capturedProps.MovieColumn_Upcoming.onToggle(
        { id: 'm1', title: 'Test Movie', poster_url: null, release_date: null },
        '2026-03-22',
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Save Changes'));
    });

    // Should still show pending changes (not cleared on error)
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('removePendingChange removes a single pending change', () => {
    mockUpcomingMovies = [
      { id: 'm1', title: 'Movie 1', poster_url: null, release_date: null },
      { id: 'm2', title: 'Movie 2', poster_url: null, release_date: null },
    ];
    renderWithProviders(<TheatersPage />);

    act(() => {
      capturedProps.MovieColumn_Upcoming.onToggle(
        { id: 'm1', title: 'Movie 1', poster_url: null, release_date: null },
        '2026-03-22',
      );
    });
    act(() => {
      capturedProps.MovieColumn_Upcoming.onToggle(
        { id: 'm2', title: 'Movie 2', poster_url: null, release_date: null },
        '2026-03-22',
      );
    });

    expect(screen.getByText(/2 unsaved changes/)).toBeInTheDocument();

    act(() => {
      capturedProps.MovieColumn_Upcoming.onRevert('m1');
    });

    expect(screen.getByText(/1 unsaved change\b/)).toBeInTheDocument();
  });

  it('updatePendingDate updates date of an existing pending change', () => {
    mockUpcomingMovies = [{ id: 'm1', title: 'Movie 1', poster_url: null, release_date: null }];
    renderWithProviders(<TheatersPage />);

    act(() => {
      capturedProps.MovieColumn_Upcoming.onToggle(
        { id: 'm1', title: 'Movie 1', poster_url: null, release_date: null },
        '2026-03-22',
      );
    });

    act(() => {
      capturedProps.MovieColumn_Upcoming.onDateChange('m1', '2026-04-01');
    });

    // getPendingDate should return new date
    expect(capturedProps.MovieColumn_Upcoming.getPendingDate('m1')).toBe('2026-04-01');
  });

  it('updatePendingDate does nothing for non-existent movieId', () => {
    mockUpcomingMovies = [{ id: 'm1', title: 'Movie 1', poster_url: null, release_date: null }];
    renderWithProviders(<TheatersPage />);

    // No pending changes exist yet
    act(() => {
      capturedProps.MovieColumn_Upcoming.onDateChange('non-existent', '2026-04-01');
    });

    // Should not show any changes
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
  });

  it('isEffectivelyOn returns pending value when there is a pending change', () => {
    mockUpcomingMovies = [{ id: 'm1', title: 'Movie 1', poster_url: null, release_date: null }];
    renderWithProviders(<TheatersPage />);

    // Before toggle: server value is false for upcoming
    expect(capturedProps.MovieColumn_Upcoming.isEffectivelyOn('m1')).toBe(false);

    act(() => {
      capturedProps.MovieColumn_Upcoming.onToggle(
        { id: 'm1', title: 'Movie 1', poster_url: null, release_date: null },
        '2026-03-22',
      );
    });

    // After toggle: pending change says inTheaters=true
    expect(capturedProps.MovieColumn_Upcoming.isEffectivelyOn('m1')).toBe(true);
  });

  it('handleManualAdd adds a pending change from ManualAddPanel', () => {
    renderWithProviders(<TheatersPage />);

    act(() => {
      capturedProps.ManualAddPanel.onAdd(
        'manual-1',
        'Manual Movie',
        'http://poster.jpg',
        '2026-03-22',
        'Special screening',
        '2026-04-01',
      );
    });

    expect(screen.getByText(/1 unsaved change/)).toBeInTheDocument();
  });

  it('pluralizes "unsaved changes" correctly for 1 change', () => {
    mockUpcomingMovies = [{ id: 'm1', title: 'Movie 1', poster_url: null, release_date: null }];
    renderWithProviders(<TheatersPage />);

    act(() => {
      capturedProps.MovieColumn_Upcoming.onToggle(
        { id: 'm1', title: 'Movie 1', poster_url: null, release_date: null },
        '2026-03-22',
      );
    });

    expect(screen.getByText('1 unsaved change')).toBeInTheDocument();
  });

  it('Upcoming column getSubtitle returns day count for future date', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    mockUpcomingMovies = [
      { id: 'm1', title: 'Movie 1', poster_url: null, release_date: futureDateStr },
    ];
    renderWithProviders(<TheatersPage />);

    const subtitle = capturedProps.MovieColumn_Upcoming.getSubtitle({
      release_date: futureDateStr,
    });
    expect(subtitle).toBe('In 5 days');
  });

  it('Upcoming column getSubtitle returns "Today" for today', () => {
    const todayStr = new Date().toISOString().split('T')[0];
    mockUpcomingMovies = [{ id: 'm1', title: 'Movie 1', poster_url: null, release_date: todayStr }];
    renderWithProviders(<TheatersPage />);

    const subtitle = capturedProps.MovieColumn_Upcoming.getSubtitle({ release_date: todayStr });
    expect(subtitle).toBe('Today');
  });

  it('Upcoming column getSubtitle returns "Tomorrow" for tomorrow', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    mockUpcomingMovies = [
      { id: 'm1', title: 'Movie 1', poster_url: null, release_date: tomorrowStr },
    ];
    renderWithProviders(<TheatersPage />);

    const subtitle = capturedProps.MovieColumn_Upcoming.getSubtitle({
      release_date: tomorrowStr,
    });
    expect(subtitle).toBe('Tomorrow');
  });

  it('Upcoming column getSubtitle returns undefined when no release_date', () => {
    mockUpcomingMovies = [{ id: 'm1', title: 'Movie 1', poster_url: null, release_date: null }];
    renderWithProviders(<TheatersPage />);

    const subtitle = capturedProps.MovieColumn_Upcoming.getSubtitle({ release_date: null });
    expect(subtitle).toBeUndefined();
  });

  it('PendingChangesDock receives pending entries with correct shape', () => {
    mockUpcomingMovies = [
      { id: 'm1', title: 'Movie 1', poster_url: 'http://p.jpg', release_date: '2026-04-01' },
    ];
    renderWithProviders(<TheatersPage />);

    act(() => {
      capturedProps.MovieColumn_Upcoming.onToggle(
        { id: 'm1', title: 'Movie 1', poster_url: 'http://p.jpg', release_date: '2026-04-01' },
        '2026-03-22',
      );
    });

    expect(capturedProps.PendingChangesDock.changes).toEqual([
      expect.objectContaining({
        movieId: 'm1',
        inTheaters: true,
        date: '2026-03-22',
        title: 'Movie 1',
        posterUrl: 'http://p.jpg',
        releaseDate: '2026-04-01',
        dateAction: 'none',
      }),
    ]);
  });

  it('PendingChangesDock onDateActionChange updates the dateAction', () => {
    mockUpcomingMovies = [
      { id: 'm1', title: 'Movie 1', poster_url: null, release_date: '2026-04-01' },
    ];
    renderWithProviders(<TheatersPage />);

    act(() => {
      capturedProps.MovieColumn_Upcoming.onToggle(
        { id: 'm1', title: 'Movie 1', poster_url: null, release_date: '2026-04-01' },
        '2026-03-22',
      );
    });

    act(() => {
      capturedProps.PendingChangesDock.onDateActionChange('m1', 'premiere');
    });

    expect(capturedProps.PendingChangesDock.changes[0].dateAction).toBe('premiere');
  });

  it('updatePendingDateAction does nothing for non-existent movieId', () => {
    mockUpcomingMovies = [{ id: 'm1', title: 'Movie 1', poster_url: null, release_date: null }];
    renderWithProviders(<TheatersPage />);

    act(() => {
      capturedProps.PendingChangesDock?.onDateActionChange?.('non-existent', 'premiere');
    });

    // Should not crash or show changes
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
  });

  it('handleSave sends premiereDate when dateAction is premiere', async () => {
    mockUpcomingMovies = [
      { id: 'm1', title: 'Test Movie', poster_url: null, release_date: '2026-04-01' },
    ];
    renderWithProviders(<TheatersPage />);

    act(() => {
      capturedProps.MovieColumn_Upcoming.onToggle(
        { id: 'm1', title: 'Test Movie', poster_url: null, release_date: '2026-04-01' },
        '2026-03-22',
      );
    });

    act(() => {
      capturedProps.PendingChangesDock.onDateActionChange('m1', 'premiere');
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Save Changes'));
    });

    expect(mockAddMutateAsync).toHaveBeenCalledWith({
      movieId: 'm1',
      startDate: '2026-03-22',
      label: null,
      premiereDate: '2026-03-22',
      newReleaseDate: null,
    });
  });

  it('handleSave sends newReleaseDate when dateAction is release_changed', async () => {
    mockUpcomingMovies = [
      { id: 'm1', title: 'Test Movie', poster_url: null, release_date: '2026-04-01' },
    ];
    renderWithProviders(<TheatersPage />);

    act(() => {
      capturedProps.MovieColumn_Upcoming.onToggle(
        { id: 'm1', title: 'Test Movie', poster_url: null, release_date: '2026-04-01' },
        '2026-03-22',
      );
    });

    act(() => {
      capturedProps.PendingChangesDock.onDateActionChange('m1', 'release_changed');
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Save Changes'));
    });

    expect(mockAddMutateAsync).toHaveBeenCalledWith({
      movieId: 'm1',
      startDate: '2026-03-22',
      label: null,
      premiereDate: null,
      newReleaseDate: '2026-03-22',
    });
  });

  it('shows Saving... state during save', async () => {
    let resolveAdd: () => void;
    mockAddMutateAsync.mockImplementation(
      () => new Promise<void>((resolve) => (resolveAdd = resolve)),
    );
    mockUpcomingMovies = [{ id: 'm1', title: 'Test Movie', poster_url: null, release_date: null }];
    renderWithProviders(<TheatersPage />);

    act(() => {
      capturedProps.MovieColumn_Upcoming.onToggle(
        { id: 'm1', title: 'Test Movie', poster_url: null, release_date: null },
        '2026-03-22',
      );
    });

    act(() => {
      fireEvent.click(screen.getByText('Save Changes'));
    });

    expect(screen.getByText('Saving...')).toBeInTheDocument();

    await act(async () => {
      resolveAdd!();
    });

    await waitFor(() => {
      expect(screen.getByText(/Changes saved successfully/)).toBeInTheDocument();
    });
  });

  it('applies read-only overlay class when isReadOnly', () => {
    mockIsReadOnly = true;
    renderWithProviders(<TheatersPage />);
    const grid = screen.getByTestId('column-in-theaters').parentElement;
    expect(grid?.className).toContain('pointer-events-none');
    expect(grid?.className).toContain('opacity-70');
  });
});
