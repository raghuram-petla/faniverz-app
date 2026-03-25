import { GENRES } from '../movie-genres';
import type { Genre } from '../movie-genres';

describe('GENRES', () => {
  it('should export a non-empty array', () => {
    expect(GENRES.length).toBeGreaterThan(0);
  });

  it('should contain no duplicates', () => {
    const unique = new Set(GENRES);
    expect(unique.size).toBe(GENRES.length);
  });

  it('should include all expected genres', () => {
    const expected = [
      'Action',
      'Drama',
      'Comedy',
      'Romance',
      'Thriller',
      'Horror',
      'Sci-Fi',
      'Fantasy',
      'Crime',
      'Family',
      'Adventure',
      'Historical',
    ];
    for (const genre of expected) {
      expect(GENRES).toContain(genre);
    }
  });

  it('should have Genre type matching array elements', () => {
    // Type-level check — a Genre value should be assignable
    const genre: Genre = GENRES[0];
    expect(typeof genre).toBe('string');
  });
});
