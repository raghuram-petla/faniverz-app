import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockUpload = vi.fn();
vi.mock('@/hooks/useImageUpload', () => ({
  useImageUpload: () => ({ upload: mockUpload, uploading: false }),
}));

vi.mock('@shared/imageUrl', () => ({
  getImageUrl: vi.fn((_url: string) => null),
}));

import { AddActorForm } from '@/components/cast/AddActorForm';

function makeProps(overrides: Partial<React.ComponentProps<typeof AddActorForm>> = {}) {
  return {
    onSubmit: vi.fn().mockResolvedValue(undefined),
    isPending: false,
    onCancel: vi.fn(),
    ...overrides,
  };
}

describe('AddActorForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
  });

  describe('initial state', () => {
    it('renders Name input', () => {
      render(<AddActorForm {...makeProps()} />);
      expect(screen.getByPlaceholderText('Name *')).toBeInTheDocument();
    });

    it('renders upload photo button when no photo', () => {
      render(<AddActorForm {...makeProps()} />);
      expect(screen.getByText('Photo (optional)')).toBeInTheDocument();
    });

    it('renders Add button', () => {
      render(<AddActorForm {...makeProps()} />);
      expect(screen.getByText('Add')).toBeInTheDocument();
    });

    it('renders Cancel button', () => {
      render(<AddActorForm {...makeProps()} />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('does not submit when name is empty', async () => {
      const onSubmit = vi.fn();
      render(<AddActorForm {...makeProps({ onSubmit })} />);
      fireEvent.click(screen.getByText('Add'));
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not submit when name is only whitespace', async () => {
      const onSubmit = vi.fn();
      render(<AddActorForm {...makeProps({ onSubmit })} />);
      fireEvent.change(screen.getByPlaceholderText('Name *'), { target: { value: '   ' } });
      fireEvent.click(screen.getByText('Add'));
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('calls onSubmit with trimmed name and null optionals', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<AddActorForm {...makeProps({ onSubmit })} />);
      fireEvent.change(screen.getByPlaceholderText('Name *'), { target: { value: 'Prabhas' } });
      fireEvent.click(screen.getByText('Add'));
      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith({
          name: 'Prabhas',
          photo_url: null,
          birth_date: null,
          person_type: 'actor',
          height_cm: null,
        }),
      );
    });

    it('coerces height_cm string to number', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<AddActorForm {...makeProps({ onSubmit })} />);
      fireEvent.change(screen.getByPlaceholderText('Name *'), { target: { value: 'Actor' } });
      const heightInput = screen.getByPlaceholderText('e.g. 178');
      fireEvent.change(heightInput, { target: { value: '180' } });
      fireEvent.click(screen.getByText('Add'));
      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ height_cm: 180 })),
      );
    });

    it('resets form after successful submission', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<AddActorForm {...makeProps({ onSubmit })} />);
      const nameInput = screen.getByPlaceholderText('Name *');
      fireEvent.change(nameInput, { target: { value: 'Actor' } });
      fireEvent.click(screen.getByText('Add'));
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      // Form should reset
      expect((nameInput as HTMLInputElement).value).toBe('');
    });

    it('shows Adding... when isPending', () => {
      render(<AddActorForm {...makeProps({ isPending: true })} />);
      expect(screen.getByText('Adding...')).toBeInTheDocument();
    });

    it('disables Add button when isPending', () => {
      render(<AddActorForm {...makeProps({ isPending: true })} />);
      expect(screen.getByText('Adding...').closest('button')).toBeDisabled();
    });
  });

  describe('cancel', () => {
    it('calls onCancel when Cancel is clicked', () => {
      const onCancel = vi.fn();
      render(<AddActorForm {...makeProps({ onCancel })} />);
      fireEvent.click(screen.getByText('Cancel'));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('person type', () => {
    it('defaults person_type to actor', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<AddActorForm {...makeProps({ onSubmit })} />);
      fireEvent.change(screen.getByPlaceholderText('Name *'), { target: { value: 'Actor' } });
      fireEvent.click(screen.getByText('Add'));
      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ person_type: 'actor' })),
      );
    });

    it('passes technician when selected', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<AddActorForm {...makeProps({ onSubmit })} />);
      fireEvent.change(screen.getByPlaceholderText('Name *'), { target: { value: 'Director' } });
      const personTypeSelect = screen.getByRole('combobox');
      fireEvent.change(personTypeSelect, { target: { value: 'technician' } });
      fireEvent.click(screen.getByText('Add'));
      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ person_type: 'technician' }),
        ),
      );
    });
  });

  describe('photo upload', () => {
    it('shows photo preview after successful upload', async () => {
      mockUpload.mockResolvedValue('https://cdn.example.com/actor.jpg');
      render(<AddActorForm {...makeProps()} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['data'], 'actor.jpg', { type: 'image/jpeg' });
      Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
      fireEvent.change(fileInput);
      await waitFor(() => expect(screen.getByText('Photo uploaded')).toBeInTheDocument());
    });

    it('shows alert when upload fails', async () => {
      mockUpload.mockRejectedValue(new Error('Upload error'));
      render(<AddActorForm {...makeProps()} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['data'], 'actor.jpg', { type: 'image/jpeg' });
      Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
      fireEvent.change(fileInput);
      await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Upload error'));
    });

    it('shows generic error when non-Error rejection occurs', async () => {
      mockUpload.mockRejectedValue('string error');
      render(<AddActorForm {...makeProps()} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['data'], 'actor.jpg', { type: 'image/jpeg' });
      Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
      fireEvent.change(fileInput);
      await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Upload failed'));
    });

    it('removes photo when X button is clicked', async () => {
      mockUpload.mockResolvedValue('https://cdn.example.com/actor.jpg');
      render(<AddActorForm {...makeProps()} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['data'], 'actor.jpg', { type: 'image/jpeg' });
      Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
      fireEvent.change(fileInput);
      await waitFor(() => screen.getByText('Photo uploaded'));
      // Click the X remove button
      const removeBtn = document.querySelector(
        'button[class*="text-status-red"]',
      ) as HTMLButtonElement;
      fireEvent.click(removeBtn);
      expect(screen.getByText('Photo (optional)')).toBeInTheDocument();
    });

    it('does not call upload when no file is selected', () => {
      render(<AddActorForm {...makeProps()} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput);
      expect(mockUpload).not.toHaveBeenCalled();
    });
  });
});
