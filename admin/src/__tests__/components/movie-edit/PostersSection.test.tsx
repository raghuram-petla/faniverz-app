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
  backdrop_focus_x: null,
  backdrop_focus_y: null,
};

function renderPostersSection(overrides: Record<string, unknown> = {}) {
  const props = {
    visiblePosters: [],
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    onSetMain: vi.fn(),
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

  it('hides add form by default and shows + Add Poster button', () => {
    renderPostersSection();
    expect(screen.queryByPlaceholderText(/First Look/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Poster/ })).toBeInTheDocument();
  });

  it('shows add form when + Add Poster is clicked', () => {
    renderPostersSection();
    fireEvent.click(screen.getByRole('button', { name: /Add Poster/ }));
    expect(screen.getByPlaceholderText(/First Look/)).toBeInTheDocument();
  });

  it('hides form on Cancel', () => {
    renderPostersSection();
    fireEvent.click(screen.getByRole('button', { name: /Add Poster/ }));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByPlaceholderText(/First Look/)).not.toBeInTheDocument();
  });

  it('disables upload button when title is empty', () => {
    renderPostersSection();
    fireEvent.click(screen.getByRole('button', { name: /Add Poster/ }));
    const uploadBtn = screen.getByRole('button', { name: /Upload & Add Poster/ });
    expect(uploadBtn).toBeDisabled();
  });

  it('enables upload button when title is filled', () => {
    renderPostersSection();
    fireEvent.click(screen.getByRole('button', { name: /Add Poster/ }));
    const titleInput = screen.getByPlaceholderText(/First Look/);
    fireEvent.change(titleInput, { target: { value: 'Test Poster' } });
    const uploadBtn = screen.getByRole('button', { name: /Upload & Add Poster/ });
    expect(uploadBtn).not.toBeDisabled();
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

  it('shows empty state when no posters', () => {
    renderPostersSection();
    expect(screen.getByText('No posters added yet.')).toBeInTheDocument();
  });
});
