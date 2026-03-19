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

vi.mock('@/components/movie-edit/ImageUploadField', () => ({
  ImageUploadField: (props: { label: string }) => (
    <div data-testid={`image-upload-${props.label.toLowerCase()}`} />
  ),
}));

vi.mock('@/components/common/ImageVariantsPanel', () => ({
  ImageVariantsPanel: () => <div data-testid="image-variants-panel" />,
}));

vi.mock('@/components/movie-edit/BackdropFocalPicker', () => ({
  BackdropFocalPicker: () => <div data-testid="backdrop-focal-picker" />,
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
};

function renderPostersSection(overrides: Record<string, unknown> = {}) {
  const props = {
    visiblePosters: [],
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    onSetMain: vi.fn(),
    savedMainPosterId: null,
    form: defaultForm,
    setForm: vi.fn(),
    updateField: vi.fn(),
    uploadingBackdrop: false,
    handleImageUpload: vi.fn(),
    setUploadingBackdrop: vi.fn(),
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
  is_main: true,
  display_order: 0,
  created_at: '2025-01-01',
};

describe('PostersSection', () => {
  it('renders backdrop upload field (no separate main poster upload)', () => {
    renderPostersSection();
    expect(screen.getByTestId('image-upload-backdrop')).toBeInTheDocument();
    expect(screen.queryByTestId('image-upload-poster')).not.toBeInTheDocument();
  });

  it('renders section subheadings', () => {
    renderPostersSection();
    expect(screen.getByText('Backdrop')).toBeInTheDocument();
    expect(screen.getByText('Posters')).toBeInTheDocument();
  });

  it('renders backdrop focal picker', () => {
    renderPostersSection();
    expect(screen.getByTestId('backdrop-focal-picker')).toBeInTheDocument();
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
    // disabled with no title and no image
    expect(confirmBtn).toBeDisabled();
    // still disabled with only title (no uploaded image)
    const titleInput = screen.getByPlaceholderText(/First Look/);
    fireEvent.change(titleInput, { target: { value: 'Test Poster' } });
    expect(confirmBtn).toBeDisabled();
  });

  it('renders poster card list with title and date always visible', () => {
    renderPostersSection({ visiblePosters: [MOCK_POSTER] });
    expect(screen.getByText('First Look')).toBeInTheDocument();
    expect(screen.getByText('2025-03-01')).toBeInTheDocument();
  });

  it('shows Main badge on main poster', () => {
    renderPostersSection({ visiblePosters: [MOCK_POSTER] });
    expect(screen.getByText('Main')).toBeInTheDocument();
  });

  it('disables remove button for main poster', () => {
    renderPostersSection({ visiblePosters: [MOCK_POSTER] });
    const removeBtn = screen.getByRole('button', { name: /Remove First Look/ });
    expect(removeBtn).toBeDisabled();
  });

  it('enables remove button for non-main poster', () => {
    const nonMain = { ...MOCK_POSTER, id: 'poster-2', is_main: false, title: 'Second Look' };
    renderPostersSection({ visiblePosters: [MOCK_POSTER, nonMain] });
    const removeBtn = screen.getByRole('button', { name: /Remove Second Look/ });
    expect(removeBtn).not.toBeDisabled();
  });

  it('shows empty state when no posters', () => {
    renderPostersSection();
    expect(screen.getByText('No posters added yet.')).toBeInTheDocument();
  });
});
