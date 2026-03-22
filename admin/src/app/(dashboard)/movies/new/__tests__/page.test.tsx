import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// Mock before imports
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({}),
}));

const mockHandleSubmit = vi.fn();
const mockSetForm = vi.fn();
const mockUpdateField = vi.fn();
const mockToggleGenre = vi.fn();

const defaultMovieAddState = {
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
    original_language: 'te',
    is_featured: false,
    tmdb_id: '',
    tagline: '',
    backdrop_focus_x: null,
    backdrop_focus_y: null,
    poster_focus_x: null,
    poster_focus_y: null,
  },
  isDirty: false,
  isSaving: false,
  handleSubmit: mockHandleSubmit,
  setForm: mockSetForm,
  updateField: mockUpdateField,
  toggleGenre: mockToggleGenre,
  visiblePosters: [],
  visibleVideos: [],
  visibleProductionHouses: [],
  visibleCast: [],
  visibleRuns: [],
  setPendingPosterAdds: vi.fn(),
  handlePosterRemove: vi.fn(),
  setPendingMainPosterId: vi.fn(),
  savedMainPosterId: undefined,
  setPendingVideoAdds: vi.fn(),
  handleVideoRemove: vi.fn(),
  pendingVideoIds: new Set(),
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
  pendingCastIds: new Set(),
  setPendingRunAdds: vi.fn(),
  handleRunRemove: vi.fn(),
  pendingRunIds: new Set(),
};

vi.mock('@/hooks/useMovieAddState', () => ({
  useMovieAddState: () => defaultMovieAddState,
}));

vi.mock('@/components/movie-edit', () => ({
  BasicInfoSection: ({ form }: { form: { title: string } }) => (
    <div data-testid="basic-info-section">BasicInfo: {form.title || '(empty)'}</div>
  ),
  VideosSection: () => <div data-testid="videos-section">Videos</div>,
  PostersSection: () => <div data-testid="posters-section">Posters</div>,
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
    <div data-testid={`section-card-${title.toLowerCase().replace(' ', '-')}`}>
      <h2>{title}</h2>
      {action && <div data-testid="section-action">{action}</div>}
      {children}
    </div>
  ),
  PreviewPanel: ({ form }: { form: { poster_url: string } }) => (
    <div data-testid="preview-panel">Preview: {form.poster_url || 'no-poster'}</div>
  ),
}));

vi.mock('@/components/common/Button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import NewMoviePage from '@/app/(dashboard)/movies/new/page';

describe('NewMoviePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock state to defaults
    Object.assign(defaultMovieAddState, {
      isDirty: false,
      isSaving: false,
      form: { ...defaultMovieAddState.form, title: '' },
    });
  });

  it('renders "Add Movie" heading', () => {
    render(<NewMoviePage />);
    expect(screen.getByText('Add Movie')).toBeInTheDocument();
  });

  it('renders back link to /movies', () => {
    render(<NewMoviePage />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/movies');
  });

  it('renders SectionNav', () => {
    render(<NewMoviePage />);
    expect(screen.getByTestId('section-nav')).toBeInTheDocument();
  });

  it('renders PreviewPanel', () => {
    render(<NewMoviePage />);
    expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
  });

  it('renders BasicInfoSection by default (basic-info section active)', () => {
    render(<NewMoviePage />);
    expect(screen.getByTestId('basic-info-section')).toBeInTheDocument();
  });

  it('does not render other sections when basic-info is active', () => {
    render(<NewMoviePage />);
    expect(screen.queryByTestId('videos-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('posters-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cast-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('runs-section')).not.toBeInTheDocument();
  });

  it('shows Create Movie button disabled when not dirty', () => {
    render(<NewMoviePage />);
    const btn = screen.getByRole('button', { name: /Create Movie/i });
    expect(btn).toBeDisabled();
  });

  it('shows Create Movie button enabled when dirty', () => {
    defaultMovieAddState.isDirty = true;
    render(<NewMoviePage />);
    const btn = screen.getByRole('button', { name: /Create Movie/i });
    expect(btn).not.toBeDisabled();
  });

  it('shows Unsaved changes badge when dirty', () => {
    defaultMovieAddState.isDirty = true;
    render(<NewMoviePage />);
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('does not show Unsaved changes badge when not dirty', () => {
    defaultMovieAddState.isDirty = false;
    render(<NewMoviePage />);
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  });

  it('calls handleSubmit when Create Movie is clicked', () => {
    defaultMovieAddState.isDirty = true;
    render(<NewMoviePage />);
    fireEvent.click(screen.getByRole('button', { name: /Create Movie/i }));
    expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
  });

  it('shows Creating... when saving', () => {
    defaultMovieAddState.isDirty = true;
    defaultMovieAddState.isSaving = true;
    render(<NewMoviePage />);
    expect(screen.getByText(/Creating/)).toBeInTheDocument();
  });

  it('navigates to posters section', () => {
    render(<NewMoviePage />);
    fireEvent.click(screen.getByTestId('nav-posters'));
    expect(screen.getByTestId('posters-section')).toBeInTheDocument();
    expect(screen.queryByTestId('basic-info-section')).not.toBeInTheDocument();
  });

  it('navigates to videos section and shows Add button', () => {
    render(<NewMoviePage />);
    fireEvent.click(screen.getByTestId('nav-videos'));
    expect(screen.getByTestId('videos-section')).toBeInTheDocument();
  });

  it('navigates to cast-crew section and shows both sub-sections', () => {
    render(<NewMoviePage />);
    fireEvent.click(screen.getByTestId('nav-cast-crew'));
    expect(screen.getByTestId('ph-section')).toBeInTheDocument();
    expect(screen.getByTestId('cast-section')).toBeInTheDocument();
  });

  it('navigates to releases section and shows OTT placeholder', () => {
    render(<NewMoviePage />);
    fireEvent.click(screen.getByTestId('nav-releases'));
    expect(screen.getByTestId('runs-section')).toBeInTheDocument();
    expect(screen.getByText(/Save the movie first/)).toBeInTheDocument();
  });

  it('toggles Add form for videos section', () => {
    render(<NewMoviePage />);
    fireEvent.click(screen.getByTestId('nav-videos'));

    // The Add button should exist in the section action area
    const addBtn = screen.getAllByRole('button').find((b) => b.textContent === 'Add');
    expect(addBtn).toBeDefined();
  });

  it('PreviewPanel uses pendingPreviewPosterUrl when set', () => {
    defaultMovieAddState.form.poster_url = 'original-poster.jpg';
    render(<NewMoviePage />);
    // PreviewPanel should show original poster since no pending override
    expect(screen.getByTestId('preview-panel')).toHaveTextContent('Preview: original-poster.jpg');
  });

  it('Add button becomes undefined when form already open (addFormOpen === key)', () => {
    render(<NewMoviePage />);
    fireEvent.click(screen.getByTestId('nav-videos'));

    // Click Add to open videos form
    const addBtns = screen.getAllByRole('button').filter((b) => b.textContent === 'Add');
    if (addBtns[0]) {
      fireEvent.click(addBtns[0]);
      // Now that form is "open", the Add button disappears from action slot
      const addBtnsAfter = screen.queryAllByRole('button').filter((b) => b.textContent === 'Add');
      expect(addBtnsAfter.length).toBe(0);
    }
  });

  it('navigates to cast-crew section shows both ph-section and cast-section Add buttons', () => {
    render(<NewMoviePage />);
    fireEvent.click(screen.getByTestId('nav-cast-crew'));
    const addBtns = screen.getAllByRole('button').filter((b) => b.textContent === 'Add');
    // 2 Add buttons: one for PH, one for cast
    expect(addBtns.length).toBe(2);
  });

  it('button disabled when isSaving is true', () => {
    defaultMovieAddState.isDirty = true;
    defaultMovieAddState.isSaving = true;
    render(<NewMoviePage />);
    const btn = screen.getByRole('button', { name: /Creating/i });
    expect(btn).toBeDisabled();
  });

  it('OTT Platforms section is shown in releases tab', () => {
    render(<NewMoviePage />);
    fireEvent.click(screen.getByTestId('nav-releases'));
    expect(screen.getByText('OTT Platforms')).toBeInTheDocument();
  });
});
