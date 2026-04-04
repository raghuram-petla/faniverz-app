import { describe, it, expect } from 'vitest';
import { FILLABLE_DATA_FIELDS } from '@/lib/syncUtils';

// @boundary: these are pure functions — no mocking needed

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
