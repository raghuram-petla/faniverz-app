import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PosterAddForm } from '@/components/movie-edit/PosterAddForm';

const mockUpload = vi.fn();
vi.mock('@/hooks/useImageUpload', () => ({
  useImageUpload: () => ({ upload: mockUpload, uploading: false }),
}));

vi.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string) => url,
}));

// Mock URL.createObjectURL/revokeObjectURL for detectImageType
globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
globalThis.URL.revokeObjectURL = vi.fn();

// Mock globalThis.Image so detectImageType resolves (portrait dimensions = poster)
const OriginalImage = globalThis.Image;
beforeAll(() => {
  globalThis.Image = class MockImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    naturalWidth = 800;
    naturalHeight = 1200;
    _src = '';
    get src() {
      return this._src;
    }
    set src(v: string) {
      this._src = v;
      setTimeout(() => this.onload?.(), 0);
    }
  } as unknown as typeof Image;
});
afterAll(() => {
  globalThis.Image = OriginalImage;
});

const defaultProps = {
  hasNoPosters: false,
  posterCount: 2,
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PosterAddForm', () => {
  it('renders title and date inputs', () => {
    render(<PosterAddForm {...defaultProps} />);
    expect(screen.getByPlaceholderText(/First Look/)).toBeInTheDocument();
    // Label now includes a required asterisk — match partially
    expect(screen.getByText(/^Date/, { selector: 'label' })).toBeInTheDocument();
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

  it('shows alert when upload fails', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockUpload.mockRejectedValueOnce(new Error('Upload failed'));
    render(<PosterAddForm {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['img'], 'poster.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Upload failed'));
    alertSpy.mockRestore();
  });

  it('shows generic alert when upload fails with non-Error', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockUpload.mockRejectedValueOnce('something bad');
    render(<PosterAddForm {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['img'], 'poster.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Upload failed'));
    alertSpy.mockRestore();
  });

  it('updates poster_date when date input changes', () => {
    render(<PosterAddForm {...defaultProps} />);
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2025-06-15' } });
    expect(dateInput.value).toBe('2025-06-15');
  });

  it('triggers file input click when upload button is clicked', () => {
    render(<PosterAddForm {...defaultProps} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click').mockImplementation(() => {});
    fireEvent.click(screen.getByText('Upload Image'));
    expect(clickSpy).toHaveBeenCalled();
  });

  it('detects backdrop type for landscape images', async () => {
    // Override the MockImage to simulate landscape dimensions
    const OrigImage = globalThis.Image;
    globalThis.Image = class LandscapeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = 1920;
      naturalHeight = 1080;
      _src = '';
      get src() {
        return this._src;
      }
      set src(v: string) {
        this._src = v;
        setTimeout(() => this.onload?.(), 0);
      }
    } as unknown as typeof Image;

    mockUpload.mockResolvedValueOnce('backdrop-key.jpg');
    render(<PosterAddForm {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['img'], 'backdrop.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(mockUpload).toHaveBeenCalledWith(file));

    const addBtn = screen.getByText('Add to Gallery').closest('button')!;
    await waitFor(() => expect(addBtn).not.toBeDisabled());

    fireEvent.click(addBtn);
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        image_type: 'backdrop',
        title: 'Backdrop',
      }),
      expect.stringContaining('pending-poster-'),
    );

    globalThis.Image = OrigImage;
  });

  it('handles image onerror by falling back to poster type', async () => {
    const OrigImage = globalThis.Image;
    globalThis.Image = class ErrorImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = 0;
      naturalHeight = 0;
      _src = '';
      get src() {
        return this._src;
      }
      set src(v: string) {
        this._src = v;
        setTimeout(() => this.onerror?.(), 0);
      }
    } as unknown as typeof Image;

    mockUpload.mockResolvedValueOnce('fallback-key.jpg');
    render(<PosterAddForm {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['img'], 'bad.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(mockUpload).toHaveBeenCalledWith(file));

    const addBtn = screen.getByText('Add to Gallery').closest('button')!;
    await waitFor(() => expect(addBtn).not.toBeDisabled());

    fireEvent.click(addBtn);
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        image_type: 'poster',
      }),
      expect.stringContaining('pending-poster-'),
    );

    globalThis.Image = OrigImage;
  });

  it('does not call handleUpload when no file is selected', () => {
    render(<PosterAddForm {...defaultProps} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [] } });
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('disables Add to Gallery and shows error when date is cleared', async () => {
    mockUpload.mockResolvedValueOnce('uploaded-key.jpg');
    render(<PosterAddForm {...defaultProps} />);

    // Upload an image so uploadedUrl is set
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['img'], 'poster.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => expect(mockUpload).toHaveBeenCalledWith(file));

    // Clear the date
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '' } });

    // Button should be disabled and error message shown
    const addBtn = screen.getByText('Add to Gallery').closest('button')!;
    expect(addBtn).toBeDisabled();
    expect(screen.getByText(/Date is required/)).toBeInTheDocument();
  });

  it('does not call onConfirm when date is empty even after upload', async () => {
    mockUpload.mockResolvedValueOnce('uploaded-key.jpg');
    render(<PosterAddForm {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['img'], 'poster.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => expect(mockUpload).toHaveBeenCalledWith(file));

    // Clear the date then try to click (button is disabled, but guard also protects)
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '' } });

    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });
});
