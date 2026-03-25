import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockPosterUpload = vi.fn();
const mockBackdropUpload = vi.fn();
let posterUploading = false;
let backdropUploading = false;

vi.mock('@/hooks/useImageUpload', () => ({
  useImageUpload: (endpoint: string) => {
    if (endpoint === '/api/upload/movie-poster') {
      return { upload: mockPosterUpload, uploading: posterUploading };
    }
    return { upload: mockBackdropUpload, uploading: backdropUploading };
  },
}));

vi.mock('@shared/imageUrl', () => ({
  getImageUrl: vi.fn((_url: string) => null),
}));

vi.mock('@/components/common/Button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    icon,
    type,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    icon?: React.ReactNode;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button type={type || 'button'} onClick={onClick} disabled={disabled}>
      {icon}
      {children}
    </button>
  ),
}));

// Mock global Image constructor and URL methods
const mockImageLoad = vi.fn();
let mockNaturalWidth = 1920;
let mockNaturalHeight = 1080;

beforeEach(() => {
  mockImageLoad.mockReset();
  mockNaturalWidth = 1920;
  mockNaturalHeight = 1080;

  // Mock Image constructor
  vi.stubGlobal(
    'Image',
    class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      _src = '';
      get naturalWidth() {
        return mockNaturalWidth;
      }
      get naturalHeight() {
        return mockNaturalHeight;
      }
      get src() {
        return this._src;
      }
      set src(val: string) {
        this._src = val;
        // Trigger onload async to simulate loading
        setTimeout(() => this.onload?.(), 0);
      }
    },
  );

  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:mocked'),
    revokeObjectURL: vi.fn(),
  });
});

import { PosterAddForm } from '@/components/movie-edit/PosterAddForm';

function makeProps(overrides: Partial<React.ComponentProps<typeof PosterAddForm>> = {}) {
  return {
    hasNoPosters: false,
    posterCount: 2,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

describe('PosterAddForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    posterUploading = false;
    backdropUploading = false;
  });

  describe('initial state', () => {
    it('renders upload image button', () => {
      render(<PosterAddForm {...makeProps()} />);
      expect(screen.getByText('Upload Image')).toBeInTheDocument();
    });

    it('renders placeholder image area before upload', () => {
      const { container } = render(<PosterAddForm {...makeProps()} />);
      // The placeholder dashed box
      expect(container.querySelector('.border-dashed')).toBeInTheDocument();
    });

    it('renders Cancel button', () => {
      render(<PosterAddForm {...makeProps()} />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('renders Add to Gallery button disabled when no image uploaded', () => {
      render(<PosterAddForm {...makeProps()} />);
      const btn = screen.getByText('Add to Gallery').closest('button')!;
      expect(btn).toBeDisabled();
    });
  });

  describe('image upload — backdrop (landscape)', () => {
    it('uploads to backdrop endpoint for landscape image and shows preview', async () => {
      mockNaturalWidth = 1920;
      mockNaturalHeight = 1080;
      mockBackdropUpload.mockResolvedValue('https://cdn.example.com/backdrop.jpg');

      render(<PosterAddForm {...makeProps()} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['data'], 'backdrop.jpg', { type: 'image/jpeg' });
      Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
      fireEvent.change(fileInput);

      await waitFor(() => expect(mockBackdropUpload).toHaveBeenCalledWith(file));
      await waitFor(() => expect(screen.getByAltText('Preview')).toBeInTheDocument());
    });

    it('shows "backdrop" label on preview', async () => {
      mockNaturalWidth = 1920;
      mockNaturalHeight = 1080;
      mockBackdropUpload.mockResolvedValue('https://cdn.example.com/backdrop.jpg');

      render(<PosterAddForm {...makeProps()} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['data'], 'backdrop.jpg', { type: 'image/jpeg' });
      Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
      fireEvent.change(fileInput);

      await waitFor(() => expect(screen.getByText('backdrop')).toBeInTheDocument());
    });
  });

  describe('image upload — poster (portrait)', () => {
    it('uploads to poster endpoint for portrait image', async () => {
      mockNaturalWidth = 500;
      mockNaturalHeight = 750;
      mockPosterUpload.mockResolvedValue('https://cdn.example.com/poster.jpg');

      render(<PosterAddForm {...makeProps()} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['data'], 'poster.jpg', { type: 'image/jpeg' });
      Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
      fireEvent.change(fileInput);

      await waitFor(() => expect(mockPosterUpload).toHaveBeenCalledWith(file));
    });

    it('shows "poster" label on preview', async () => {
      mockNaturalWidth = 500;
      mockNaturalHeight = 750;
      mockPosterUpload.mockResolvedValue('https://cdn.example.com/poster.jpg');

      render(<PosterAddForm {...makeProps()} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['data'], 'poster.jpg', { type: 'image/jpeg' });
      Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
      fireEvent.change(fileInput);

      await waitFor(() => expect(screen.getByText('poster')).toBeInTheDocument());
    });
  });

  describe('image upload errors', () => {
    it('shows alert on upload failure', async () => {
      mockNaturalWidth = 1920;
      mockNaturalHeight = 1080;
      mockBackdropUpload.mockRejectedValue(new Error('Upload failed'));

      render(<PosterAddForm {...makeProps()} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['data'], 'img.jpg', { type: 'image/jpeg' });
      Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
      fireEvent.change(fileInput);

      await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Upload failed'));
    });

    it('shows generic error for non-Error rejection', async () => {
      mockNaturalWidth = 1920;
      mockNaturalHeight = 1080;
      mockBackdropUpload.mockRejectedValue('string error');

      render(<PosterAddForm {...makeProps()} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['data'], 'img.jpg', { type: 'image/jpeg' });
      Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
      fireEvent.change(fileInput);

      await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Upload failed'));
    });

    it('does not upload when no file selected', () => {
      render(<PosterAddForm {...makeProps()} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput);
      expect(mockPosterUpload).not.toHaveBeenCalled();
      expect(mockBackdropUpload).not.toHaveBeenCalled();
    });
  });

  describe('handleConfirmAdd', () => {
    it('calls onConfirm with poster data when Add to Gallery is clicked', async () => {
      mockNaturalWidth = 500;
      mockNaturalHeight = 750;
      mockPosterUpload.mockResolvedValue('https://cdn.example.com/poster.jpg');

      const onConfirm = vi.fn();
      render(<PosterAddForm {...makeProps({ onConfirm, posterCount: 3 })} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['data'], 'poster.jpg', { type: 'image/jpeg' });
      Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
      fireEvent.change(fileInput);

      await waitFor(() => screen.getByText('poster'));

      fireEvent.click(screen.getByText('Add to Gallery'));

      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          image_url: 'https://cdn.example.com/poster.jpg',
          image_type: 'poster',
          is_main_poster: false,
          is_main_backdrop: false,
          display_order: 3,
        }),
        expect.stringContaining('pending-poster-'),
      );
    });

    it('uses default title "Poster" when title field is empty and type is poster', async () => {
      mockNaturalWidth = 500;
      mockNaturalHeight = 750;
      mockPosterUpload.mockResolvedValue('https://cdn.example.com/poster.jpg');

      const onConfirm = vi.fn();
      render(<PosterAddForm {...makeProps({ onConfirm })} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['data'], 'poster.jpg', { type: 'image/jpeg' });
      Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
      fireEvent.change(fileInput);

      await waitFor(() => screen.getByText('poster'));
      fireEvent.click(screen.getByText('Add to Gallery'));

      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Poster' }),
        expect.any(String),
      );
    });

    it('uses default title "Backdrop" when title is empty and type is backdrop', async () => {
      mockNaturalWidth = 1920;
      mockNaturalHeight = 1080;
      mockBackdropUpload.mockResolvedValue('https://cdn.example.com/backdrop.jpg');

      const onConfirm = vi.fn();
      render(<PosterAddForm {...makeProps({ onConfirm })} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['data'], 'backdrop.jpg', { type: 'image/jpeg' });
      Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
      fireEvent.change(fileInput);

      await waitFor(() => screen.getByText('backdrop'));
      fireEvent.click(screen.getByText('Add to Gallery'));

      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Backdrop' }),
        expect.any(String),
      );
    });

    it('does not call onConfirm when no image uploaded', () => {
      const onConfirm = vi.fn();
      render(<PosterAddForm {...makeProps({ onConfirm })} />);
      fireEvent.click(screen.getByText('Add to Gallery'));
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('calls onCancel when Cancel is clicked', () => {
      const onCancel = vi.fn();
      render(<PosterAddForm {...makeProps({ onCancel })} />);
      fireEvent.click(screen.getByText('Cancel'));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('date input', () => {
    it('updates poster_date when date input changes', async () => {
      mockNaturalWidth = 500;
      mockNaturalHeight = 750;
      mockPosterUpload.mockResolvedValue('https://cdn.example.com/poster.jpg');

      const onConfirm = vi.fn();
      render(<PosterAddForm {...makeProps({ onConfirm })} />);

      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: '2025-12-25' } });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['data'], 'poster.jpg', { type: 'image/jpeg' });
      Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
      fireEvent.change(fileInput);

      await waitFor(() => screen.getByText('poster'));
      fireEvent.click(screen.getByText('Add to Gallery'));

      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ poster_date: '2025-12-25' }),
        expect.any(String),
      );
    });
  });

  describe('image onerror fallback', () => {
    it('falls back to poster type when image fails to load', async () => {
      // Stub Image constructor to trigger onerror instead of onload
      vi.stubGlobal(
        'Image',
        class {
          onload: (() => void) | null = null;
          onerror: (() => void) | null = null;
          _src = '';
          get naturalWidth() {
            return 0;
          }
          get naturalHeight() {
            return 0;
          }
          get src() {
            return this._src;
          }
          set src(val: string) {
            this._src = val;
            setTimeout(() => this.onerror?.(), 0);
          }
        },
      );

      mockPosterUpload.mockResolvedValue('https://cdn.example.com/poster.jpg');

      const onConfirm = vi.fn();
      render(<PosterAddForm {...makeProps({ onConfirm })} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['data'], 'broken.jpg', { type: 'image/jpeg' });
      Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
      fireEvent.change(fileInput);

      await waitFor(() => expect(mockPosterUpload).toHaveBeenCalled());
    });
  });

  describe('upload button states', () => {
    it('shows "Change Image" after initial upload', async () => {
      mockNaturalWidth = 500;
      mockNaturalHeight = 750;
      mockPosterUpload.mockResolvedValue('https://cdn.example.com/poster.jpg');

      render(<PosterAddForm {...makeProps()} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['data'], 'poster.jpg', { type: 'image/jpeg' });
      Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
      fireEvent.change(fileInput);

      await waitFor(() => expect(screen.getByText('Change Image')).toBeInTheDocument());
    });

    it('shows "Uploading…" while upload is in progress', () => {
      posterUploading = true;
      render(<PosterAddForm {...makeProps()} />);
      expect(screen.getByText('Uploading…')).toBeInTheDocument();
    });
  });

  describe('title input', () => {
    it('uses provided title in onConfirm', async () => {
      mockNaturalWidth = 500;
      mockNaturalHeight = 750;
      mockPosterUpload.mockResolvedValue('https://cdn.example.com/poster.jpg');

      const onConfirm = vi.fn();
      render(<PosterAddForm {...makeProps({ onConfirm })} />);

      // Type title
      const titleInput = screen.getByPlaceholderText(/First Look/i);
      fireEvent.change(titleInput, { target: { value: 'Birthday Special Poster' } });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['data'], 'poster.jpg', { type: 'image/jpeg' });
      Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
      fireEvent.change(fileInput);

      await waitFor(() => screen.getByText('poster'));
      fireEvent.click(screen.getByText('Add to Gallery'));

      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Birthday Special Poster' }),
        expect.any(String),
      );
    });
  });
});
