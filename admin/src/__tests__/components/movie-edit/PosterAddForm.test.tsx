import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PosterAddForm } from '@/components/movie-edit/PosterAddForm';

const mockUpload = vi.fn();
vi.mock('@/hooks/useImageUpload', () => ({
  useImageUpload: () => ({ upload: mockUpload, uploading: false }),
}));

vi.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string) => url,
}));

const defaultProps = {
  hasNoPosters: false,
  posterCount: 2,
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
  onPendingMainChange: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PosterAddForm', () => {
  it('renders title and date inputs', () => {
    render(<PosterAddForm {...defaultProps} />);
    expect(screen.getByPlaceholderText(/First Look/)).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(document.querySelector('input[type="date"]')).toBeInTheDocument();
  });

  it('renders Upload Image button', () => {
    render(<PosterAddForm {...defaultProps} />);
    expect(screen.getByText('Upload Image')).toBeInTheDocument();
  });

  it('disables Add to Gallery when no image uploaded', () => {
    render(<PosterAddForm {...defaultProps} />);
    expect(screen.getByText('Add to Gallery').closest('button')).toBeDisabled();
  });

  it('calls onCancel when Cancel is clicked', () => {
    render(<PosterAddForm {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('auto-checks "Set as main poster" when hasNoPosters', () => {
    render(<PosterAddForm {...defaultProps} hasNoPosters />);
    const checkbox = screen.getByRole('checkbox', { name: /Set as main poster/ });
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeDisabled();
  });

  it('allows toggling "Set as main poster" when posters exist', () => {
    render(<PosterAddForm {...defaultProps} hasNoPosters={false} />);
    const checkbox = screen.getByRole('checkbox', { name: /Set as main poster/ });
    expect(checkbox).not.toBeChecked();
    expect(checkbox).not.toBeDisabled();
  });

  it('calls onConfirm with poster data after upload and title entry', async () => {
    mockUpload.mockResolvedValueOnce('uploaded-key.jpg');
    render(<PosterAddForm {...defaultProps} />);

    // Type title
    fireEvent.change(screen.getByPlaceholderText(/First Look/), {
      target: { value: 'Hero Poster' },
    });

    // Simulate file upload via hidden input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['img'], 'poster.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(mockUpload).toHaveBeenCalledWith(file));

    // Now the button should be enabled
    const addBtn = screen.getByText('Add to Gallery').closest('button')!;
    await waitFor(() => expect(addBtn).not.toBeDisabled());

    fireEvent.click(addBtn);
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        image_url: 'uploaded-key.jpg',
        title: 'Hero Poster',
        display_order: 2,
      }),
      expect.stringContaining('pending-poster-'),
    );
  });

  it('notifies parent of pending main change when first poster uploaded', async () => {
    mockUpload.mockResolvedValueOnce('first-poster.jpg');
    render(<PosterAddForm {...defaultProps} hasNoPosters />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['img'], 'poster.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() =>
      expect(defaultProps.onPendingMainChange).toHaveBeenCalledWith('first-poster.jpg'),
    );
  });
});
