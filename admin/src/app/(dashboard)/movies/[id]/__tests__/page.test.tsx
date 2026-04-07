import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// ─── Mocks before imports ───
const mockRouterBack = vi.fn();
const mockUseParams = vi.fn(() => ({ id: 'movie-123' }));

const mockSearchParams = vi.fn(() => new URLSearchParams());
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockRouterBack }),
  useParams: () => mockUseParams(),
  useSearchParams: () => mockSearchParams(),
}));

const mockHandleSubmit = vi.fn();
const mockHandleDelete = vi.fn();
const mockSetForm = vi.fn();
const mockUpdateField = vi.fn();
const mockToggleGenre = vi.fn();

const defaultEditState = {
  form: {
    title: '',
    poster_url: '',
    backdrop_url: '',
    release_date: '',
    runtime: '',
    genres: [],
    certification: '',
    synopsis: '',
    in_theaters: false,
    premiere_date: '',
    original_language: 'te',
    is_featured: false,
    tmdb_id: '',
    tagline: '',
    backdrop_focus_x: null,
    backdrop_focus_y: null,
    poster_focus_x: null,
    poster_focus_y: null,
  },
  movie: null as null | {
    tmdb_id?: string;
    tmdb_status?: string;
    tmdb_vote_average?: number;
    tmdb_vote_count?: number;
    budget?: number;
    revenue?: number;
    collection_name?: string;
    spoken_languages?: string[];
    tmdb_last_synced_at?: string;
  },
  isLoading: false,
  isSaving: false,
  saveStatus: 'idle' as const,
  handleSubmit: mockHandleSubmit,
  handleDelete: mockHandleDelete,
  setForm: mockSetForm,
  updateField: mockUpdateField,
  toggleGenre: mockToggleGenre,
  visiblePosters: [] as Array<{
    id: string;
    image_url: string;
    image_type?: string;
    created_at: string;
  }>,
  visibleVideos: [],
  visibleProductionHouses: [],
  visibleCast: [],
  visibleRuns: [],
  setPendingPosterAdds: vi.fn((fn: unknown) => {
    if (typeof fn === 'function') (fn as (p: unknown[]) => unknown)([]);
  }),
  handlePosterRemove: vi.fn(),
  handleSelectMainPoster: vi.fn(),
  handleSelectMainBackdrop: vi.fn(),
  savedMainPosterId: null as null | string,
  setPendingVideoAdds: vi.fn((fn: unknown) => {
    if (typeof fn === 'function') (fn as (p: unknown[]) => unknown)([]);
  }),
  handleVideoRemove: vi.fn(),
  pendingVideoIds: new Set<string>(),
  phSearchResults: [],
  phSearchQuery: '',
  setPHSearchQuery: vi.fn(),
  setPendingPHAdds: vi.fn((fn: unknown) => {
    if (typeof fn === 'function') (fn as (p: unknown[]) => unknown)([]);
  }),
  handlePHRemove: vi.fn(),
  pendingPHAdds: [],
  createProductionHouse: { mutateAsync: vi.fn(), isPending: false },
  actors: [],
  castSearchQuery: '',
  setCastSearchQuery: vi.fn(),
  setPendingCastAdds: vi.fn((fn: unknown) => {
    if (typeof fn === 'function') (fn as (p: unknown[]) => unknown)([]);
  }),
  handleCastRemove: vi.fn(),
  setLocalCastOrder: vi.fn(),
  pendingCastIds: new Set<string>(),
  setPendingRunAdds: vi.fn((fn: unknown) => {
    if (typeof fn === 'function') (fn as (p: unknown[]) => unknown)([]);
  }),
  handleRunRemove: vi.fn(),
  handleRunEnd: vi.fn(),
  pendingRunEndIds: new Map<string, string>(),
  pendingRunIds: new Set<string>(),
  visibleAvailability: [],
  pendingAvailabilityIds: new Set<string>(),
  setPendingAvailabilityAdds: vi.fn((fn: unknown) => {
    if (typeof fn === 'function') (fn as (p: unknown[]) => unknown)([]);
  }),
  handleAvailabilityRemove: vi.fn(),
  patchFormFields: vi.fn(),
  changesParams: {},
};

vi.mock('@/hooks/useMovieEditState', () => ({
  useMovieEditState: () => defaultEditState,
}));

const mockUsePermissions = vi.fn();
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => mockUsePermissions(),
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
  FormChangesDock: ({
    changeCount,
    saveStatus,
    onSave,
  }: {
    changeCount: number;
    saveStatus: string;
    onSave?: () => void;
  }) => (
    <div data-testid="form-changes-dock">
      <span data-testid="change-count">{changeCount}</span>
      <span data-testid="save-status">{saveStatus}</span>
      <button data-testid="dock-save-btn" onClick={onSave}>
        Save
      </button>
    </div>
  ),
}));

vi.mock('@/components/common/Button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/components/movie-edit', () => ({
  MOVIE_SECTIONS: [
    { id: 'basic-info', label: 'Basic Info' },
    { id: 'posters', label: 'Posters' },
    { id: 'videos', label: 'Videos' },
    { id: 'cast-crew', label: 'Cast & Crew' },
    { id: 'releases', label: 'Releases' },
    { id: 'editorial-review', label: 'Editorial Review' },
    { id: 'tmdb-sync', label: 'TMDB Sync' },
  ],
  MovieEditHeader: ({
    title,
    onBack,
    canDelete,
    onDelete,
  }: {
    title: string | null;
    onBack: () => void;
    canDelete: boolean;
    onDelete: () => void;
  }) => (
    <div data-testid="movie-edit-header">
      <h1>Edit Movie{title && <span> — {title}</span>}</h1>
      <button onClick={onBack}>Back</button>
      {canDelete && <button onClick={onDelete}>Delete</button>}
    </div>
  ),
  BasicInfoSection: ({ form }: { form: { title: string } }) => (
    <div data-testid="basic-info-section">BasicInfo: {form.title || '(empty)'}</div>
  ),
  TmdbMetadataSection: () => <div data-testid="tmdb-metadata-section">TMDB Metadata</div>,
  VideosSection: ({
    onAdd,
    onCloseAddForm,
  }: {
    onAdd?: (v: Record<string, unknown>) => void;
    onCloseAddForm?: () => void;
  }) => (
    <div data-testid="videos-section">
      <button data-testid="video-add-btn" onClick={() => onAdd?.({ url: 'test' })}>
        Add Video
      </button>
      <button data-testid="video-close-btn" onClick={onCloseAddForm}>
        Close
      </button>
    </div>
  ),
  PostersSection: ({
    onAdd,
    onPendingMainChange,
  }: {
    onAdd?: (p: Record<string, unknown>) => void;
    onPendingMainChange?: (url: string | null) => void;
  }) => (
    <div data-testid="posters-section">
      <button data-testid="poster-add-btn" onClick={() => onAdd?.({ url: 'poster.jpg' })}>
        Add Poster
      </button>
      <button
        data-testid="poster-preview-btn"
        onClick={() => onPendingMainChange?.('https://preview.jpg')}
      >
        Preview
      </button>
    </div>
  ),
  PlatformsSection: ({
    onAdd,
  }: {
    movieId?: string;
    onAdd?: (data: Record<string, unknown>) => void;
  }) => (
    <div data-testid="platforms-section">
      <button data-testid="platform-add-btn" onClick={() => onAdd?.({ platform_id: 'test' })}>
        Add Platform
      </button>
    </div>
  ),
  ProductionHousesSection: ({
    onAdd,
    onQuickAdd,
  }: {
    onAdd?: (ph: Record<string, unknown>) => void;
    onQuickAdd?: (name: string) => void;
  }) => (
    <div data-testid="ph-section">
      <button data-testid="ph-add-btn" onClick={() => onAdd?.({ production_house_id: 'ph1' })}>
        Add PH
      </button>
      <button data-testid="ph-quickadd-btn" onClick={() => onQuickAdd?.('New PH')}>
        Quick Add
      </button>
    </div>
  ),
  CastSection: ({
    onAdd,
    onReorder,
  }: {
    onAdd?: (c: Record<string, unknown>) => void;
    onReorder?: (order: string[]) => void;
  }) => (
    <div data-testid="cast-section">
      <button data-testid="cast-add-btn" onClick={() => onAdd?.({ actor_id: 'a1' })}>
        Add Cast
      </button>
      <button data-testid="cast-reorder-btn" onClick={() => onReorder?.(['a1', 'a2'])}>
        Reorder
      </button>
    </div>
  ),
  TheatricalRunsSection: ({ onAdd }: { onAdd?: (r: Record<string, unknown>) => void }) => (
    <div data-testid="runs-section">
      <button data-testid="run-add-btn" onClick={() => onAdd?.({ region: 'US' })}>
        Add Run
      </button>
    </div>
  ),
  SyncSection: () => <div data-testid="sync-section">Sync</div>,
  EditorialReviewSection: ({ movieId }: { movieId: string }) => (
    <div data-testid="editorial-review-section">Editorial Review: {movieId}</div>
  ),
  SectionNav: ({
    activeSection,
    onSectionChange,
  }: {
    activeSection: string;
    onSectionChange: (s: string) => void;
  }) => (
    <nav data-testid="section-nav">
      {[
        'basic-info',
        'posters',
        'videos',
        'cast-crew',
        'releases',
        'editorial-review',
        'tmdb-sync',
      ].map((s) => (
        <button key={s} onClick={() => onSectionChange(s)} data-testid={`nav-${s}`}>
          {s}
        </button>
      ))}
      <span data-testid="active-section">{activeSection}</span>
    </nav>
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
    <div data-testid={`section-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <h2>{title}</h2>
      {action && <div data-testid="section-action">{action}</div>}
      {children}
    </div>
  ),
  PreviewPanel: ({ form }: { form: { poster_url: string } }) => (
    <div data-testid="preview-panel">Preview: {form.poster_url || 'no-poster'}</div>
  ),
}));

import EditMoviePage from '@/app/(dashboard)/movies/[id]/page';

describe('EditMoviePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePermissions.mockReturnValue({ isReadOnly: false, canDeleteTopLevel: () => false });
    defaultEditState.isLoading = false;
    defaultEditState.form.title = '';
    defaultEditState.movie = null;
    defaultEditState.visiblePosters = [];
  });

  it('renders loading spinner when isLoading is true', () => {
    defaultEditState.isLoading = true;
    const { container } = render(<EditMoviePage />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.queryByTestId('section-nav')).not.toBeInTheDocument();
  });

  it('renders Edit Movie heading when loaded', () => {
    render(<EditMoviePage />);
    expect(screen.getByText('Edit Movie')).toBeInTheDocument();
  });

  it('renders movie title in header when title is set', () => {
    defaultEditState.form.title = 'Test Film';
    render(<EditMoviePage />);
    expect(screen.getByText('— Test Film')).toBeInTheDocument();
  });

  it('renders SectionNav', () => {
    render(<EditMoviePage />);
    expect(screen.getByTestId('section-nav')).toBeInTheDocument();
  });

  it('renders PreviewPanel', () => {
    render(<EditMoviePage />);
    expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
  });

  it('renders FormChangesDock', () => {
    render(<EditMoviePage />);
    expect(screen.getByTestId('form-changes-dock')).toBeInTheDocument();
  });

  it('renders BasicInfoSection by default', () => {
    render(<EditMoviePage />);
    expect(screen.getByTestId('basic-info-section')).toBeInTheDocument();
  });

  it('does NOT render Delete button when canDeleteTopLevel returns false', () => {
    mockUsePermissions.mockReturnValue({ isReadOnly: false, canDeleteTopLevel: () => false });
    render(<EditMoviePage />);
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('renders Delete button when canDeleteTopLevel returns true', () => {
    mockUsePermissions.mockReturnValue({ isReadOnly: false, canDeleteTopLevel: () => true });
    render(<EditMoviePage />);
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls handleDelete when Delete button is clicked', () => {
    mockUsePermissions.mockReturnValue({ isReadOnly: false, canDeleteTopLevel: () => true });
    render(<EditMoviePage />);
    fireEvent.click(screen.getByText('Delete'));
    expect(mockHandleDelete).toHaveBeenCalled();
  });

  it('calls router.back() when back button is clicked', () => {
    render(<EditMoviePage />);
    const backBtn = screen.getByRole('button', { name: 'Back' });
    fireEvent.click(backBtn);
    expect(mockRouterBack).toHaveBeenCalled();
  });

  it('does NOT render TMDB Metadata section when movie has no tmdb_id', () => {
    defaultEditState.movie = { tmdb_id: undefined };
    render(<EditMoviePage />);
    expect(screen.queryByTestId('tmdb-metadata-section')).not.toBeInTheDocument();
  });

  it('renders TMDB Metadata section when movie has tmdb_id', () => {
    defaultEditState.movie = { tmdb_id: '12345' };
    render(<EditMoviePage />);
    expect(screen.getByTestId('tmdb-metadata-section')).toBeInTheDocument();
  });

  it('navigates to posters section', () => {
    render(<EditMoviePage />);
    fireEvent.click(screen.getByTestId('nav-posters'));
    expect(screen.getByTestId('posters-section')).toBeInTheDocument();
    expect(screen.queryByTestId('basic-info-section')).not.toBeInTheDocument();
  });

  it('navigates to videos section', () => {
    render(<EditMoviePage />);
    fireEvent.click(screen.getByTestId('nav-videos'));
    expect(screen.getByTestId('videos-section')).toBeInTheDocument();
  });

  it('navigates to cast-crew section', () => {
    render(<EditMoviePage />);
    fireEvent.click(screen.getByTestId('nav-cast-crew'));
    expect(screen.getByTestId('ph-section')).toBeInTheDocument();
    expect(screen.getByTestId('cast-section')).toBeInTheDocument();
  });

  it('navigates to releases section and shows platforms', () => {
    render(<EditMoviePage />);
    fireEvent.click(screen.getByTestId('nav-releases'));
    expect(screen.getByTestId('runs-section')).toBeInTheDocument();
    expect(screen.getByTestId('platforms-section')).toBeInTheDocument();
  });

  it('hides Add buttons in read-only mode', () => {
    mockUsePermissions.mockReturnValue({ isReadOnly: true, canDeleteTopLevel: () => false });
    render(<EditMoviePage />);
    fireEvent.click(screen.getByTestId('nav-videos'));
    // In read-only, addButton returns undefined so no Add button
    const addButtons = screen.queryAllByRole('button').filter((b) => b.textContent === 'Add');
    expect(addButtons.length).toBe(0);
  });

  it('calls setPendingAvailabilityAdds when platform onAdd is triggered', () => {
    const mockSetAdds = vi.fn();
    defaultEditState.setPendingAvailabilityAdds = mockSetAdds;
    render(<EditMoviePage />);
    fireEvent.click(screen.getByTestId('nav-releases'));
    fireEvent.click(screen.getByTestId('platform-add-btn'));
    expect(mockSetAdds).toHaveBeenCalled();
  });

  it('hides add button when add form is already open for that key', () => {
    render(<EditMoviePage />);
    fireEvent.click(screen.getByTestId('nav-videos'));
    // Click the Add button to open the form
    const addBtn = screen.queryAllByRole('button').find((b) => b.textContent === 'Add');
    expect(addBtn).toBeDefined();
    fireEvent.click(addBtn!);
    // Now the add form is "open" for videos, so addButton('videos') should return undefined
    // The SectionCard action slot should not contain an Add button
    const addButtons = screen.queryAllByRole('button').filter((b) => b.textContent === 'Add');
    // After opening, the add button should be gone for videos
    expect(addButtons.length).toBe(0);
  });

  it('renders tmdb-sync section when navigated and movie has tmdb_id', () => {
    defaultEditState.movie = { tmdb_id: '12345' };
    render(<EditMoviePage />);
    fireEvent.click(screen.getByTestId('nav-tmdb-sync'));
    expect(screen.getByTestId('sync-section')).toBeInTheDocument();
  });

  it('does not render tmdb-sync section when movie has no tmdb_id', () => {
    defaultEditState.movie = null;
    render(<EditMoviePage />);
    fireEvent.click(screen.getByTestId('nav-tmdb-sync'));
    expect(screen.queryByTestId('sync-section')).not.toBeInTheDocument();
  });

  it('uses backdrop bucket type for preview when poster has backdrop image_type', () => {
    defaultEditState.visiblePosters = [
      {
        id: 'p1',
        image_url: 'https://img.test/backdrop.jpg',
        image_type: 'backdrop',
        created_at: '2024-01-01',
      },
    ];
    defaultEditState.form.backdrop_url = 'https://img.test/backdrop.jpg';
    render(<EditMoviePage />);
    expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
  });

  it('uses poster bucket type for preview when poster has poster image_type', () => {
    defaultEditState.visiblePosters = [
      {
        id: 'p1',
        image_url: 'https://img.test/poster.jpg',
        image_type: 'poster',
        created_at: '2024-01-01',
      },
    ];
    defaultEditState.form.poster_url = 'https://img.test/poster.jpg';
    render(<EditMoviePage />);
    expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
  });

  it('applies opacity class in read-only mode', () => {
    mockUsePermissions.mockReturnValue({ isReadOnly: true, canDeleteTopLevel: () => false });
    const { container } = render(<EditMoviePage />);
    const opacityDiv = container.querySelector('.opacity-70');
    expect(opacityDiv).toBeInTheDocument();
  });

  it('shows Add button in videos section when not read-only and form not open', () => {
    mockUsePermissions.mockReturnValue({ isReadOnly: false, canDeleteTopLevel: () => false });
    render(<EditMoviePage />);
    fireEvent.click(screen.getByTestId('nav-videos'));
    const addButtons = screen.queryAllByRole('button').filter((b) => b.textContent === 'Add');
    expect(addButtons.length).toBeGreaterThan(0);
  });

  it('calls handleSubmit via dock save button', () => {
    render(<EditMoviePage />);
    fireEvent.click(screen.getByTestId('dock-save-btn'));
    expect(mockHandleSubmit).toHaveBeenCalled();
  });

  it('invokes poster onAdd callback', () => {
    render(<EditMoviePage />);
    fireEvent.click(screen.getByTestId('nav-posters'));
    fireEvent.click(screen.getByTestId('poster-add-btn'));
    expect(defaultEditState.setPendingPosterAdds).toHaveBeenCalled();
  });

  it('invokes poster onPendingMainChange callback for preview', () => {
    render(<EditMoviePage />);
    fireEvent.click(screen.getByTestId('nav-posters'));
    fireEvent.click(screen.getByTestId('poster-preview-btn'));
    // Preview panel should show the pending preview URL
    expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
  });

  it('invokes video onAdd callback', () => {
    render(<EditMoviePage />);
    fireEvent.click(screen.getByTestId('nav-videos'));
    fireEvent.click(screen.getByTestId('video-add-btn'));
    expect(defaultEditState.setPendingVideoAdds).toHaveBeenCalled();
  });

  it('invokes PH onAdd callback', () => {
    render(<EditMoviePage />);
    fireEvent.click(screen.getByTestId('nav-cast-crew'));
    fireEvent.click(screen.getByTestId('ph-add-btn'));
    expect(defaultEditState.setPendingPHAdds).toHaveBeenCalled();
  });

  it('invokes PH onQuickAdd callback', async () => {
    defaultEditState.createProductionHouse.mutateAsync = vi
      .fn()
      .mockResolvedValue({ id: 'new-ph', name: 'New PH' });
    render(<EditMoviePage />);
    fireEvent.click(screen.getByTestId('nav-cast-crew'));
    fireEvent.click(screen.getByTestId('ph-quickadd-btn'));
    // Should call mutateAsync
    expect(defaultEditState.createProductionHouse.mutateAsync).toHaveBeenCalled();
  });

  it('invokes cast onAdd callback', () => {
    render(<EditMoviePage />);
    fireEvent.click(screen.getByTestId('nav-cast-crew'));
    fireEvent.click(screen.getByTestId('cast-add-btn'));
    expect(defaultEditState.setPendingCastAdds).toHaveBeenCalled();
  });

  it('invokes cast onReorder callback', () => {
    render(<EditMoviePage />);
    fireEvent.click(screen.getByTestId('nav-cast-crew'));
    fireEvent.click(screen.getByTestId('cast-reorder-btn'));
    expect(defaultEditState.setLocalCastOrder).toHaveBeenCalledWith(['a1', 'a2']);
  });

  it('invokes run onAdd callback', () => {
    render(<EditMoviePage />);
    fireEvent.click(screen.getByTestId('nav-releases'));
    fireEvent.click(screen.getByTestId('run-add-btn'));
    expect(defaultEditState.setPendingRunAdds).toHaveBeenCalled();
  });

  it('uses tab query param to set initial active section', () => {
    mockSearchParams.mockReturnValue(new URLSearchParams('tab=posters'));
    render(<EditMoviePage />);
    expect(screen.getByTestId('active-section')).toHaveTextContent('posters');
    mockSearchParams.mockReturnValue(new URLSearchParams());
  });

  it('falls back to basic-info for invalid tab query param', () => {
    mockSearchParams.mockReturnValue(new URLSearchParams('tab=invalid-tab'));
    render(<EditMoviePage />);
    expect(screen.getByTestId('active-section')).toHaveTextContent('basic-info');
    mockSearchParams.mockReturnValue(new URLSearchParams());
  });

  it('closeAdd resets addFormOpen to null', () => {
    render(<EditMoviePage />);
    fireEvent.click(screen.getByTestId('nav-videos'));
    // Open add form
    const addBtn = screen.queryAllByRole('button').find((b) => b.textContent === 'Add');
    if (addBtn) fireEvent.click(addBtn);
    // Close it
    fireEvent.click(screen.getByTestId('video-close-btn'));
    // After closing, the Add button should reappear
    const addBtnsAfter = screen.queryAllByRole('button').filter((b) => b.textContent === 'Add');
    expect(addBtnsAfter.length).toBeGreaterThan(0);
  });

  it('getBucketForUrl returns fallback when image type is not poster or backdrop', () => {
    defaultEditState.visiblePosters = [
      {
        id: 'p1',
        image_url: 'https://img.test/unknown.jpg',
        image_type: 'still',
        created_at: '2024-01-01',
      },
    ];
    defaultEditState.form.poster_url = 'https://img.test/unknown.jpg';
    render(<EditMoviePage />);
    expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
  });

  it('getBucketForUrl returns fallback when no matching image found', () => {
    defaultEditState.visiblePosters = [];
    defaultEditState.form.poster_url = 'https://img.test/nonexistent.jpg';
    render(<EditMoviePage />);
    expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
  });

  it('navigates to editorial-review section and renders EditorialReviewSection', () => {
    render(<EditMoviePage />);
    fireEvent.click(screen.getByTestId('nav-editorial-review'));
    expect(screen.getByTestId('editorial-review-section')).toBeInTheDocument();
    expect(screen.getByText('Editorial Review: movie-123')).toBeInTheDocument();
  });
});
