import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// ─── Mocks before imports ───
const mockRouterBack = vi.fn();
const mockUseParams = vi.fn(() => ({ id: 'movie-123' }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockRouterBack }),
  useParams: () => mockUseParams(),
  useSearchParams: () => new URLSearchParams(),
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
  setPendingPosterAdds: vi.fn(),
  handlePosterRemove: vi.fn(),
  handleSelectMainPoster: vi.fn(),
  handleSelectMainBackdrop: vi.fn(),
  savedMainPosterId: null as null | string,
  setPendingVideoAdds: vi.fn(),
  handleVideoRemove: vi.fn(),
  pendingVideoIds: new Set<string>(),
  phSearchResults: [],
  phSearchQuery: '',
  setPHSearchQuery: vi.fn(),
  setPendingPHAdds: vi.fn(),
  handlePHRemove: vi.fn(),
  pendingPHAdds: [],
  createProductionHouse: { mutateAsync: vi.fn(), isPending: false },
  actors: [],
  castSearchQuery: '',
  setCastSearchQuery: vi.fn(),
  setPendingCastAdds: vi.fn(),
  handleCastRemove: vi.fn(),
  setLocalCastOrder: vi.fn(),
  pendingCastIds: new Set<string>(),
  setPendingRunAdds: vi.fn(),
  handleRunRemove: vi.fn(),
  handleRunEnd: vi.fn(),
  pendingRunEndIds: new Map<string, string>(),
  pendingRunIds: new Set<string>(),
  visibleAvailability: [],
  pendingAvailabilityIds: new Set<string>(),
  setPendingAvailabilityAdds: vi.fn(),
  handleAvailabilityRemove: vi.fn(),
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
  FormChangesDock: ({ changeCount, saveStatus }: { changeCount: number; saveStatus: string }) => (
    <div data-testid="form-changes-dock">
      <span data-testid="change-count">{changeCount}</span>
      <span data-testid="save-status">{saveStatus}</span>
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
  VideosSection: () => <div data-testid="videos-section">Videos</div>,
  PostersSection: () => <div data-testid="posters-section">Posters</div>,
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
  ProductionHousesSection: () => <div data-testid="ph-section">Production Houses</div>,
  CastSection: () => <div data-testid="cast-section">Cast</div>,
  TheatricalRunsSection: () => <div data-testid="runs-section">Runs</div>,
  SectionNav: ({
    activeSection,
    onSectionChange,
  }: {
    activeSection: string;
    onSectionChange: (s: string) => void;
  }) => (
    <nav data-testid="section-nav">
      {['basic-info', 'posters', 'videos', 'cast-crew', 'releases'].map((s) => (
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
});
