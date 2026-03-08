import { render, screen, fireEvent } from '@testing-library/react';
import { BasicInfoSection } from '@/components/movie-edit/BasicInfoSection';
import type { MovieForm } from '@/hooks/useMovieEditTypes';
import { createRef } from 'react';

vi.mock('@/components/movie-edit/ImageUploadField', () => ({
  ImageUploadField: (props: { label: string }) => (
    <div data-testid={`image-upload-${props.label.toLowerCase()}`} />
  ),
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
  director: '',
  trailer_url: '',
  in_theaters: false,
  backdrop_focus_x: null,
  backdrop_focus_y: null,
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
    uploadingPoster: false,
    uploadingBackdrop: false,
    posterInputRef: createRef<HTMLInputElement>(),
    backdropInputRef: createRef<HTMLInputElement>(),
    handleImageUpload: vi.fn(),
    setUploadingPoster: vi.fn(),
    setUploadingBackdrop: vi.fn(),
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
    expect(getFieldByLabel('Runtime (min)')).toHaveValue(120);
  });

  it('renders Certification select', () => {
    renderBasicInfo({ certification: 'UA' });
    expect(getFieldByLabel('Certification')).toHaveValue('UA');
  });

  it('renders Director input', () => {
    renderBasicInfo({ director: 'Rajamouli' });
    expect(getFieldByLabel('Director')).toHaveValue('Rajamouli');
  });

  it('renders Synopsis textarea', () => {
    renderBasicInfo({ synopsis: 'A great movie' });
    expect(getFieldByLabel('Synopsis')).toHaveValue('A great movie');
  });

  it('renders Trailer URL input', () => {
    renderBasicInfo({ trailer_url: 'https://youtube.com/watch?v=abc' });
    expect(getFieldByLabel('Trailer URL')).toHaveValue('https://youtube.com/watch?v=abc');
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
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
});
