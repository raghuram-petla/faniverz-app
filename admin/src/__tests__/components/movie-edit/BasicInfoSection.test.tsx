import { render, screen, fireEvent } from '@testing-library/react';
import { BasicInfoSection } from '@/components/movie-edit/BasicInfoSection';
import type { MovieForm } from '@/hooks/useMovieEditTypes';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  },
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
  tagline: '',
  backdrop_focus_x: null,
  backdrop_focus_y: null,
  poster_focus_x: null,
  poster_focus_y: null,
};

/** Find an input/select/textarea that is a sibling of a label with the given text */
function getFieldByLabel(labelText: string): HTMLElement {
  const label = screen.getByText(labelText);
  const parent = label.parentElement!;
  const input =
    parent.querySelector('input') ??
    parent.querySelector('select') ??
    parent.querySelector('textarea');
  if (!input) throw new Error(`No form control found for label "${labelText}"`);
  return input;
}

function renderBasicInfo(overrides: Partial<MovieForm> = {}) {
  const props = {
    form: { ...defaultForm, ...overrides },
    setForm: vi.fn(),
    updateField: vi.fn(),
    toggleGenre: vi.fn(),
    onSubmit: vi.fn(),
  };
  render(<BasicInfoSection {...props} />);
  return props;
}

describe('BasicInfoSection', () => {
  it('renders Title input with form value', () => {
    renderBasicInfo({ title: 'My Movie' });
    expect(getFieldByLabel('Title *')).toHaveValue('My Movie');
  });

  it('renders Release Date input', () => {
    renderBasicInfo({ release_date: '2025-06-15' });
    expect(getFieldByLabel('Release Date')).toHaveValue('2025-06-15');
  });

  it('renders Runtime input', () => {
    renderBasicInfo({ runtime: '120' });
    expect(getFieldByLabel('Runtime (min)')).toHaveValue('120');
  });

  it('renders Certification select', () => {
    renderBasicInfo({ certification: 'UA' });
    expect(getFieldByLabel('Certification')).toHaveValue('UA');
  });

  it('renders Synopsis textarea', () => {
    renderBasicInfo({ synopsis: 'A great movie' });
    expect(getFieldByLabel('Synopsis')).toHaveValue('A great movie');
  });

  it('renders genre buttons', () => {
    renderBasicInfo();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Drama' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comedy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Romance' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thriller' })).toBeInTheDocument();
  });

  it('calls updateField when title changes', () => {
    const props = renderBasicInfo();
    fireEvent.change(getFieldByLabel('Title *'), { target: { value: 'New Title' } });
    expect(props.updateField).toHaveBeenCalledWith('title', 'New Title');
  });

  it('calls toggleGenre when genre button clicked', () => {
    const props = renderBasicInfo();
    fireEvent.click(screen.getByRole('button', { name: 'Action' }));
    expect(props.toggleGenre).toHaveBeenCalledWith('Action');
  });

  it('renders "Currently In Theaters" checkbox', () => {
    renderBasicInfo();
    expect(screen.getByText('Currently In Theaters')).toBeInTheDocument();
    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is in_theaters, second is is_featured
    expect(checkboxes[0]).not.toBeChecked();
  });

  it('renders Original Language select', () => {
    renderBasicInfo({ original_language: 'te' });
    expect(getFieldByLabel('Original Language')).toHaveValue('te');
  });

  it('calls updateField when original language changes', () => {
    const props = renderBasicInfo();
    fireEvent.change(getFieldByLabel('Original Language'), { target: { value: 'hi' } });
    expect(props.updateField).toHaveBeenCalledWith('original_language', 'hi');
  });

  it('renders Featured Movie checkbox unchecked by default', () => {
    renderBasicInfo();
    expect(screen.getByText('Featured Movie')).toBeInTheDocument();
    const checkboxes = screen.getAllByRole('checkbox');
    // is_featured is the second checkbox
    expect(checkboxes[1]).not.toBeChecked();
  });

  it('renders Featured Movie checkbox checked when is_featured is true', () => {
    renderBasicInfo({ is_featured: true });
    expect(screen.getByText(/Yes — Featured on home screen/)).toBeInTheDocument();
  });
});
