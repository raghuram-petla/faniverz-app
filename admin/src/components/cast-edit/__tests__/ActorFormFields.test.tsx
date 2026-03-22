import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('@shared/imageUrl', () => ({
  getImageUrl: vi.fn((_url: string) => null),
}));

vi.mock('@/components/movie-edit/PosterGalleryCard', () => ({
  PosterVariantStatus: () => <div data-testid="poster-variant-status" />,
}));

import { ActorFormFields } from '@/components/cast-edit/ActorFormFields';
import type { ActorFormState } from '@/components/cast-edit/ActorFormFields';

const baseForm: ActorFormState = {
  name: '',
  photo_url: '',
  person_type: 'actor',
  birth_date: '',
  gender: '0',
  biography: '',
  place_of_birth: '',
  height_cm: '',
  tmdb_person_id: '',
};

function renderFields(
  formOverrides: Partial<ActorFormState> = {},
  onFieldChange = vi.fn(),
  onPhotoUpload = vi.fn(),
  uploading = false,
) {
  const form = { ...baseForm, ...formOverrides };
  return render(
    <ActorFormFields
      form={form}
      uploading={uploading}
      onFieldChange={onFieldChange}
      onPhotoUpload={onPhotoUpload}
    />,
  );
}

describe('ActorFormFields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('name field', () => {
    it('renders name input with current value', () => {
      renderFields({ name: 'Mahesh Babu' });
      expect(screen.getByDisplayValue('Mahesh Babu')).toBeInTheDocument();
    });

    it('calls onFieldChange when name changes', () => {
      const onFieldChange = vi.fn();
      renderFields({}, onFieldChange);
      const input = screen.getAllByRole('textbox')[0];
      fireEvent.change(input, { target: { value: 'Prabhas' } });
      expect(onFieldChange).toHaveBeenCalledWith('name', 'Prabhas');
    });
  });

  describe('photo upload — no photo', () => {
    it('shows Upload Photo button when photo_url is empty', () => {
      renderFields({ photo_url: '' });
      expect(screen.getByText('Upload Photo')).toBeInTheDocument();
    });

    it('disables upload button when uploading', () => {
      renderFields({ photo_url: '' }, vi.fn(), vi.fn(), true);
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
      const btn = screen.getByText('Uploading...').closest('button')!;
      expect(btn).toBeDisabled();
    });

    it('triggers file input click on upload button click', () => {
      renderFields({ photo_url: '' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, 'click');
      fireEvent.click(screen.getByText('Upload Photo'));
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('photo upload — with photo', () => {
    it('shows photo preview image when photo_url is set', () => {
      renderFields({ photo_url: 'https://cdn.example.com/actor.jpg' });
      const img = screen.getByAltText('Photo preview');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://cdn.example.com/actor.jpg');
    });

    it('shows Change and Remove buttons when photo is set', () => {
      renderFields({ photo_url: 'https://cdn.example.com/actor.jpg' });
      expect(screen.getByText('Change')).toBeInTheDocument();
      expect(screen.getByText('Remove')).toBeInTheDocument();
    });

    it('calls onFieldChange with empty string when Remove is clicked', () => {
      const onFieldChange = vi.fn();
      renderFields({ photo_url: 'https://cdn.example.com/actor.jpg' }, onFieldChange);
      fireEvent.click(screen.getByText('Remove'));
      expect(onFieldChange).toHaveBeenCalledWith('photo_url', '');
    });

    it('shows loading spinner in Change button when uploading', () => {
      renderFields({ photo_url: 'https://cdn.example.com/actor.jpg' }, vi.fn(), vi.fn(), true);
      const changeBtn = screen.getByText('Change').closest('button')!;
      expect(changeBtn).toBeDisabled();
    });

    it('renders PosterVariantStatus when photo_url is set', () => {
      renderFields({ photo_url: 'https://cdn.example.com/actor.jpg' });
      expect(screen.getByTestId('poster-variant-status')).toBeInTheDocument();
    });
  });

  describe('file input change', () => {
    it('calls onPhotoUpload when file is selected', () => {
      const onPhotoUpload = vi.fn();
      renderFields({}, vi.fn(), onPhotoUpload);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      Object.defineProperty(fileInput, 'files', { value: [file], writable: false });
      fireEvent.change(fileInput);
      expect(onPhotoUpload).toHaveBeenCalledWith(file);
    });

    it('does not call onPhotoUpload when no file selected', () => {
      const onPhotoUpload = vi.fn();
      renderFields({}, vi.fn(), onPhotoUpload);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput);
      expect(onPhotoUpload).not.toHaveBeenCalled();
    });
  });

  describe('person type select', () => {
    it('defaults to actor', () => {
      renderFields();
      const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
      // Person type is the first select
      expect(selects[0].value).toBe('actor');
    });

    it('calls onFieldChange when person_type changes', () => {
      const onFieldChange = vi.fn();
      renderFields({}, onFieldChange);
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: 'technician' } });
      expect(onFieldChange).toHaveBeenCalledWith('person_type', 'technician');
    });
  });

  describe('gender select', () => {
    it('renders gender options 0-3', () => {
      renderFields();
      const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
      // Gender is the second select
      expect(selects[1].options.length).toBe(4);
    });

    it('calls onFieldChange when gender changes', () => {
      const onFieldChange = vi.fn();
      renderFields({}, onFieldChange);
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[1], { target: { value: '2' } });
      expect(onFieldChange).toHaveBeenCalledWith('gender', '2');
    });
  });

  describe('text fields', () => {
    it('calls onFieldChange for height_cm', () => {
      const onFieldChange = vi.fn();
      renderFields({}, onFieldChange);
      const heightLabel = screen.getByText('Height (cm)');
      const heightField = heightLabel.closest('div')!.querySelector('input')!;
      fireEvent.change(heightField, { target: { value: '175' } });
      expect(onFieldChange).toHaveBeenCalledWith('height_cm', '175');
    });

    it('calls onFieldChange for biography', () => {
      const onFieldChange = vi.fn();
      renderFields({}, onFieldChange);
      const biographyLabel = screen.getByText('Biography');
      const textarea = biographyLabel.closest('div')!.querySelector('textarea')!;
      fireEvent.change(textarea, { target: { value: 'Born in Hyderabad' } });
      expect(onFieldChange).toHaveBeenCalledWith('biography', 'Born in Hyderabad');
    });

    it('calls onFieldChange for place_of_birth', () => {
      const onFieldChange = vi.fn();
      renderFields({}, onFieldChange);
      const placeLabel = screen.getByText('Place of Birth');
      const field = placeLabel.closest('div')!.querySelector('input')!;
      fireEvent.change(field, { target: { value: 'Hyderabad' } });
      expect(onFieldChange).toHaveBeenCalledWith('place_of_birth', 'Hyderabad');
    });
  });
});
