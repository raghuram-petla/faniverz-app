import { render, screen, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NewMoviePage from '@/app/(dashboard)/movies/new/page';

vi.mock('@/hooks/useLanguageContext', () => ({
  useLanguageContext: () => ({
    languages: [],
    selectedLanguageId: null,
    setSelectedLanguageId: vi.fn(),
    userLanguageIds: [],
    showSwitcher: false,
    availableLanguages: [],
  }),
}));

let mockIsDirty = false;
let mockIsSaving = false;
const mockHandleSubmit = vi.fn();
const mockSetForm = vi.fn();
const mockUpdateField = vi.fn();
const mockToggleGenre = vi.fn();
const mockSetPendingVideoAdds = vi.fn();
const mockSetPendingPosterAdds = vi.fn();
const mockSetPendingPHAdds = vi.fn();
const mockSetPendingCastAdds = vi.fn();
const mockSetPendingRunAdds = vi.fn();
const mockSetPendingMainPosterId = vi.fn();
const mockSetLocalCastOrder = vi.fn();
const mockHandleVideoRemove = vi.fn();
const mockHandlePosterRemove = vi.fn();
const mockHandlePHRemove = vi.fn();
const mockHandleCastRemove = vi.fn();
const mockHandleRunRemove = vi.fn();
const mockSetCastSearchQuery = vi.fn();
const mockSetPHSearchQuery = vi.fn();
const mockMutateAsync = vi.fn().mockResolvedValue({ id: 'ph-1', name: 'Test PH' });
const mockSavedMainPosterId: string | null = null;
const mockPendingVideoIds = new Set<string>();
const mockPendingCastIds = new Set<string>();
const mockPendingRunIds = new Set<string>();

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
      in_theaters: false,
      premiere_date: '',
      original_language: '',
      is_featured: false,
      backdrop_focus_x: null,
      backdrop_focus_y: null,
    },
    setForm: mockSetForm,
    updateField: mockUpdateField,
    toggleGenre: mockToggleGenre,
    uploadingPoster: false,
    setUploadingPoster: vi.fn(),
    uploadingBackdrop: false,
    setUploadingBackdrop: vi.fn(),
    handleImageUpload: vi.fn(),
    setPendingVideoAdds: mockSetPendingVideoAdds,
    setPendingPosterAdds: mockSetPendingPosterAdds,
    setPendingPlatformAdds: vi.fn(),
    setPendingPHAdds: mockSetPendingPHAdds,
    setPendingCastAdds: mockSetPendingCastAdds,
    setPendingRunAdds: mockSetPendingRunAdds,
    setPendingMainPosterId: mockSetPendingMainPosterId,
    setLocalCastOrder: mockSetLocalCastOrder,
    handleVideoRemove: mockHandleVideoRemove,
    handlePosterRemove: mockHandlePosterRemove,
    handlePlatformRemove: vi.fn(),
    handlePHRemove: mockHandlePHRemove,
    handleCastRemove: mockHandleCastRemove,
    handleRunRemove: mockHandleRunRemove,
    visibleCast: [],
    visibleVideos: [],
    visiblePosters: [],
    visiblePlatforms: [],
    visibleProductionHouses: [],
    visibleAvailability: [],
    visibleRuns: [],
    actors: [],
    castSearchQuery: '',
    setCastSearchQuery: mockSetCastSearchQuery,
    allPlatforms: [],
    phSearchResults: [],
    phSearchQuery: '',
    setPHSearchQuery: mockSetPHSearchQuery,
    createProductionHouse: { mutateAsync: mockMutateAsync, isPending: false },
    pendingPlatformAdds: [],
    pendingPHAdds: [],
    isDirty: mockIsDirty,
    isSaving: mockIsSaving,
    handleSubmit: mockHandleSubmit,
    savedMainPosterId: mockSavedMainPosterId,
    pendingVideoIds: mockPendingVideoIds,
    pendingCastIds: mockPendingCastIds,
    pendingRunIds: mockPendingRunIds,
  }),
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
const capturedProps: Record<string, any> = {};

vi.mock('@/components/movie-edit', () => ({
  BasicInfoSection: (props: any) => {
    capturedProps.BasicInfoSection = props;
    return <div data-testid="basic-info-section" />;
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
  SectionNav: ({
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
      {action}
      {children}
    </div>
  ),
  PreviewPanel: (props: any) => {
    capturedProps.PreviewPanel = props;
    return <div data-testid="preview-panel" />;
  },
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
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsDirty = false;
    mockIsSaving = false;
    Object.keys(capturedProps).forEach((k) => delete capturedProps[k]);
  });

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

  it('shows "Unsaved changes" badge when isDirty is true', () => {
    mockIsDirty = true;
    renderPage();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('does not show "Unsaved changes" badge when isDirty is false', () => {
    renderPage();
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  });

  it('shows "Creating…" text when isSaving is true', () => {
    mockIsSaving = true;
    mockIsDirty = true;
    renderPage();
    expect(screen.getByText('Creating…')).toBeInTheDocument();
  });

  it('disables Create button when isDirty is false', () => {
    renderPage();
    const btn = screen.getByText('Create Movie').closest('button');
    expect(btn).toBeDisabled();
  });

  it('disables Create button when isSaving', () => {
    mockIsSaving = true;
    mockIsDirty = true;
    renderPage();
    const btn = screen.getByText('Creating…').closest('button');
    expect(btn).toBeDisabled();
  });

  it('calls handleSubmit when Create button is clicked', () => {
    mockIsDirty = true;
    renderPage();
    fireEvent.click(screen.getByText('Create Movie'));
    expect(mockHandleSubmit).toHaveBeenCalled();
  });

  it('switches to posters section', () => {
    renderPage();
    fireEvent.click(screen.getByText('Posters'));
    expect(screen.getByTestId('posters-section')).toBeInTheDocument();
    expect(screen.queryByTestId('basic-info-section')).not.toBeInTheDocument();
  });

  it('switches to videos section', () => {
    renderPage();
    fireEvent.click(screen.getByText('Videos'));
    expect(screen.getByTestId('videos-section')).toBeInTheDocument();
  });

  it('switches to cast & crew section', () => {
    renderPage();
    fireEvent.click(screen.getByText('Cast & Crew'));
    expect(screen.getByTestId('cast-section')).toBeInTheDocument();
    expect(screen.getByTestId('production-houses-section')).toBeInTheDocument();
  });

  it('switches to releases section and shows OTT notice', () => {
    renderPage();
    fireEvent.click(screen.getByText('Releases'));
    expect(screen.getByTestId('theatrical-runs-section')).toBeInTheDocument();
    expect(
      screen.getByText('Save the movie first, then manage OTT availability from the edit page.'),
    ).toBeInTheDocument();
  });

  it('renders Add button in videos section and hides it when form is open', () => {
    renderPage();
    fireEvent.click(screen.getByText('Videos'));
    const addBtn = screen.getByText('Add');
    expect(addBtn).toBeInTheDocument();
    fireEvent.click(addBtn);
    // addFormOpen is now 'videos', addButton returns undefined
    expect(screen.queryByText('Add')).not.toBeInTheDocument();
  });

  it('PostersSection onAdd calls setPendingPosterAdds', () => {
    renderPage();
    fireEvent.click(screen.getByText('Posters'));
    const poster = { id: 'p1', url: 'http://example.com/poster.jpg' };
    act(() => capturedProps.PostersSection.onAdd(poster));
    expect(mockSetPendingPosterAdds).toHaveBeenCalled();
  });

  it('PostersSection onRemove calls handlePosterRemove', () => {
    renderPage();
    fireEvent.click(screen.getByText('Posters'));
    act(() => capturedProps.PostersSection.onRemove('poster-1'));
    expect(mockHandlePosterRemove).toHaveBeenCalledWith('poster-1');
  });

  it('PostersSection onSelectMainPoster calls setPendingMainPosterId', () => {
    renderPage();
    fireEvent.click(screen.getByText('Posters'));
    act(() => capturedProps.PostersSection.onSelectMainPoster('main-poster-id'));
    expect(mockSetPendingMainPosterId).toHaveBeenCalledWith('main-poster-id');
  });

  it('PostersSection onSelectMainBackdrop is a no-op for new movie', () => {
    renderPage();
    fireEvent.click(screen.getByText('Posters'));
    // Should not throw
    expect(() => capturedProps.PostersSection.onSelectMainBackdrop()).not.toThrow();
  });

  it('PostersSection onPendingMainChange updates pendingPreviewPosterUrl in PreviewPanel', () => {
    renderPage();
    fireEvent.click(screen.getByText('Posters'));
    act(() =>
      capturedProps.PostersSection.onPendingMainChange('http://example.com/new-poster.jpg'),
    );
    expect(capturedProps.PreviewPanel.form.poster_url).toBe('http://example.com/new-poster.jpg');
  });

  it('VideosSection onAdd calls setPendingVideoAdds', () => {
    renderPage();
    fireEvent.click(screen.getByText('Videos'));
    const video = { id: 'v1', url: 'http://example.com/video.mp4' };
    act(() => capturedProps.VideosSection.onAdd(video));
    expect(mockSetPendingVideoAdds).toHaveBeenCalled();
  });

  it('VideosSection onRemove calls handleVideoRemove', () => {
    renderPage();
    fireEvent.click(screen.getByText('Videos'));
    act(() => capturedProps.VideosSection.onRemove('vid-1'));
    expect(mockHandleVideoRemove).toHaveBeenCalledWith('vid-1');
  });

  it('VideosSection onCloseAddForm closes the add form', () => {
    renderPage();
    fireEvent.click(screen.getByText('Videos'));
    fireEvent.click(screen.getByText('Add'));
    expect(screen.queryByText('Add')).not.toBeInTheDocument();
    act(() => capturedProps.VideosSection.onCloseAddForm());
    // After close, the Add button should reappear
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('ProductionHousesSection onAdd calls setPendingPHAdds', () => {
    renderPage();
    fireEvent.click(screen.getByText('Cast & Crew'));
    const ph = { production_house_id: 'ph-1', _ph: { id: 'ph-1', name: 'PH' } };
    act(() => capturedProps.ProductionHousesSection.onAdd(ph));
    expect(mockSetPendingPHAdds).toHaveBeenCalled();
  });

  it('ProductionHousesSection onRemove calls handlePHRemove', () => {
    renderPage();
    fireEvent.click(screen.getByText('Cast & Crew'));
    act(() => capturedProps.ProductionHousesSection.onRemove('ph-1'));
    expect(mockHandlePHRemove).toHaveBeenCalledWith('ph-1');
  });

  it('ProductionHousesSection onQuickAdd creates and adds production house', async () => {
    renderPage();
    fireEvent.click(screen.getByText('Cast & Crew'));
    await act(() => capturedProps.ProductionHousesSection.onQuickAdd('Test PH'));
    expect(mockMutateAsync).toHaveBeenCalledWith({ name: 'Test PH', logo_url: null });
    expect(mockSetPendingPHAdds).toHaveBeenCalled();
    expect(mockSetPHSearchQuery).toHaveBeenCalledWith('');

    // Verify the functional updater passed to setPendingPHAdds
    const updater = mockSetPendingPHAdds.mock.calls[mockSetPendingPHAdds.mock.calls.length - 1][0];
    const result = updater([]);
    expect(result).toEqual([{ production_house_id: 'ph-1', _ph: { id: 'ph-1', name: 'Test PH' } }]);
  });

  it('ProductionHousesSection onQuickAdd alerts on error', async () => {
    window.alert = vi.fn();
    mockMutateAsync.mockRejectedValueOnce(new Error('PH create failed'));
    renderPage();
    fireEvent.click(screen.getByText('Cast & Crew'));
    await act(() => capturedProps.ProductionHousesSection.onQuickAdd('Bad PH'));
    expect(window.alert).toHaveBeenCalledWith('PH create failed');
  });

  it('CastSection onAdd calls setPendingCastAdds', () => {
    renderPage();
    fireEvent.click(screen.getByText('Cast & Crew'));
    const cast = { actor_id: 'a1', role_name: 'Hero' };
    act(() => capturedProps.CastSection.onAdd(cast));
    expect(mockSetPendingCastAdds).toHaveBeenCalled();
  });

  it('CastSection onRemove calls handleCastRemove', () => {
    renderPage();
    fireEvent.click(screen.getByText('Cast & Crew'));
    act(() => capturedProps.CastSection.onRemove('cast-1'));
    expect(mockHandleCastRemove).toHaveBeenCalledWith('cast-1');
  });

  it('CastSection onReorder calls setLocalCastOrder', () => {
    renderPage();
    fireEvent.click(screen.getByText('Cast & Crew'));
    const newOrder = [{ id: '1' }, { id: '2' }];
    act(() => capturedProps.CastSection.onReorder(newOrder));
    expect(mockSetLocalCastOrder).toHaveBeenCalledWith(newOrder);
  });

  it('TheatricalRunsSection onAdd calls setPendingRunAdds', () => {
    renderPage();
    fireEvent.click(screen.getByText('Releases'));
    const run = { id: 'r1', region: 'US' };
    act(() => capturedProps.TheatricalRunsSection.onAdd(run));
    expect(mockSetPendingRunAdds).toHaveBeenCalled();
  });

  it('TheatricalRunsSection onRemove calls handleRunRemove', () => {
    renderPage();
    fireEvent.click(screen.getByText('Releases'));
    act(() => capturedProps.TheatricalRunsSection.onRemove('run-1'));
    expect(mockHandleRunRemove).toHaveBeenCalledWith('run-1');
  });

  it('cast-crew section shows Add buttons for both production houses and cast', () => {
    renderPage();
    fireEvent.click(screen.getByText('Cast & Crew'));
    const addButtons = screen.getAllByText('Add');
    expect(addButtons.length).toBe(2);
  });

  it('releases section shows Add button for theatrical runs', () => {
    renderPage();
    fireEvent.click(screen.getByText('Releases'));
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('PostersSection onAdd functional updater appends poster to array', () => {
    renderPage();
    fireEvent.click(screen.getByText('Posters'));
    const poster = { id: 'p1', url: 'http://example.com/poster.jpg' };
    act(() => capturedProps.PostersSection.onAdd(poster));
    // The callback passed to setPendingPosterAdds is (prev) => [...prev, poster]
    const updater = mockSetPendingPosterAdds.mock.calls[0][0];
    const result = updater([{ id: 'existing' }]);
    expect(result).toEqual([{ id: 'existing' }, poster]);
  });

  it('ProductionHousesSection onAdd functional updater appends PH to array', () => {
    renderPage();
    fireEvent.click(screen.getByText('Cast & Crew'));
    const ph = { production_house_id: 'ph-1', _ph: { id: 'ph-1', name: 'PH' } };
    act(() => capturedProps.ProductionHousesSection.onAdd(ph));
    const updater = mockSetPendingPHAdds.mock.calls[0][0];
    const result = updater([]);
    expect(result).toEqual([ph]);
  });

  it('CastSection onAdd functional updater appends cast to array', () => {
    renderPage();
    fireEvent.click(screen.getByText('Cast & Crew'));
    const cast = { actor_id: 'a1', role_name: 'Hero' };
    act(() => capturedProps.CastSection.onAdd(cast));
    const updater = mockSetPendingCastAdds.mock.calls[0][0];
    const result = updater([]);
    expect(result).toEqual([cast]);
  });

  it('TheatricalRunsSection onAdd functional updater appends run to array', () => {
    renderPage();
    fireEvent.click(screen.getByText('Releases'));
    const run = { id: 'r1', region: 'US' };
    act(() => capturedProps.TheatricalRunsSection.onAdd(run));
    const updater = mockSetPendingRunAdds.mock.calls[0][0];
    const result = updater([]);
    expect(result).toEqual([run]);
  });

  it('VideosSection onAdd functional updater appends video to array', () => {
    renderPage();
    fireEvent.click(screen.getByText('Videos'));
    const video = { id: 'v1', url: 'http://example.com/video.mp4' };
    act(() => capturedProps.VideosSection.onAdd(video));
    const updater = mockSetPendingVideoAdds.mock.calls[0][0];
    const result = updater([]);
    expect(result).toEqual([video]);
  });

  it('BasicInfoSection receives correct props', () => {
    renderPage();
    expect(capturedProps.BasicInfoSection.onSubmit).toBe(mockHandleSubmit);
    expect(capturedProps.BasicInfoSection.updateField).toBe(mockUpdateField);
    expect(capturedProps.BasicInfoSection.toggleGenre).toBe(mockToggleGenre);
  });
});
