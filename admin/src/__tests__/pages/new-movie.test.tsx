import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NewMoviePage from '@/app/(dashboard)/movies/new/page';

vi.mock('@/hooks/useMovieAddState', () => ({
  useMovieAddState: () => ({
    form: {
      title: '',
      poster_url: '',
      backdrop_url: '',
      release_date: '',
      runtime: '',
      genres: [],
      certification: '',
      synopsis: '',
      trailer_url: '',
      in_theaters: false,
      backdrop_focus_x: null,
      backdrop_focus_y: null,
    },
    setForm: vi.fn(),
    updateField: vi.fn(),
    toggleGenre: vi.fn(),
    uploadingPoster: false,
    setUploadingPoster: vi.fn(),
    uploadingBackdrop: false,
    setUploadingBackdrop: vi.fn(),
    posterInputRef: { current: null },
    backdropInputRef: { current: null },
    handleImageUpload: vi.fn(),
    setPendingVideoAdds: vi.fn(),
    setPendingPosterAdds: vi.fn(),
    setPendingPlatformAdds: vi.fn(),
    setPendingPHAdds: vi.fn(),
    setPendingCastAdds: vi.fn(),
    setPendingRunAdds: vi.fn(),
    setPendingMainPosterId: vi.fn(),
    setLocalCastOrder: vi.fn(),
    handleVideoRemove: vi.fn(),
    handlePosterRemove: vi.fn(),
    handlePlatformRemove: vi.fn(),
    handlePHRemove: vi.fn(),
    handleCastRemove: vi.fn(),
    handleRunRemove: vi.fn(),
    visibleCast: [],
    visibleVideos: [],
    visiblePosters: [],
    visiblePlatforms: [],
    visibleProductionHouses: [],
    visibleRuns: [],
    actors: [],
    castSearchQuery: '',
    setCastSearchQuery: vi.fn(),
    allPlatforms: [],
    phSearchResults: [],
    phSearchQuery: '',
    setPHSearchQuery: vi.fn(),
    createProductionHouse: { mutateAsync: vi.fn(), isPending: false },
    pendingPlatformAdds: [],
    pendingPHAdds: [],
    isDirty: false,
    isSaving: false,
    handleSubmit: vi.fn(),
  }),
}));

vi.mock('@/components/movie-edit/BasicInfoSection', () => ({
  BasicInfoSection: () => <div data-testid="basic-info-section" />,
}));
vi.mock('@/components/movie-edit/PreviewPanel', () => ({
  PreviewPanel: () => <div data-testid="preview-panel" />,
}));
vi.mock('@/components/movie-edit', () => ({
  VideosSection: () => <div data-testid="videos-section" />,
  PostersSection: () => <div data-testid="posters-section" />,
  PlatformsSection: () => <div data-testid="platforms-section" />,
  ProductionHousesSection: () => <div data-testid="production-houses-section" />,
  CastSection: () => <div data-testid="cast-section" />,
  TheatricalRunsSection: () => <div data-testid="theatrical-runs-section" />,
  SectionNav: () => <div data-testid="section-nav" />,
  MOVIE_SECTIONS: [],
  useActiveSection: () => ({ activeId: 'basic-info', scrollTo: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [k: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <NewMoviePage />
    </QueryClientProvider>,
  );
}

describe('NewMoviePage', () => {
  it('renders "Add Movie" heading', () => {
    renderPage();
    expect(screen.getByText('Add Movie')).toBeInTheDocument();
  });

  it('renders "Create Movie" button', () => {
    renderPage();
    expect(screen.getByText('Create Movie')).toBeInTheDocument();
  });

  it('renders back link to movies', () => {
    renderPage();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/movies');
  });

  it('does not render a Delete button', () => {
    renderPage();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('renders all section components', () => {
    renderPage();
    expect(screen.getByTestId('basic-info-section')).toBeInTheDocument();
    expect(screen.getByTestId('videos-section')).toBeInTheDocument();
    expect(screen.getByTestId('posters-section')).toBeInTheDocument();
    expect(screen.getByTestId('platforms-section')).toBeInTheDocument();
    expect(screen.getByTestId('production-houses-section')).toBeInTheDocument();
    expect(screen.getByTestId('cast-section')).toBeInTheDocument();
    expect(screen.getByTestId('theatrical-runs-section')).toBeInTheDocument();
  });

  it('renders SectionNav', () => {
    renderPage();
    expect(screen.getByTestId('section-nav')).toBeInTheDocument();
  });

  it('renders PreviewPanel', () => {
    renderPage();
    expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
  });
});
