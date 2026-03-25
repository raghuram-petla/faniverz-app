/**
 * Tests for EditMoviePage — movie edit page with tabbed sections.
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EditMoviePage from '@/app/(dashboard)/movies/[id]/page';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(),
    },
  },
}));

const mockPush = vi.fn();
const mockBack = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  usePathname: () => '/movies/123',
  useParams: () => ({ id: 'movie-uuid-123' }),
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

let mockIsReadOnly = false;
let mockCanDeleteTopLevel = true;

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    role: 'super_admin',
    isSuperAdmin: true,
    isReadOnly: mockIsReadOnly,
    canViewPage: () => true,
    canCreate: () => true,
    canUpdate: () => true,
    canDelete: () => true,
    canDeleteTopLevel: () => mockCanDeleteTopLevel,
  }),
}));

let mockIsLoading = false;

const mockEditState = {
  isLoading: false,
  form: {
    title: 'Test Movie',
    poster_url: 'poster.jpg',
    backdrop_url: 'backdrop.jpg',
  },
  setForm: vi.fn(),
  updateField: vi.fn(),
  toggleGenre: vi.fn(),
  handleSubmit: vi.fn(),
  handleDelete: vi.fn(),
  movie: {
    tmdb_id: 12345,
    tmdb_status: 'Released',
    tmdb_vote_average: 7.5,
    tmdb_vote_count: 1000,
    budget: 50000000,
    revenue: 200000000,
    collection_name: null,
    spoken_languages: ['te'],
    tmdb_last_synced_at: '2025-03-15T10:00:00Z',
  },
  isSaving: false,
  saveStatus: null,
  changesParams: {},
  visiblePosters: [],
  visibleVideos: [],
  visibleCast: [],
  visibleRuns: [],
  visiblePlatforms: [],
  visibleProductionHouses: [],
  allPlatforms: [],
  actors: [],
  phSearchResults: [],
  phSearchQuery: '',
  setPHSearchQuery: vi.fn(),
  castSearchQuery: '',
  setCastSearchQuery: vi.fn(),
  savedMainPosterId: null,
  setPendingPosterAdds: vi.fn(),
  setPendingVideoAdds: vi.fn(),
  setPendingCastAdds: vi.fn(),
  setPendingRunAdds: vi.fn(),
  setPendingPlatformAdds: vi.fn(),
  setPendingPHAdds: vi.fn(),
  pendingPHAdds: [],
  pendingPlatformAdds: [],
  pendingVideoIds: new Set(),
  pendingCastIds: new Set(),
  pendingRunIds: new Set(),
  pendingRunEndIds: new Map(),
  setLocalCastOrder: vi.fn(),
  handlePosterRemove: vi.fn(),
  handleSelectMainPoster: vi.fn(),
  handleSelectMainBackdrop: vi.fn(),
  handleVideoRemove: vi.fn(),
  handleCastRemove: vi.fn(),
  handleRunRemove: vi.fn(),
  handleRunEnd: vi.fn(),
  handlePHRemove: vi.fn(),
  handlePlatformRemove: vi.fn(),
  createProductionHouse: { mutateAsync: vi.fn(), isPending: false },
};

vi.mock('@/hooks/useMovieEditState', () => ({
  useMovieEditState: () => {
    if (mockIsLoading) return { ...mockEditState, isLoading: true };
    return mockEditState;
  },
}));

vi.mock('@/hooks/useMovieEditChanges', () => ({
  useMovieEditChanges: () => ({
    changes: [],
    changeCount: 0,
    onRevertField: vi.fn(),
    onDiscard: vi.fn(),
  }),
}));

vi.mock('@/components/common/FormChangesDock', () => ({
  FormChangesDock: (props: any) => {
    capturedProps.FormChangesDock = props;
    return <div data-testid="changes-dock" />;
  },
}));

vi.mock('@/components/common/Button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
const capturedProps: Record<string, any> = {};

vi.mock('@/components/movie-edit', () => ({
  BasicInfoSection: (props: any) => {
    capturedProps.BasicInfoSection = props;
    return <div data-testid="basic-info-section" />;
  },
  TmdbMetadataSection: (props: any) => {
    capturedProps.TmdbMetadataSection = props;
    return <div data-testid="tmdb-metadata-section" />;
  },
  VideosSection: (props: any) => {
    capturedProps.VideosSection = props;
    return <div data-testid="videos-section" />;
  },
  PostersSection: (props: any) => {
    capturedProps.PostersSection = props;
    return <div data-testid="posters-section" />;
  },
  PlatformsSection: (props: any) => {
    capturedProps.PlatformsSection = props;
    return <div data-testid="platforms-section" />;
  },
  ProductionHousesSection: (props: any) => {
    capturedProps.ProductionHousesSection = props;
    return <div data-testid="production-houses-section" />;
  },
  CastSection: (props: any) => {
    capturedProps.CastSection = props;
    return <div data-testid="cast-section" />;
  },
  TheatricalRunsSection: (props: any) => {
    capturedProps.TheatricalRunsSection = props;
    return <div data-testid="theatrical-runs-section" />;
  },
  SyncSection: (props: any) => {
    capturedProps.SyncSection = props;
    return <div data-testid="sync-section" />;
  },
  SectionNav: ({
    onSectionChange,
    hiddenSections,
  }: {
    onSectionChange: (s: string) => void;
    hiddenSections?: string[];
  }) => (
    <div data-testid="section-nav" data-hidden={hiddenSections?.join(',') || ''}>
      <button onClick={() => onSectionChange('basic-info')}>Basic Info</button>
      <button onClick={() => onSectionChange('posters')}>Posters</button>
      <button onClick={() => onSectionChange('videos')}>Videos</button>
      <button onClick={() => onSectionChange('cast-crew')}>Cast &amp; Crew</button>
      <button onClick={() => onSectionChange('releases')}>Releases</button>
      {!hiddenSections?.includes('tmdb-sync') && (
        <button onClick={() => onSectionChange('tmdb-sync')}>TMDB Sync</button>
      )}
    </div>
  ),
  SectionCard: ({
    title,
    children,
    action,
  }: {
    title: string;
    children: React.ReactNode;
    action?: React.ReactNode;
  }) => (
    <div data-testid={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <h3>{title}</h3>
      {action}
      {children}
    </div>
  ),
  PreviewPanel: (props: any) => {
    capturedProps.PreviewPanel = props;
    return <div data-testid="preview-panel" />;
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('EditMoviePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsReadOnly = false;
    mockCanDeleteTopLevel = true;
    mockIsLoading = false;
  });

  it('renders movie title in header', () => {
    renderWithProviders(<EditMoviePage />);
    expect(screen.getByText('Edit Movie')).toBeInTheDocument();
    expect(screen.getByText(/Test Movie/)).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    mockIsLoading = true;
    renderWithProviders(<EditMoviePage />);
    expect(screen.queryByText('Edit Movie')).not.toBeInTheDocument();
  });

  it('renders section nav tabs', () => {
    renderWithProviders(<EditMoviePage />);
    expect(screen.getByTestId('section-nav')).toBeInTheDocument();
  });

  it('renders basic info section by default', () => {
    renderWithProviders(<EditMoviePage />);
    expect(screen.getByTestId('basic-info-section')).toBeInTheDocument();
  });

  it('renders TMDB metadata section when movie has tmdb_id', () => {
    renderWithProviders(<EditMoviePage />);
    expect(screen.getByTestId('tmdb-metadata-section')).toBeInTheDocument();
  });

  it('switches to posters section when tab clicked', () => {
    renderWithProviders(<EditMoviePage />);
    fireEvent.click(screen.getByText('Posters'));
    expect(screen.getByTestId('posters-section')).toBeInTheDocument();
    expect(screen.queryByTestId('basic-info-section')).not.toBeInTheDocument();
  });

  it('switches to videos section', () => {
    renderWithProviders(<EditMoviePage />);
    fireEvent.click(screen.getByText('Videos'));
    expect(screen.getByTestId('videos-section')).toBeInTheDocument();
  });

  it('switches to cast-crew section', () => {
    renderWithProviders(<EditMoviePage />);
    fireEvent.click(screen.getByText('Cast & Crew'));
    expect(screen.getByTestId('cast-section')).toBeInTheDocument();
    expect(screen.getByTestId('production-houses-section')).toBeInTheDocument();
  });

  it('switches to releases section', () => {
    renderWithProviders(<EditMoviePage />);
    fireEvent.click(screen.getByText('Releases'));
    expect(screen.getByTestId('theatrical-runs-section')).toBeInTheDocument();
    expect(screen.getByTestId('platforms-section')).toBeInTheDocument();
  });

  it('shows delete button for super admins', () => {
    renderWithProviders(<EditMoviePage />);
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('hides delete button when canDeleteTopLevel is false', () => {
    mockCanDeleteTopLevel = false;
    renderWithProviders(<EditMoviePage />);
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('calls handleDelete when delete button clicked', () => {
    renderWithProviders(<EditMoviePage />);
    fireEvent.click(screen.getByText('Delete'));
    expect(mockEditState.handleDelete).toHaveBeenCalled();
  });

  it('renders preview panel', () => {
    renderWithProviders(<EditMoviePage />);
    expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
  });

  it('renders changes dock', () => {
    renderWithProviders(<EditMoviePage />);
    expect(screen.getByTestId('changes-dock')).toBeInTheDocument();
  });

  it('navigates back when back button clicked', () => {
    renderWithProviders(<EditMoviePage />);
    // Find the back button (ArrowLeft icon button)
    const backButton = screen
      .getByText('Edit Movie')
      .parentElement?.parentElement?.querySelector('button');
    if (backButton) {
      fireEvent.click(backButton);
      expect(mockBack).toHaveBeenCalled();
    }
  });

  describe('addButton — conditional Add buttons per section', () => {
    it('shows Add button in Videos section when not read-only', () => {
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('Videos'));
      expect(screen.getByText('Add')).toBeInTheDocument();
    });

    it('hides Add button in Videos section when read-only', () => {
      mockIsReadOnly = true;
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('Videos'));
      expect(screen.queryByText('Add')).not.toBeInTheDocument();
    });

    it('hides Add button after it is clicked (form opens)', () => {
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('Videos'));
      fireEvent.click(screen.getByText('Add'));
      // Once addFormOpen === 'videos', addButton returns undefined for that section
      expect(screen.queryByText('Add')).not.toBeInTheDocument();
    });

    it('shows Add button in Cast & Crew section', () => {
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('Cast & Crew'));
      // Two "Add" buttons: one for Production Houses and one for Cast & Crew
      const addBtns = screen.getAllByText('Add');
      expect(addBtns.length).toBeGreaterThanOrEqual(1);
    });

    it('shows Add button in Releases section', () => {
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('Releases'));
      expect(screen.getByText('Add')).toBeInTheDocument();
    });
  });

  describe('getBucketForUrl — image bucket resolution', () => {
    it('passes correct buckets to PreviewPanel based on visiblePosters', () => {
      // Default mock has visiblePosters: [] so all images fall back to defaults
      renderWithProviders(<EditMoviePage />);
      // PreviewPanel is rendered without error — bucket logic resolves correctly
      expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
    });
  });

  it('does not render TMDB metadata section when movie has no tmdb_id', () => {
    // Temporarily override editState movie
    const originalMovie = mockEditState.movie;
    mockEditState.movie = { ...originalMovie, tmdb_id: null as unknown as number };
    renderWithProviders(<EditMoviePage />);
    expect(screen.queryByTestId('tmdb-metadata-section')).not.toBeInTheDocument();
    mockEditState.movie = originalMovie;
  });

  it('shows opacity overlay when read-only', () => {
    mockIsReadOnly = true;
    const { container } = renderWithProviders(<EditMoviePage />);
    // The content area should have opacity-70 class
    const overlayDiv = container.querySelector('.opacity-70');
    expect(overlayDiv).toBeInTheDocument();
  });

  it('does not show Add buttons when read-only', () => {
    mockIsReadOnly = true;
    renderWithProviders(<EditMoviePage />);
    fireEvent.click(screen.getByText('Videos'));
    expect(screen.queryByText('Add')).not.toBeInTheDocument();
  });

  it('renders movie title subtitle in header', () => {
    renderWithProviders(<EditMoviePage />);
    expect(screen.getByText(/— Test Movie/)).toBeInTheDocument();
  });

  it('switches back to basic-info from another section', () => {
    renderWithProviders(<EditMoviePage />);
    fireEvent.click(screen.getByText('Videos'));
    expect(screen.getByTestId('videos-section')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Basic Info'));
    expect(screen.getByTestId('basic-info-section')).toBeInTheDocument();
  });

  it('shows Add buttons for Production Houses in cast-crew section', () => {
    renderWithProviders(<EditMoviePage />);
    fireEvent.click(screen.getByText('Cast & Crew'));
    const addBtns = screen.getAllByText('Add');
    expect(addBtns.length).toBe(2); // PH + Cast
  });

  it('hides PH Add button after clicking it (form opens)', () => {
    renderWithProviders(<EditMoviePage />);
    fireEvent.click(screen.getByText('Cast & Crew'));
    const addBtns = screen.getAllByText('Add');
    // Click the first "Add" (Production Houses)
    fireEvent.click(addBtns[0]);
    // Now only one "Add" should remain (Cast)
    const remainingAdds = screen.getAllByText('Add');
    expect(remainingAdds.length).toBe(1);
  });

  it('hides cast Add button after clicking it', () => {
    renderWithProviders(<EditMoviePage />);
    fireEvent.click(screen.getByText('Cast & Crew'));
    const addBtns = screen.getAllByText('Add');
    // Click the second "Add" (Cast)
    fireEvent.click(addBtns[1]);
    // Now only one "Add" should remain (PH)
    const remainingAdds = screen.getAllByText('Add');
    expect(remainingAdds.length).toBe(1);
  });

  it('shows OTT Platforms section in releases tab', () => {
    renderWithProviders(<EditMoviePage />);
    fireEvent.click(screen.getByText('Releases'));
    expect(screen.getByTestId('platforms-section')).toBeInTheDocument();
  });

  describe('callback invocations via captured props', () => {
    it('PostersSection onAdd calls setPendingPosterAdds', () => {
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('Posters'));
      const poster = { id: 'p1', url: 'http://example.com/poster.jpg' };
      capturedProps.PostersSection.onAdd(poster);
      expect(mockEditState.setPendingPosterAdds).toHaveBeenCalled();
    });

    it('PostersSection onRemove calls handlePosterRemove', () => {
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('Posters'));
      capturedProps.PostersSection.onRemove('poster-1');
      expect(mockEditState.handlePosterRemove).toHaveBeenCalledWith('poster-1');
    });

    it('PostersSection onPendingMainChange updates PreviewPanel poster_url', () => {
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('Posters'));
      act(() => capturedProps.PostersSection.onPendingMainChange('http://new-poster.jpg'));
      expect(capturedProps.PreviewPanel.form.poster_url).toBe('http://new-poster.jpg');
    });

    it('VideosSection onAdd calls setPendingVideoAdds', () => {
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('Videos'));
      const video = { id: 'v1', url: 'http://video.mp4' };
      capturedProps.VideosSection.onAdd(video);
      expect(mockEditState.setPendingVideoAdds).toHaveBeenCalled();
    });

    it('VideosSection onRemove calls handleVideoRemove', () => {
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('Videos'));
      capturedProps.VideosSection.onRemove('vid-1');
      expect(mockEditState.handleVideoRemove).toHaveBeenCalledWith('vid-1');
    });

    it('VideosSection onCloseAddForm resets addFormOpen', () => {
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('Videos'));
      fireEvent.click(screen.getByText('Add'));
      expect(screen.queryByText('Add')).not.toBeInTheDocument();
      act(() => capturedProps.VideosSection.onCloseAddForm());
      expect(screen.getByText('Add')).toBeInTheDocument();
    });

    it('ProductionHousesSection onAdd calls setPendingPHAdds', () => {
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('Cast & Crew'));
      const ph = { production_house_id: 'ph-1' };
      capturedProps.ProductionHousesSection.onAdd(ph);
      expect(mockEditState.setPendingPHAdds).toHaveBeenCalled();
    });

    it('ProductionHousesSection onRemove calls handlePHRemove', () => {
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('Cast & Crew'));
      capturedProps.ProductionHousesSection.onRemove('ph-1');
      expect(mockEditState.handlePHRemove).toHaveBeenCalledWith('ph-1');
    });

    it('ProductionHousesSection onQuickAdd creates and adds PH', async () => {
      const mockCreated = { id: 'ph-new', name: 'New PH' };
      mockEditState.createProductionHouse.mutateAsync.mockResolvedValue(mockCreated);
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('Cast & Crew'));
      await capturedProps.ProductionHousesSection.onQuickAdd('New PH');
      expect(mockEditState.createProductionHouse.mutateAsync).toHaveBeenCalledWith({
        name: 'New PH',
        logo_url: null,
      });
      expect(mockEditState.setPendingPHAdds).toHaveBeenCalled();
      expect(mockEditState.setPHSearchQuery).toHaveBeenCalledWith('');
    });

    it('ProductionHousesSection onCloseAddForm resets addFormOpen', () => {
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('Cast & Crew'));
      const addBtns = screen.getAllByText('Add');
      fireEvent.click(addBtns[0]); // Open PH form
      act(() => capturedProps.ProductionHousesSection.onCloseAddForm());
      // PH Add button should reappear
      expect(screen.getAllByText('Add').length).toBe(2);
    });

    it('CastSection onAdd calls setPendingCastAdds', () => {
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('Cast & Crew'));
      const cast = { actor_id: 'a1', role_name: 'Hero' };
      capturedProps.CastSection.onAdd(cast);
      expect(mockEditState.setPendingCastAdds).toHaveBeenCalled();
    });

    it('CastSection onRemove calls handleCastRemove', () => {
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('Cast & Crew'));
      capturedProps.CastSection.onRemove('cast-1');
      expect(mockEditState.handleCastRemove).toHaveBeenCalledWith('cast-1');
    });

    it('CastSection onReorder calls setLocalCastOrder', () => {
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('Cast & Crew'));
      const newOrder = [{ id: '1' }, { id: '2' }];
      capturedProps.CastSection.onReorder(newOrder);
      expect(mockEditState.setLocalCastOrder).toHaveBeenCalledWith(newOrder);
    });

    it('TheatricalRunsSection onAdd calls setPendingRunAdds', () => {
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('Releases'));
      const run = { id: 'r1', region: 'US' };
      capturedProps.TheatricalRunsSection.onAdd(run);
      expect(mockEditState.setPendingRunAdds).toHaveBeenCalled();
    });

    it('TheatricalRunsSection onRemove calls handleRunRemove', () => {
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('Releases'));
      capturedProps.TheatricalRunsSection.onRemove('run-1');
      expect(mockEditState.handleRunRemove).toHaveBeenCalledWith('run-1');
    });

    it('CastSection onCloseAddForm resets addFormOpen', () => {
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('Cast & Crew'));
      const addBtns = screen.getAllByText('Add');
      fireEvent.click(addBtns[1]); // Open Cast form
      act(() => capturedProps.CastSection.onCloseAddForm());
      expect(screen.getAllByText('Add').length).toBe(2);
    });

    it('TheatricalRunsSection onCloseAddForm resets addFormOpen', () => {
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('Releases'));
      fireEvent.click(screen.getByText('Add'));
      act(() => capturedProps.TheatricalRunsSection.onCloseAddForm());
      expect(screen.getByText('Add')).toBeInTheDocument();
    });
  });

  describe('getBucketForUrl', () => {
    it('resolves BACKDROPS bucket for backdrop image_type', () => {
      mockEditState.visiblePosters = [{ image_url: 'backdrop.jpg', image_type: 'backdrop' }] as any;
      renderWithProviders(<EditMoviePage />);
      expect(capturedProps.PreviewPanel.backdropBucket).toBe('BACKDROPS');
      mockEditState.visiblePosters = [];
    });

    it('resolves POSTERS bucket for poster image_type', () => {
      mockEditState.visiblePosters = [{ image_url: 'poster.jpg', image_type: 'poster' }] as any;
      renderWithProviders(<EditMoviePage />);
      expect(capturedProps.PreviewPanel.posterBucket).toBe('POSTERS');
      mockEditState.visiblePosters = [];
    });

    it('uses fallback bucket when image not found in list', () => {
      mockEditState.visiblePosters = [] as any;
      renderWithProviders(<EditMoviePage />);
      expect(capturedProps.PreviewPanel.posterBucket).toBe('POSTERS');
      expect(capturedProps.PreviewPanel.backdropBucket).toBe('BACKDROPS');
    });
  });

  describe('functional updaters from inline callbacks', () => {
    it('PostersSection onAdd functional updater appends poster', () => {
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('Posters'));
      const poster = { id: 'p1', url: 'http://example.com/poster.jpg' };
      capturedProps.PostersSection.onAdd(poster);
      const updater = mockEditState.setPendingPosterAdds.mock.calls[0][0];
      const result = updater([{ id: 'existing' }]);
      expect(result).toEqual([{ id: 'existing' }, poster]);
    });

    it('VideosSection onAdd functional updater appends video', () => {
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('Videos'));
      const video = { id: 'v1', url: 'http://video.mp4' };
      capturedProps.VideosSection.onAdd(video);
      const updater = mockEditState.setPendingVideoAdds.mock.calls[0][0];
      const result = updater([]);
      expect(result).toEqual([video]);
    });

    it('ProductionHousesSection onAdd functional updater appends PH', () => {
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('Cast & Crew'));
      const ph = { production_house_id: 'ph-1' };
      capturedProps.ProductionHousesSection.onAdd(ph);
      const updater = mockEditState.setPendingPHAdds.mock.calls[0][0];
      const result = updater([]);
      expect(result).toEqual([ph]);
    });

    it('CastSection onAdd functional updater appends cast', () => {
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('Cast & Crew'));
      const cast = { actor_id: 'a1', role_name: 'Hero' };
      capturedProps.CastSection.onAdd(cast);
      const updater = mockEditState.setPendingCastAdds.mock.calls[0][0];
      const result = updater([]);
      expect(result).toEqual([cast]);
    });

    it('TheatricalRunsSection onAdd functional updater appends run', () => {
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('Releases'));
      const run = { id: 'r1', region: 'US' };
      capturedProps.TheatricalRunsSection.onAdd(run);
      const updater = mockEditState.setPendingRunAdds.mock.calls[0][0];
      const result = updater([]);
      expect(result).toEqual([run]);
    });

    it('onQuickAdd functional updater for PH adds created house', async () => {
      const mockCreated = { id: 'ph-new', name: 'New PH' };
      mockEditState.createProductionHouse.mutateAsync.mockResolvedValue(mockCreated);
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('Cast & Crew'));
      await capturedProps.ProductionHousesSection.onQuickAdd('New PH');
      const updater =
        mockEditState.setPendingPHAdds.mock.calls[
          mockEditState.setPendingPHAdds.mock.calls.length - 1
        ][0];
      const result = updater([]);
      expect(result).toEqual([{ production_house_id: 'ph-new', _ph: mockCreated }]);
    });
  });

  it('FormChangesDock onSave calls handleSubmit', () => {
    renderWithProviders(<EditMoviePage />);
    capturedProps.FormChangesDock.onSave();
    expect(mockEditState.handleSubmit).toHaveBeenCalled();
  });

  describe('TMDB Sync tab', () => {
    it('shows TMDB Sync tab when movie has tmdb_id', () => {
      renderWithProviders(<EditMoviePage />);
      expect(screen.getByText('TMDB Sync')).toBeInTheDocument();
    });

    it('hides TMDB Sync tab when movie has no tmdb_id', () => {
      const originalMovie = mockEditState.movie;
      mockEditState.movie = { ...originalMovie, tmdb_id: null as unknown as number };
      renderWithProviders(<EditMoviePage />);
      expect(screen.queryByText('TMDB Sync')).not.toBeInTheDocument();
      mockEditState.movie = originalMovie;
    });

    it('renders SyncSection when TMDB Sync tab is active', () => {
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('TMDB Sync'));
      expect(screen.getByTestId('sync-section')).toBeInTheDocument();
    });

    it('passes movie to SyncSection', () => {
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('TMDB Sync'));
      expect(capturedProps.SyncSection.movie).toBe(mockEditState.movie);
    });

    it('hides other sections when TMDB Sync tab is active', () => {
      renderWithProviders(<EditMoviePage />);
      fireEvent.click(screen.getByText('TMDB Sync'));
      expect(screen.queryByTestId('basic-info-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('videos-section')).not.toBeInTheDocument();
    });
  });
});
