import type { MovieForm } from '@/hooks/useMovieEditTypes';

export interface ValidationError {
  field: string;
  message: string;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const d = new Date(value + 'T00:00:00');
  return !isNaN(d.getTime());
}

function isFutureDate(value: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return value > today;
}

// @contract: returns an array of validation errors; empty array means valid
// @assumes: form fields use empty string for "not set" (not null/undefined)
export function validateMovieForm(form: MovieForm): ValidationError[] {
  const errors: ValidationError[] = [];

  // Title required
  if (!form.title.trim()) {
    errors.push({ field: 'title', message: 'Title is required.' });
  }

  // Release date format
  if (form.release_date && !isValidDate(form.release_date)) {
    errors.push({ field: 'release_date', message: 'Invalid release date format.' });
  }

  // Premiere date format
  if (form.premiere_date && !isValidDate(form.premiere_date)) {
    errors.push({ field: 'premiere_date', message: 'Invalid premiere date format.' });
  }

  // Premiere date must be ≤ release date
  if (
    form.premiere_date &&
    form.release_date &&
    isValidDate(form.premiere_date) &&
    isValidDate(form.release_date) &&
    form.premiere_date > form.release_date
  ) {
    errors.push({
      field: 'premiere_date',
      message: 'Premiere date cannot be later than release date.',
    });
  }

  // Cannot set in_theaters=true if release_date is in the future
  if (form.in_theaters && form.release_date && isFutureDate(form.release_date)) {
    errors.push({
      field: 'in_theaters',
      message: 'Cannot mark as "In Theaters" when release date is in the future.',
    });
  }

  // Cannot set in_theaters=true if premiere_date is in the future (and no release_date)
  if (
    form.in_theaters &&
    !form.release_date &&
    form.premiere_date &&
    isFutureDate(form.premiere_date)
  ) {
    errors.push({
      field: 'in_theaters',
      message: 'Cannot mark as "In Theaters" when premiere date is in the future.',
    });
  }

  // Runtime must be positive if provided
  if (form.runtime) {
    const n = Number(form.runtime);
    if (isNaN(n) || n <= 0) {
      errors.push({ field: 'runtime', message: 'Runtime must be a positive number.' });
    }
  }

  return errors;
}

// @contract: validates a theatrical run release_date against existing runs
export function validateTheatricalRun(
  releaseDate: string,
  existingDates: string[],
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!releaseDate) {
    errors.push({ field: 'release_date', message: 'Release date is required.' });
    return errors;
  }

  if (!isValidDate(releaseDate)) {
    errors.push({ field: 'release_date', message: 'Invalid date format.' });
    return errors;
  }

  if (existingDates.includes(releaseDate)) {
    errors.push({
      field: 'release_date',
      message: 'A theatrical run for this date already exists.',
    });
  }

  return errors;
}

// @contract: formats validation errors into a single string for alert display
export function formatErrors(errors: ValidationError[]): string {
  return errors.map((e) => `• ${e.message}`).join('\n');
}
