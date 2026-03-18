import { describe, it, expect } from 'vitest';
import { FILLABLE_DATA_FIELDS, getMissingFields, countMissing } from '@/lib/syncUtils';
import type { ExistingMovieData } from '@/hooks/useSync';

// @boundary: these are pure functions — no mocking needed

function makeMovie(overrides: Partial<ExistingMovieData> = {}): ExistingMovieData {
  return {
    id: 'uuid-1',
    tmdb_id: 101,
    title: 'Baahubali',
    synopsis: null,
    poster_url: null,
    backdrop_url: null,
    trailer_url: null,
    director: null,
    runtime: null,
    genres: null,
    ...overrides,
  };
}

describe('FILLABLE_DATA_FIELDS', () => {
  it('contains exactly 8 field keys', () => {
    expect(FILLABLE_DATA_FIELDS).toHaveLength(8);
  });

  it('includes all expected data fields', () => {
    const expected = [
      'title',
      'synopsis',
      'poster_url',
      'backdrop_url',
      'trailer_url',
      'director',
      'runtime',
      'genres',
    ];
    expect(FILLABLE_DATA_FIELDS).toEqual(expected);
  });

  it('does not include cast (cast is a separate action, not a data field)', () => {
    expect(FILLABLE_DATA_FIELDS).not.toContain('cast');
  });
});

describe('getMissingFields', () => {
  it('returns all 8 fields when only title is set', () => {
    // makeMovie has title='Baahubali' set and everything else null
    const missing = getMissingFields(makeMovie());
    expect(missing).not.toContain('title');
    expect(missing).toContain('synopsis');
    expect(missing).toContain('poster_url');
    expect(missing).toContain('backdrop_url');
    expect(missing).toContain('trailer_url');
    expect(missing).toContain('director');
    expect(missing).toContain('runtime');
    expect(missing).toContain('genres');
    expect(missing).toHaveLength(7);
  });

  it('returns empty array when all fields are filled', () => {
    const full = makeMovie({
      title: 'Baahubali',
      synopsis: 'An epic tale',
      poster_url: '/p.jpg',
      backdrop_url: '/b.jpg',
      trailer_url: 'https://youtu.be/abc',
      director: 'S. S. Rajamouli',
      runtime: 159,
      genres: ['Action', 'Drama'],
    });
    expect(getMissingFields(full)).toHaveLength(0);
  });

  it('includes runtime when runtime is null', () => {
    const m = makeMovie({ runtime: null });
    expect(getMissingFields(m)).toContain('runtime');
  });

  it('does not include runtime when runtime is 0 (valid falsy value)', () => {
    // runtime=0 is technically a valid (if unusual) runtime — == null check handles this
    const m = makeMovie({ runtime: 0 });
    expect(getMissingFields(m)).not.toContain('runtime');
  });

  it('includes genres when genres is null', () => {
    const m = makeMovie({ genres: null });
    expect(getMissingFields(m)).toContain('genres');
  });

  it('includes genres when genres is empty array', () => {
    const m = makeMovie({ genres: [] });
    expect(getMissingFields(m)).toContain('genres');
  });

  it('does not include genres when genres has values', () => {
    const m = makeMovie({ genres: ['Action'] });
    expect(getMissingFields(m)).not.toContain('genres');
  });

  it('includes title when title is null', () => {
    const m = makeMovie({ title: null });
    expect(getMissingFields(m)).toContain('title');
  });

  it('returns only the specific missing fields, not filled ones', () => {
    const m = makeMovie({
      synopsis: 'A story',
      poster_url: '/p.jpg',
      // All other fields null
    });
    const missing = getMissingFields(m);
    expect(missing).not.toContain('synopsis');
    expect(missing).not.toContain('poster_url');
    expect(missing).toContain('backdrop_url');
    expect(missing).toContain('trailer_url');
    expect(missing).toContain('director');
    expect(missing).toContain('runtime');
    expect(missing).toContain('genres');
  });
});

describe('countMissing', () => {
  it('counts all null fillable fields', () => {
    // makeMovie() has title set, everything else null = 7
    expect(countMissing(makeMovie())).toBe(7);
  });

  it('returns 0 for a fully filled movie', () => {
    const full = makeMovie({
      synopsis: 'An epic tale',
      poster_url: '/p.jpg',
      backdrop_url: '/b.jpg',
      trailer_url: 'https://youtu.be/abc',
      director: 'S. S. Rajamouli',
      runtime: 159,
      genres: ['Action'],
    });
    expect(countMissing(full)).toBe(0);
  });

  it('returns 8 when all fields including title are null', () => {
    const empty = makeMovie({ title: null });
    expect(countMissing(empty)).toBe(8);
  });

  it('equals getMissingFields length', () => {
    const m = makeMovie({
      synopsis: 'filled',
      poster_url: '/p.jpg',
      backdrop_url: '/b.jpg',
      trailer_url: 'https://youtu.be/abc',
      director: 'Director',
    });
    // runtime and genres are still null = 2
    expect(countMissing(m)).toBe(getMissingFields(m).length);
    expect(countMissing(m)).toBe(2);
  });
});
