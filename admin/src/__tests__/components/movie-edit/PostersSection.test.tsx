import { render, screen, fireEvent } from '@testing-library/react';
import { PostersSection } from '@/components/movie-edit/PostersSection';
import type { MovieForm } from '@/hooks/useMovieEditTypes';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  },
}));

vi.mock('@/hooks/useImageUpload', () => ({
  useImageUpload: () => ({ upload: vi.fn(), uploading: false }),
}));

vi.mock('@/components/movie-edit/MainImageSelector', () => ({
  MainImageSelector: (props: { label: string }) => (
    <div data-testid={`main-image-selector-${props.label.toLowerCase().replace(/\s+/g, '-')}`} />
  ),
}));

vi.mock('@/hooks/useImageVariants', () => ({
  useImageVariants: () => ({
    variants: [],
    isChecking: false,
    readyCount: 0,
    totalCount: 0,
    recheck: vi.fn(),
  }),
}));

const defaultForm: MovieForm = {
  title: 'Test Movie',
  poster_url: '',
  backdrop_url: '',
  release_date: '2025-01-01',
  runtime: '',
  genres: [],
  certification: '',
  synopsis: '',
  trailer_url: '',
  in_theaters: false,
  premiere_date: '',
  original_language: '',
  is_featured: false,
  tmdb_id: '',
  backdrop_focus_x: null,
  backdrop_focus_y: null,
  poster_focus_x: null,
  poster_focus_y: null,
};

function renderPostersSection(overrides: Record<string, unknown> = {}) {
  const props = {
    visiblePosters: [],
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    onSelectMainPoster: vi.fn(),
    onSelectMainBackdrop: vi.fn(),
    savedMainPosterId: null,
    onPendingMainChange: vi.fn(),
    form: defaultForm,
    setForm: vi.fn(),
    updateField: vi.fn(),
    ...overrides,
  };
  render(<PostersSection {...props} />);
  return props;
}

const MOCK_POSTER = {
  id: 'poster-1',
  movie_id: 'movie-1',
  image_url: 'https://example.com/p1.jpg',
  title: 'First Look',
  description: null,
  poster_date: '2025-03-01',
  is_main_poster: true,
  is_main_backdrop: false,
  image_type: 'poster',
  display_order: 0,
  created_at: '2025-01-01',
};

describe('PostersSection', () => {
  it('renders main image selectors for poster and backdrop', () => {
    renderPostersSection();
    expect(screen.getByTestId('main-image-selector-main-poster')).toBeInTheDocument();
    expect(screen.getByTestId('main-image-selector-main-backdrop')).toBeInTheDocument();
  });

  it('renders section subheadings', () => {
    renderPostersSection();
    expect(screen.getByText('Main Images')).toBeInTheDocument();
    expect(screen.getByText('Images')).toBeInTheDocument();
  });

  it('does not render old backdrop upload or focal picker sections', () => {
    renderPostersSection();
    expect(screen.queryByText('Backdrop')).not.toBeInTheDocument();
    expect(screen.queryByTestId('image-upload-backdrop')).not.toBeInTheDocument();
    expect(screen.queryByTestId('backdrop-focal-picker')).not.toBeInTheDocument();
  });

  it('hides add form by default and shows + Add button', () => {
    renderPostersSection();
    expect(screen.queryByPlaceholderText(/First Look/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add/ })).toBeInTheDocument();
  });

  it('shows add form when + Add is clicked', () => {
    renderPostersSection();
    fireEvent.click(screen.getByRole('button', { name: /Add/ }));
    expect(screen.getByPlaceholderText(/First Look/)).toBeInTheDocument();
  });

  it('hides form on Cancel', () => {
    renderPostersSection();
    fireEvent.click(screen.getByRole('button', { name: /Add/ }));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByPlaceholderText(/First Look/)).not.toBeInTheDocument();
  });

  it('shows Upload Image button in add form', () => {
    renderPostersSection();
    fireEvent.click(screen.getByRole('button', { name: /Add/ }));
    expect(screen.getByRole('button', { name: /Upload Image/ })).toBeInTheDocument();
  });

  it('disables Add to Gallery button until both title and image are set', () => {
    renderPostersSection();
    fireEvent.click(screen.getByRole('button', { name: /Add/ }));
    const confirmBtn = screen.getByRole('button', { name: /Add to Gallery/ });
    expect(confirmBtn).toBeDisabled();
    const titleInput = screen.getByPlaceholderText(/First Look/);
    fireEvent.change(titleInput, { target: { value: 'Test Poster' } });
    expect(confirmBtn).toBeDisabled();
  });

  it('renders poster card list with title and date always visible', () => {
    renderPostersSection({ visiblePosters: [MOCK_POSTER] });
    expect(screen.getByText('First Look')).toBeInTheDocument();
    expect(screen.getByText('2025-03-01')).toBeInTheDocument();
  });

  it('disables remove button for main poster', () => {
    renderPostersSection({ visiblePosters: [MOCK_POSTER] });
    const removeBtn = screen.getByRole('button', { name: /Remove First Look/ });
    expect(removeBtn).toBeDisabled();
  });

  it('enables remove button for non-main poster', () => {
    const nonMain = { ...MOCK_POSTER, id: 'poster-2', is_main_poster: false, title: 'Second Look' };
    renderPostersSection({ visiblePosters: [MOCK_POSTER, nonMain] });
    const removeBtn = screen.getByRole('button', { name: /Remove Second Look/ });
    expect(removeBtn).not.toBeDisabled();
  });

  it('shows empty state when no posters', () => {
    renderPostersSection();
    expect(screen.getByText('No images added yet.')).toBeInTheDocument();
  });
});
