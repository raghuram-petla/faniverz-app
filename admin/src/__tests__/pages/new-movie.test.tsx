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
      premiere_date: '',
      original_language: '',
      is_featured: false,
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

vi.mock('@/components/movie-edit', () => ({
  BasicInfoSection: () => <div data-testid="basic-info-section" />,
  VideosSection: () => <div data-testid="videos-section" />,
  PostersSection: () => <div data-testid="posters-section" />,
  PlatformsSection: () => <div data-testid="platforms-section" />,
  ProductionHousesSection: () => <div data-testid="production-houses-section" />,
  CastSection: () => <div data-testid="cast-section" />,
  TheatricalRunsSection: () => <div data-testid="theatrical-runs-section" />,
  SectionNav: () => <div data-testid="section-nav" />,
  SectionCard: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid={`section-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>{children}</div>
  ),
  PreviewPanel: () => <div data-testid="preview-panel" />,
  MOVIE_SECTIONS: [
    { id: 'basic-info', label: 'Basic Info' },
    { id: 'posters', label: 'Posters' },
    { id: 'videos', label: 'Videos' },
    { id: 'cast-crew', label: 'Cast & Crew' },
    { id: 'releases', label: 'Releases' },
  ],
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

  it('renders Basic Info tab content by default', () => {
    renderPage();
    expect(screen.getByTestId('basic-info-section')).toBeInTheDocument();
  });

  it('does not render other tab sections when Basic Info is active', () => {
    renderPage();
    expect(screen.queryByTestId('videos-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('posters-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cast-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('theatrical-runs-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('platforms-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('production-houses-section')).not.toBeInTheDocument();
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
