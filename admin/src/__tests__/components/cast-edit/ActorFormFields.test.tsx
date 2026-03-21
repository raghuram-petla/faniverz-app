import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActorFormFields, type ActorFormState } from '@/components/cast-edit/ActorFormFields';

vi.mock('lucide-react', () => ({
  Loader2: (p: { className?: string }) => <span data-testid="loader" className={p.className} />,
  Upload: (p: { className?: string }) => <span data-testid="upload-icon" className={p.className} />,
  X: (p: { className?: string }) => <span data-testid="x-icon" className={p.className} />,
}));

vi.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string) => (url ? `https://cdn.test/${url}` : null),
}));

vi.mock('@/components/common/ImageVariantsPanel', () => ({
  ImageVariantsPanel: ({ originalUrl }: { originalUrl: string }) => (
    <div data-testid="image-variants">{originalUrl}</div>
  ),
}));

const baseForm: ActorFormState = {
  name: 'Mahesh Babu',
  photo_url: '',
  person_type: 'actor',
  birth_date: '1975-08-09',
  gender: '2',
  biography: 'Telugu actor',
  place_of_birth: 'Chennai',
  height_cm: '183',
  tmdb_person_id: '12345',
};

const defaultProps = {
  form: baseForm,
  uploading: false,
  onFieldChange: vi.fn(),
  onPhotoUpload: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

describe('ActorFormFields', () => {
  it('renders all form labels', () => {
    render(<ActorFormFields {...defaultProps} />);
    expect(screen.getByText('Name *')).toBeInTheDocument();
    expect(screen.getByText('Photo')).toBeInTheDocument();
    expect(screen.getByText('Person Type')).toBeInTheDocument();
    expect(screen.getByText('Date of Birth')).toBeInTheDocument();
    expect(screen.getByText('Gender')).toBeInTheDocument();
    expect(screen.getByText('Height (cm)')).toBeInTheDocument();
    expect(screen.getByText('TMDB Person ID')).toBeInTheDocument();
    expect(screen.getByText('Place of Birth')).toBeInTheDocument();
    expect(screen.getByText('Biography')).toBeInTheDocument();
  });

  it('renders name input with correct value', () => {
    render(<ActorFormFields {...defaultProps} />);
    const nameInput = screen.getByDisplayValue('Mahesh Babu');
    expect(nameInput).toBeInTheDocument();
  });

  it('calls onFieldChange when name changes', () => {
    render(<ActorFormFields {...defaultProps} />);
    fireEvent.change(screen.getByDisplayValue('Mahesh Babu'), {
      target: { value: 'NTR Jr' },
    });
    expect(defaultProps.onFieldChange).toHaveBeenCalledWith('name', 'NTR Jr');
  });

  it('shows upload button when no photo_url', () => {
    render(<ActorFormFields {...defaultProps} />);
    expect(screen.getByText('Upload Photo')).toBeInTheDocument();
  });

  it('shows "Uploading..." when uploading and no photo', () => {
    render(<ActorFormFields {...defaultProps} uploading />);
    expect(screen.getByText('Uploading...')).toBeInTheDocument();
  });

  it('shows photo preview and Change/Remove when photo_url is set', () => {
    const form = { ...baseForm, photo_url: 'photo.jpg' };
    render(<ActorFormFields {...defaultProps} form={form} />);
    expect(screen.getByAltText('Photo preview')).toBeInTheDocument();
    expect(screen.getByText('Change')).toBeInTheDocument();
    expect(screen.getByText('Remove')).toBeInTheDocument();
  });

  it('calls onFieldChange to clear photo when Remove clicked', () => {
    const form = { ...baseForm, photo_url: 'photo.jpg' };
    render(<ActorFormFields {...defaultProps} form={form} />);
    fireEvent.click(screen.getByText('Remove'));
    expect(defaultProps.onFieldChange).toHaveBeenCalledWith('photo_url', '');
  });

  it('shows photo URL caption when photo is set', () => {
    const form = { ...baseForm, photo_url: 'photo.jpg' };
    render(<ActorFormFields {...defaultProps} form={form} />);
    // URL caption + ImageVariantsPanel both show the url text
    expect(screen.getAllByText('photo.jpg').length).toBeGreaterThanOrEqual(1);
  });

  it('renders ImageVariantsPanel with photo_url', () => {
    const form = { ...baseForm, photo_url: 'photo.jpg' };
    render(<ActorFormFields {...defaultProps} form={form} />);
    expect(screen.getByTestId('image-variants')).toHaveTextContent('photo.jpg');
  });

  it('renders person_type select with correct options', () => {
    render(<ActorFormFields {...defaultProps} />);
    expect(screen.getByText('Actor')).toBeInTheDocument();
    expect(screen.getByText('Technician')).toBeInTheDocument();
  });

  it('calls onFieldChange when person_type changes', () => {
    render(<ActorFormFields {...defaultProps} />);
    const select = screen.getByDisplayValue('Actor');
    fireEvent.change(select, { target: { value: 'technician' } });
    expect(defaultProps.onFieldChange).toHaveBeenCalledWith('person_type', 'technician');
  });

  it('renders gender select with all options', () => {
    render(<ActorFormFields {...defaultProps} />);
    expect(screen.getByText('Not set')).toBeInTheDocument();
    expect(screen.getByText('Female')).toBeInTheDocument();
    expect(screen.getByText('Male')).toBeInTheDocument();
    expect(screen.getByText('Non-binary')).toBeInTheDocument();
  });

  it('calls onFieldChange when biography changes', () => {
    render(<ActorFormFields {...defaultProps} />);
    fireEvent.change(screen.getByDisplayValue('Telugu actor'), {
      target: { value: 'Updated bio' },
    });
    expect(defaultProps.onFieldChange).toHaveBeenCalledWith('biography', 'Updated bio');
  });

  it('calls onFieldChange when height changes', () => {
    render(<ActorFormFields {...defaultProps} />);
    fireEvent.change(screen.getByDisplayValue('183'), {
      target: { value: '185' },
    });
    expect(defaultProps.onFieldChange).toHaveBeenCalledWith('height_cm', '185');
  });

  it('calls onFieldChange when tmdb_person_id changes', () => {
    render(<ActorFormFields {...defaultProps} />);
    fireEvent.change(screen.getByDisplayValue('12345'), {
      target: { value: '67890' },
    });
    expect(defaultProps.onFieldChange).toHaveBeenCalledWith('tmdb_person_id', '67890');
  });

  it('calls onFieldChange when place_of_birth changes', () => {
    render(<ActorFormFields {...defaultProps} />);
    fireEvent.change(screen.getByDisplayValue('Chennai'), {
      target: { value: 'Hyderabad' },
    });
    expect(defaultProps.onFieldChange).toHaveBeenCalledWith('place_of_birth', 'Hyderabad');
  });

  it('disables Change button when uploading', () => {
    const form = { ...baseForm, photo_url: 'photo.jpg' };
    render(<ActorFormFields {...defaultProps} form={form} uploading />);
    expect(screen.getByText('Change').closest('button')).toBeDisabled();
  });

  it('disables upload button when uploading', () => {
    render(<ActorFormFields {...defaultProps} uploading />);
    expect(screen.getByText('Uploading...').closest('button')).toBeDisabled();
  });
});
