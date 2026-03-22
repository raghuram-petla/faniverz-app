import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string, _size: string, _bucket: string) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `https://cdn/${url}`;
  },
}));

import { ImageUploadField } from '@/components/movie-edit/ImageUploadField';

const noop = vi.fn();

describe('ImageUploadField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  const defaultProps = {
    label: 'Photo',
    url: '',
    uploading: false,
    uploadEndpoint: '/api/upload/photo',
    previewAlt: 'Photo preview',
    previewClassName: 'w-20 h-20',
    onUpload: noop,
    onRemove: noop,
  };

  it('shows Upload button when url is empty', () => {
    render(<ImageUploadField {...defaultProps} />);
    expect(screen.getByText('Upload Photo')).toBeInTheDocument();
  });

  it('shows label text by default', () => {
    render(<ImageUploadField {...defaultProps} />);
    expect(screen.getByText('Photo')).toBeInTheDocument();
  });

  it('hides label when hideLabel is true', () => {
    render(<ImageUploadField {...defaultProps} hideLabel />);
    expect(screen.queryByText('Photo')).not.toBeInTheDocument();
  });

  it('shows "Uploading..." when uploading is true and url is empty', () => {
    render(<ImageUploadField {...defaultProps} uploading />);
    expect(screen.getByText('Uploading...')).toBeInTheDocument();
  });

  it('shows preview image when url is present', () => {
    render(<ImageUploadField {...defaultProps} url="https://cdn/photo.jpg" />);
    const img = screen.getByAltText('Photo preview');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toBe('https://cdn/photo.jpg');
  });

  it('shows Change and Remove buttons when url is set', () => {
    render(<ImageUploadField {...defaultProps} url="https://cdn/photo.jpg" />);
    expect(screen.getByText('Change')).toBeInTheDocument();
    expect(screen.getByText('Remove')).toBeInTheDocument();
  });

  it('calls onRemove when Remove is clicked', () => {
    const mockOnRemove = vi.fn();
    render(
      <ImageUploadField {...defaultProps} url="https://cdn/photo.jpg" onRemove={mockOnRemove} />,
    );
    fireEvent.click(screen.getByText('Remove'));
    expect(mockOnRemove).toHaveBeenCalled();
  });

  it('shows broken image placeholder when img errors', () => {
    render(<ImageUploadField {...defaultProps} url="https://cdn/broken.jpg" />);
    const img = screen.getByAltText('Photo preview');
    fireEvent.error(img);
    // After error, img is replaced with ImageOff placeholder
    expect(screen.queryByAltText('Photo preview')).not.toBeInTheDocument();
  });

  it('shows Reset button when onReset is provided and url is empty', () => {
    render(<ImageUploadField {...defaultProps} onReset={vi.fn()} resetLabel="Use Google Avatar" />);
    expect(screen.getByText('Use Google Avatar')).toBeInTheDocument();
  });

  it('shows Reset button when onReset is provided and url is set', () => {
    render(
      <ImageUploadField
        {...defaultProps}
        url="https://cdn/photo.jpg"
        onReset={vi.fn()}
        resetLabel="Reset"
      />,
    );
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('calls onReset when Reset button is clicked (url empty)', () => {
    const mockOnReset = vi.fn();
    render(<ImageUploadField {...defaultProps} onReset={mockOnReset} resetLabel="Reset" />);
    fireEvent.click(screen.getByText('Reset'));
    expect(mockOnReset).toHaveBeenCalled();
  });

  it('calls onReset when Reset button is clicked (url set)', () => {
    const mockOnReset = vi.fn();
    render(
      <ImageUploadField
        {...defaultProps}
        url="https://cdn/photo.jpg"
        onReset={mockOnReset}
        resetLabel="Reset"
      />,
    );
    fireEvent.click(screen.getByText('Reset'));
    expect(mockOnReset).toHaveBeenCalled();
  });

  it('does not show Reset button when onReset is not provided', () => {
    render(<ImageUploadField {...defaultProps} />);
    expect(screen.queryByText('Reset')).not.toBeInTheDocument();
  });

  it('shows URL caption when showUrlCaption is true and url is set', () => {
    render(<ImageUploadField {...defaultProps} url="https://cdn/photo.jpg" showUrlCaption />);
    expect(screen.getByText('https://cdn/photo.jpg')).toBeInTheDocument();
  });

  it('hides URL caption when showUrlCaption is false', () => {
    render(
      <ImageUploadField {...defaultProps} url="https://cdn/photo.jpg" showUrlCaption={false} />,
    );
    expect(screen.queryByText('https://cdn/photo.jpg')).not.toBeInTheDocument();
  });

  it('uses getImageUrl to construct display URL when bucket is provided', () => {
    render(<ImageUploadField {...defaultProps} url="relative-key.jpg" bucket="POSTERS" />);
    const img = screen.getByAltText('Photo preview');
    expect(img.getAttribute('src')).toBe('https://cdn/relative-key.jpg');
  });

  it('logs a console.warn when url looks like relative key but no bucket', () => {
    render(<ImageUploadField {...defaultProps} url="relative-key.jpg" />);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('relative key but no bucket'),
    );
  });

  it('Change button is disabled when uploading', () => {
    render(<ImageUploadField {...defaultProps} url="https://cdn/photo.jpg" uploading />);
    const changeBtn = screen.getByText('Change').closest('button');
    expect(changeBtn).toBeDisabled();
  });

  it('Upload button is disabled when uploading', () => {
    render(<ImageUploadField {...defaultProps} uploading />);
    const uploadBtn = screen.getByText('Uploading...').closest('button');
    expect(uploadBtn).toBeDisabled();
  });

  it('triggers file input click when Upload button is clicked', () => {
    const { container } = render(<ImageUploadField {...defaultProps} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click').mockImplementation(() => {});
    fireEvent.click(screen.getByText('Upload Photo'));
    expect(clickSpy).toHaveBeenCalled();
  });

  it('calls onUpload when file is selected', async () => {
    const mockOnUpload = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<ImageUploadField {...defaultProps} onUpload={mockOnUpload} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    fireEvent.change(fileInput);
    expect(mockOnUpload).toHaveBeenCalledWith(file, '/api/upload/photo');
  });

  it('does not call onUpload when no file is selected', () => {
    const mockOnUpload = vi.fn();
    const { container } = render(<ImageUploadField {...defaultProps} onUpload={mockOnUpload} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', { value: [], configurable: true });
    fireEvent.change(fileInput);
    expect(mockOnUpload).not.toHaveBeenCalled();
  });

  it('triggers file input click when Change button is clicked (url set)', () => {
    const { container } = render(
      <ImageUploadField {...defaultProps} url="https://cdn/photo.jpg" />,
    );
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click').mockImplementation(() => {});
    fireEvent.click(screen.getByText('Change'));
    expect(clickSpy).toHaveBeenCalled();
  });
});
