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
    release_date: null,
    poster_url: null,
    backdrop_url: null,
    director: null,
    runtime: null,
    genres: null,
    imdb_id: null,
    title_te: null,
    synopsis_te: null,
    tagline: null,
    tmdb_status: null,
    tmdb_vote_average: null,
    tmdb_vote_count: null,
    budget: null,
    revenue: null,
    certification: null,
    spoken_languages: null,
    ...overrides,
  };
}

describe('FILLABLE_DATA_FIELDS', () => {
  it('contains exactly 22 field keys', () => {
    expect(FILLABLE_DATA_FIELDS).toHaveLength(22);
  });

  it('includes all expected data fields', () => {
    const expected = [
      'title',
      'synopsis',
      'release_date',
      'poster_url',
      'backdrop_url',
      'director',
      'runtime',
      'genres',
      'images',
      'videos',
      'watch_providers',
      'keywords',
      'imdb_id',
      'title_te',
      'synopsis_te',
      'tagline',
      'tmdb_status',
      'tmdb_ratings',
      'budget_revenue',
      'certification_auto',
      'production_companies',
      'spoken_languages',
    ];
    expect(FILLABLE_DATA_FIELDS).toEqual(expected);
  });

  it('does not include cast (cast is a separate action, not a data field)', () => {
    expect(FILLABLE_DATA_FIELDS).not.toContain('cast');
  });
});

describe('getMissingFields', () => {
  it('returns all missing fields when only title is set', () => {
    // makeMovie has title='Baahubali' set and everything else null
    const missing = getMissingFields(makeMovie());
    expect(missing).not.toContain('title');
    expect(missing).toContain('synopsis');
    expect(missing).toContain('poster_url');
    expect(missing).toContain('backdrop_url');
    expect(missing).toContain('director');
    expect(missing).toContain('runtime');
    expect(missing).toContain('genres');
    expect(missing).toContain('imdb_id');
    expect(missing).toContain('title_te');
    expect(missing).toContain('synopsis_te');
    expect(missing).toContain('tagline');
    expect(missing).toContain('tmdb_status');
    expect(missing).toContain('tmdb_ratings');
    expect(missing).toContain('budget_revenue');
    expect(missing).toContain('certification_auto');
    expect(missing).not.toContain('production_companies'); // aggregate, not auto-filled
    expect(missing).toContain('spoken_languages');
    expect(missing).toHaveLength(15);
  });

  it('returns empty array when all fields are filled', () => {
    const full = makeMovie({
      title: 'Baahubali',
      synopsis: 'An epic tale',
      poster_url: '/p.jpg',
      backdrop_url: '/b.jpg',
      director: 'S. S. Rajamouli',
      runtime: 159,
      genres: ['Action', 'Drama'],
      imdb_id: 'tt1234567',
      title_te: 'బాహుబలి',
      synopsis_te: 'ఒక మహాకావ్యం',
      tagline: 'The Beginning',
      tmdb_status: 'Released',
      tmdb_vote_average: 8.0,
      budget: 1800000,
      revenue: 6500000,
      certification: 'UA',
      spoken_languages: ['te', 'hi'],
    });
    expect(getMissingFields(full)).toHaveLength(0);
  });

  it('includes runtime when runtime is null', () => {
    const m = makeMovie({ runtime: null });
    expect(getMissingFields(m)).toContain('runtime');
  });

  it('does not include runtime when runtime is 0 (valid falsy value)', () => {
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
    });
    const missing = getMissingFields(m);
    expect(missing).not.toContain('synopsis');
    expect(missing).not.toContain('poster_url');
    expect(missing).toContain('backdrop_url');
    expect(missing).toContain('director');
    expect(missing).toContain('runtime');
    expect(missing).toContain('genres');
  });

  it('includes imdb_id when null', () => {
    expect(getMissingFields(makeMovie())).toContain('imdb_id');
  });

  it('excludes imdb_id when filled', () => {
    expect(getMissingFields(makeMovie({ imdb_id: 'tt123' }))).not.toContain('imdb_id');
  });

  it('includes title_te and synopsis_te when null', () => {
    const missing = getMissingFields(makeMovie());
    expect(missing).toContain('title_te');
    expect(missing).toContain('synopsis_te');
  });

  it('excludes title_te and synopsis_te when filled', () => {
    const missing = getMissingFields(makeMovie({ title_te: 'తెలుగు', synopsis_te: 'కథ' }));
    expect(missing).not.toContain('title_te');
    expect(missing).not.toContain('synopsis_te');
  });
});

describe('countMissing', () => {
  it('counts all null fillable fields', () => {
    // makeMovie() has title set, everything else null = 15
    expect(countMissing(makeMovie())).toBe(15);
  });

  it('returns 0 for a fully filled movie', () => {
    const full = makeMovie({
      synopsis: 'An epic tale',
      poster_url: '/p.jpg',
      backdrop_url: '/b.jpg',
      director: 'S. S. Rajamouli',
      runtime: 159,
      genres: ['Action'],
      imdb_id: 'tt123',
      title_te: 'బాహుబలి',
      synopsis_te: 'కథ',
      tagline: 'The Beginning',
      tmdb_status: 'Released',
      tmdb_vote_average: 8.0,
      budget: 1800000,
      revenue: 6500000,
      certification: 'UA',
      spoken_languages: ['te'],
    });
    expect(countMissing(full)).toBe(0);
  });

  it('returns 16 when all fields including title are null', () => {
    const empty = makeMovie({ title: null });
    expect(countMissing(empty)).toBe(16);
  });

  it('equals getMissingFields length', () => {
    const m = makeMovie({
      synopsis: 'filled',
      poster_url: '/p.jpg',
      backdrop_url: '/b.jpg',
      director: 'Director',
    });
    expect(countMissing(m)).toBe(getMissingFields(m).length);
  });
});
