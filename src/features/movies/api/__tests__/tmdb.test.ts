import { getPosterUrl, getBackdropUrl } from '../tmdb';

describe('TMDB image helpers', () => {
  describe('getPosterUrl', () => {
    it('returns null for null path', () => {
      expect(getPosterUrl(null)).toBeNull();
    });

    it('returns medium size URL by default', () => {
      expect(getPosterUrl('/abc.jpg')).toBe('https://image.tmdb.org/t/p/w342/abc.jpg');
    });

    it('returns small size URL', () => {
      expect(getPosterUrl('/abc.jpg', 'small')).toBe('https://image.tmdb.org/t/p/w185/abc.jpg');
    });

    it('returns large size URL', () => {
      expect(getPosterUrl('/abc.jpg', 'large')).toBe('https://image.tmdb.org/t/p/w500/abc.jpg');
    });

    it('returns original size URL', () => {
      expect(getPosterUrl('/abc.jpg', 'original')).toBe(
        'https://image.tmdb.org/t/p/original/abc.jpg'
      );
    });
  });

  describe('getBackdropUrl', () => {
    it('returns null for null path', () => {
      expect(getBackdropUrl(null)).toBeNull();
    });

    it('returns medium size URL by default', () => {
      expect(getBackdropUrl('/bg.jpg')).toBe('https://image.tmdb.org/t/p/w780/bg.jpg');
    });

    it('returns small size URL', () => {
      expect(getBackdropUrl('/bg.jpg', 'small')).toBe('https://image.tmdb.org/t/p/w300/bg.jpg');
    });

    it('returns large size URL', () => {
      expect(getBackdropUrl('/bg.jpg', 'large')).toBe('https://image.tmdb.org/t/p/w1280/bg.jpg');
    });
  });
});
