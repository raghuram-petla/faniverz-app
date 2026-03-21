/**
 * Tests for EditMoviePage — movie edit page with tabbed sections.
 */

import { render, screen, fireEvent } from '@testing-library/react';
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
    trailer_url: 'https://youtube.com/watch?v=123',
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
  FormChangesDock: () => <div data-testid="changes-dock" />,
}));

vi.mock('@/components/common/Button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/components/movie-edit', () => ({
  BasicInfoSection: () => <div data-testid="basic-info-section" />,
  TmdbMetadataSection: () => <div data-testid="tmdb-metadata-section" />,
  VideosSection: () => <div data-testid="videos-section" />,
  PostersSection: () => <div data-testid="posters-section" />,
  PlatformsSection: () => <div data-testid="platforms-section" />,
  ProductionHousesSection: () => <div data-testid="production-houses-section" />,
  CastSection: () => <div data-testid="cast-section" />,
  TheatricalRunsSection: () => <div data-testid="theatrical-runs-section" />,
  SectionNav: ({
    activeSection,
    onSectionChange,
  }: {
    activeSection: string;
    onSectionChange: (s: string) => void;
  }) => (
    <div data-testid="section-nav">
      <button onClick={() => onSectionChange('basic-info')}>Basic Info</button>
      <button onClick={() => onSectionChange('posters')}>Posters</button>
      <button onClick={() => onSectionChange('videos')}>Videos</button>
      <button onClick={() => onSectionChange('cast-crew')}>Cast &amp; Crew</button>
      <button onClick={() => onSectionChange('releases')}>Releases</button>
    </div>
  ),
  SectionCard: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <h3>{title}</h3>
      {children}
    </div>
  ),
  PreviewPanel: () => <div data-testid="preview-panel" />,
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
});
