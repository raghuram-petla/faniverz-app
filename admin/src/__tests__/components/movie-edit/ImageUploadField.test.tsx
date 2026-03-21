import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageUploadField } from '@/components/movie-edit/ImageUploadField';

vi.mock('lucide-react', () => ({
  Loader2: (p: { className?: string }) => <span data-testid="loader" className={p.className} />,
  Upload: (p: { className?: string }) => <span data-testid="upload-icon" className={p.className} />,
  X: (p: { className?: string }) => <span data-testid="x-icon" className={p.className} />,
  ImageOff: (p: { className?: string }) => <span data-testid="image-off" className={p.className} />,
  RotateCcw: (p: { className?: string }) => (
    <span data-testid="rotate-icon" className={p.className} />
  ),
}));

vi.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string, _size: string, _bucket: string) =>
    url ? `https://cdn.test/${url}` : null,
}));

const defaultProps = {
  label: 'Poster',
  url: '',
  uploading: false,
  uploadEndpoint: '/api/upload/poster',
  previewAlt: 'Poster preview',
  previewClassName: 'w-24 h-36',
  onUpload: vi.fn().mockResolvedValue(undefined),
  onRemove: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

describe('ImageUploadField', () => {
  it('renders label text', () => {
    render(<ImageUploadField {...defaultProps} />);
    expect(screen.getByText('Poster')).toBeInTheDocument();
  });

  it('hides label when hideLabel is true', () => {
    render(<ImageUploadField {...defaultProps} hideLabel />);
    expect(screen.queryByText('Poster')).not.toBeInTheDocument();
  });

  it('shows upload button when no url', () => {
    render(<ImageUploadField {...defaultProps} />);
    expect(screen.getByText('Upload Poster')).toBeInTheDocument();
  });

  it('shows "Uploading..." text when uploading and no url', () => {
    render(<ImageUploadField {...defaultProps} uploading />);
    expect(screen.getByText('Uploading...')).toBeInTheDocument();
  });

  it('disables upload button when uploading', () => {
    render(<ImageUploadField {...defaultProps} uploading />);
    expect(screen.getByText('Uploading...').closest('button')).toBeDisabled();
  });

  it('shows image preview when url is set', () => {
    render(<ImageUploadField {...defaultProps} url="poster.jpg" bucket="POSTERS" />);
    const img = screen.getByAltText('Poster preview');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://cdn.test/poster.jpg');
  });

  it('shows Change and Remove buttons when url is set', () => {
    render(<ImageUploadField {...defaultProps} url="poster.jpg" />);
    expect(screen.getByText('Change')).toBeInTheDocument();
    expect(screen.getByText('Remove')).toBeInTheDocument();
  });

  it('calls onRemove when Remove clicked', () => {
    render(<ImageUploadField {...defaultProps} url="poster.jpg" />);
    fireEvent.click(screen.getByText('Remove'));
    expect(defaultProps.onRemove).toHaveBeenCalledTimes(1);
  });

  it('disables Change button when uploading', () => {
    render(<ImageUploadField {...defaultProps} url="poster.jpg" uploading />);
    expect(screen.getByText('Change').closest('button')).toBeDisabled();
  });

  it('shows URL caption when showUrlCaption is true (default)', () => {
    render(<ImageUploadField {...defaultProps} url="poster.jpg" />);
    expect(screen.getByText('poster.jpg')).toBeInTheDocument();
  });

  it('hides URL caption when showUrlCaption is false', () => {
    render(<ImageUploadField {...defaultProps} url="poster.jpg" showUrlCaption={false} />);
    expect(screen.queryByText('poster.jpg')).not.toBeInTheDocument();
  });

  it('shows reset button when onReset provided and url is set', () => {
    const onReset = vi.fn();
    render(<ImageUploadField {...defaultProps} url="poster.jpg" onReset={onReset} />);
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('calls onReset when reset button clicked', () => {
    const onReset = vi.fn();
    render(<ImageUploadField {...defaultProps} url="poster.jpg" onReset={onReset} />);
    fireEvent.click(screen.getByText('Reset'));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('shows custom reset label', () => {
    const onReset = vi.fn();
    render(
      <ImageUploadField
        {...defaultProps}
        url="poster.jpg"
        onReset={onReset}
        resetLabel="Use Google Avatar"
      />,
    );
    expect(screen.getByText('Use Google Avatar')).toBeInTheDocument();
  });

  it('shows reset button when no url and onReset provided', () => {
    const onReset = vi.fn();
    render(<ImageUploadField {...defaultProps} onReset={onReset} />);
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('shows image-off placeholder on image error', () => {
    render(<ImageUploadField {...defaultProps} url="broken.jpg" />);
    const img = screen.getByAltText('Poster preview');
    fireEvent.error(img);
    expect(screen.getByTestId('image-off')).toBeInTheDocument();
    expect(screen.queryByAltText('Poster preview')).not.toBeInTheDocument();
  });

  it('warns in console when url looks like relative key but no bucket', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<ImageUploadField {...defaultProps} url="relative-key.jpg" />);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('looks like a relative key but no bucket was provided'),
    );
    warnSpy.mockRestore();
  });

  it('does not warn when url starts with http', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<ImageUploadField {...defaultProps} url="https://example.com/img.jpg" />);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
