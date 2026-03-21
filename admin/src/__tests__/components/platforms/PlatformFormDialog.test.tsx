import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  PlatformFormDialog,
  type PlatformFormData,
} from '@/components/platforms/PlatformFormDialog';

vi.mock('lucide-react', () => ({
  X: (p: { className?: string }) => <span data-testid="x-icon" className={p.className} />,
  Loader2: (p: { className?: string }) => <span data-testid="loader" className={p.className} />,
}));

vi.mock('@/components/movie-edit/ImageUploadField', () => ({
  ImageUploadField: ({
    label,
    url,
    onRemove,
  }: {
    label: string;
    url: string;
    onRemove: () => void;
    onUpload: (f: File) => void;
    uploading: boolean;
    uploadEndpoint: string;
    previewAlt: string;
    previewClassName: string;
    showUrlCaption: boolean;
    bucket: string;
  }) => (
    <div data-testid="image-upload">
      <span>{label}</span>
      <span data-testid="logo-url">{url}</span>
      <button onClick={onRemove} data-testid="remove-logo">
        Remove
      </button>
    </div>
  ),
}));

vi.mock('@/hooks/useImageUpload', () => ({
  useImageUpload: () => ({
    upload: vi.fn().mockResolvedValue('uploaded-logo.png'),
    uploading: false,
  }),
}));

const initialData: PlatformFormData = {
  name: '',
  logo_url: '',
  tmdb_alias_ids: '',
};

const defaultProps = {
  editingId: null as string | null,
  initialData,
  isSaving: false,
  isError: false,
  onSubmit: vi.fn(),
  onClose: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

describe('PlatformFormDialog', () => {
  it('renders "Add Platform" title when no editingId', () => {
    render(<PlatformFormDialog {...defaultProps} />);
    expect(screen.getByText('Add Platform')).toBeInTheDocument();
  });

  it('renders "Edit Platform" title when editingId is set', () => {
    render(<PlatformFormDialog {...defaultProps} editingId="plat-1" />);
    expect(screen.getByText('Edit Platform')).toBeInTheDocument();
  });

  it('renders "Create" button when adding', () => {
    render(<PlatformFormDialog {...defaultProps} />);
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('renders "Update" button when editing', () => {
    render(<PlatformFormDialog {...defaultProps} editingId="plat-1" />);
    expect(screen.getByText('Update')).toBeInTheDocument();
  });

  it('renders name input', () => {
    render(<PlatformFormDialog {...defaultProps} />);
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  it('renders TMDB Alias IDs input', () => {
    render(<PlatformFormDialog {...defaultProps} />);
    expect(screen.getByLabelText('TMDB Alias IDs')).toBeInTheDocument();
  });

  it('renders image upload field', () => {
    render(<PlatformFormDialog {...defaultProps} />);
    expect(screen.getByTestId('image-upload')).toBeInTheDocument();
  });

  it('calls onSubmit with form data on submit', () => {
    render(
      <PlatformFormDialog
        {...defaultProps}
        initialData={{ name: 'Netflix', logo_url: 'logo.png', tmdb_alias_ids: '8' }}
      />,
    );
    fireEvent.submit(screen.getByText('Create').closest('form')!);
    expect(defaultProps.onSubmit).toHaveBeenCalledWith({
      name: 'Netflix',
      logo_url: 'logo.png',
      tmdb_alias_ids: '8',
    });
  });

  it('updates name field on input change', () => {
    render(<PlatformFormDialog {...defaultProps} />);
    const nameInput = screen.getByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'Hotstar' } });
    expect(nameInput).toHaveValue('Hotstar');
  });

  it('updates TMDB Alias IDs on input change', () => {
    render(<PlatformFormDialog {...defaultProps} />);
    const aliasInput = screen.getByLabelText('TMDB Alias IDs');
    fireEvent.change(aliasInput, { target: { value: '1796, 2100' } });
    expect(aliasInput).toHaveValue('1796, 2100');
  });

  it('calls onClose when X button clicked', () => {
    render(<PlatformFormDialog {...defaultProps} />);
    // X button is the first button with x-icon
    const closeButtons = screen.getAllByRole('button');
    // First button in header has X icon
    fireEvent.click(closeButtons[0]);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onClose when Cancel clicked', () => {
    render(<PlatformFormDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('disables submit button when isSaving', () => {
    render(<PlatformFormDialog {...defaultProps} isSaving />);
    expect(screen.getByText('Create').closest('button')).toBeDisabled();
  });

  it('shows error message when isError', () => {
    render(<PlatformFormDialog {...defaultProps} isError />);
    expect(screen.getByText('Failed to save platform. Please try again.')).toBeInTheDocument();
  });

  it('does not show error message when isError is false', () => {
    render(<PlatformFormDialog {...defaultProps} />);
    expect(
      screen.queryByText('Failed to save platform. Please try again.'),
    ).not.toBeInTheDocument();
  });

  it('shows helper text for TMDB alias IDs', () => {
    render(<PlatformFormDialog {...defaultProps} />);
    expect(screen.getByText(/Comma-separated TMDB provider IDs/)).toBeInTheDocument();
  });
});
