import { describe, it, expect } from 'vitest';
import { validateMovieForm, validateTheatricalRun, formatErrors } from '@/lib/movie-validation';
import type { MovieForm } from '@/hooks/useMovieEditTypes';

const validForm: MovieForm = {
  title: 'Test Movie',
  poster_url: '',
  backdrop_url: '',
  release_date: '2025-01-01',
  runtime: '120',
  genres: ['Action'],
  certification: 'UA',
  synopsis: 'A synopsis',
  in_theaters: false,
  premiere_date: '',
  original_language: 'te',
  is_featured: false,
  tmdb_id: '',
  tagline: '',
  backdrop_focus_x: null,
  backdrop_focus_y: null,
  poster_focus_x: null,
  poster_focus_y: null,
};

function form(overrides: Partial<MovieForm> = {}): MovieForm {
  return { ...validForm, ...overrides };
}

describe('validateMovieForm', () => {
  it('returns no errors for a valid form', () => {
    expect(validateMovieForm(form())).toEqual([]);
  });

  it('requires title', () => {
    const errors = validateMovieForm(form({ title: '' }));
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('title');
    expect(errors[0].message).toContain('required');
  });

  it('rejects whitespace-only title', () => {
    const errors = validateMovieForm(form({ title: '   ' }));
    expect(errors[0].field).toBe('title');
  });

  it('validates release_date format', () => {
    const errors = validateMovieForm(form({ release_date: 'not-a-date' }));
    expect(errors.some((e) => e.field === 'release_date')).toBe(true);
  });

  it('validates premiere_date format', () => {
    const errors = validateMovieForm(form({ premiere_date: 'bad' }));
    expect(errors.some((e) => e.field === 'premiere_date')).toBe(true);
  });

  it('allows empty release_date and premiere_date', () => {
    const errors = validateMovieForm(form({ release_date: '', premiere_date: '' }));
    expect(errors).toEqual([]);
  });

  it('rejects premiere_date after release_date', () => {
    const errors = validateMovieForm(
      form({ release_date: '2025-06-01', premiere_date: '2025-06-15' }),
    );
    expect(errors.some((e) => e.field === 'premiere_date')).toBe(true);
    expect(errors[0].message).toContain('cannot be later');
  });

  it('allows premiere_date equal to release_date', () => {
    const errors = validateMovieForm(
      form({ release_date: '2025-06-01', premiere_date: '2025-06-01' }),
    );
    expect(errors).toEqual([]);
  });

  it('allows premiere_date before release_date', () => {
    const errors = validateMovieForm(
      form({ release_date: '2025-06-01', premiere_date: '2025-05-31' }),
    );
    expect(errors).toEqual([]);
  });

  it('rejects in_theaters with future release_date', () => {
    const errors = validateMovieForm(form({ in_theaters: true, release_date: '2099-01-01' }));
    expect(errors.some((e) => e.field === 'in_theaters')).toBe(true);
    expect(errors[0].message).toContain('In Theaters');
  });

  it('allows in_theaters with past release_date', () => {
    const errors = validateMovieForm(form({ in_theaters: true, release_date: '2020-01-01' }));
    expect(errors).toEqual([]);
  });

  it('rejects in_theaters with future premiere_date and no release_date', () => {
    const errors = validateMovieForm(
      form({ in_theaters: true, release_date: '', premiere_date: '2099-01-01' }),
    );
    expect(errors.some((e) => e.field === 'in_theaters')).toBe(true);
  });

  it('rejects zero runtime', () => {
    const errors = validateMovieForm(form({ runtime: '0' }));
    expect(errors.some((e) => e.field === 'runtime')).toBe(true);
  });

  it('rejects negative runtime', () => {
    const errors = validateMovieForm(form({ runtime: '-5' }));
    expect(errors.some((e) => e.field === 'runtime')).toBe(true);
  });

  it('rejects non-numeric runtime', () => {
    const errors = validateMovieForm(form({ runtime: 'abc' }));
    expect(errors.some((e) => e.field === 'runtime')).toBe(true);
  });

  it('allows empty runtime', () => {
    const errors = validateMovieForm(form({ runtime: '' }));
    expect(errors).toEqual([]);
  });

  it('returns multiple errors at once', () => {
    const errors = validateMovieForm(
      form({ title: '', runtime: '-1', premiere_date: '2025-12-01', release_date: '2025-01-01' }),
    );
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe('validateTheatricalRun', () => {
  it('returns no errors for a valid new date', () => {
    expect(validateTheatricalRun('2025-06-01', ['2025-01-01'])).toEqual([]);
  });

  it('requires release_date', () => {
    const errors = validateTheatricalRun('', []);
    expect(errors[0].message).toContain('required');
  });

  it('validates date format', () => {
    const errors = validateTheatricalRun('bad-date', []);
    expect(errors[0].message).toContain('format');
  });

  it('rejects duplicate dates', () => {
    const errors = validateTheatricalRun('2025-06-01', ['2025-06-01', '2025-01-01']);
    expect(errors[0].message).toContain('already exists');
  });

  it('allows different dates', () => {
    const errors = validateTheatricalRun('2025-06-02', ['2025-06-01']);
    expect(errors).toEqual([]);
  });
});

describe('formatErrors', () => {
  it('formats errors with bullet points', () => {
    const result = formatErrors([
      { field: 'a', message: 'Error 1' },
      { field: 'b', message: 'Error 2' },
    ]);
    expect(result).toBe('• Error 1\n• Error 2');
  });

  it('returns empty string for no errors', () => {
    expect(formatErrors([])).toBe('');
  });
});
