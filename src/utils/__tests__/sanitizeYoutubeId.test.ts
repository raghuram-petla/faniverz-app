import { sanitizeYoutubeId } from '../sanitizeYoutubeId';

describe('sanitizeYoutubeId', () => {
  it('returns a valid alphanumeric ID unchanged', () => {
    expect(sanitizeYoutubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('allows hyphens in ID', () => {
    expect(sanitizeYoutubeId('abc-def')).toBe('abc-def');
  });

  it('allows underscores in ID', () => {
    expect(sanitizeYoutubeId('abc_def')).toBe('abc_def');
  });

  it('allows mixed case letters, digits, hyphens, and underscores', () => {
    expect(sanitizeYoutubeId('aB3_-Zz')).toBe('aB3_-Zz');
  });

  it('returns empty string for ID containing spaces', () => {
    expect(sanitizeYoutubeId('abc def')).toBe('');
  });

  it('returns empty string for ID containing special characters', () => {
    expect(sanitizeYoutubeId('abc!@#')).toBe('');
  });

  it('returns empty string for ID containing angle brackets (XSS attempt)', () => {
    expect(sanitizeYoutubeId('<script>')).toBe('');
  });

  it('returns empty string for ID containing dots', () => {
    expect(sanitizeYoutubeId('abc.def')).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeYoutubeId('')).toBe('');
  });

  it('returns empty string for ID with query string injection', () => {
    expect(sanitizeYoutubeId('abc?autoplay=1')).toBe('');
  });

  it('returns empty string for ID with slash (path traversal)', () => {
    expect(sanitizeYoutubeId('abc/def')).toBe('');
  });

  it('accepts a single character ID', () => {
    expect(sanitizeYoutubeId('A')).toBe('A');
  });

  it('accepts a typical 11-character YouTube ID', () => {
    const id = 'K8nM9hPZQBg';
    expect(sanitizeYoutubeId(id)).toBe(id);
  });
});
