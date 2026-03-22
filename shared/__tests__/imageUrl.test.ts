import { getImageUrl, entityTypeToBucket, posterBucket, backdropBucket } from '../imageUrl';

describe('imageUrl', () => {
  describe('getImageUrl', () => {
    it('returns null for null input', () => {
      expect(getImageUrl(null)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(getImageUrl('')).toBeNull();
    });

    it('returns full URL as-is when size is original', () => {
      const url = 'https://example.com/image.jpg';
      expect(getImageUrl(url, 'original')).toBe(url);
    });

    it('returns external CDN URL as-is regardless of size', () => {
      const tmdb = 'https://image.tmdb.org/t/p/w500/poster.jpg';
      expect(getImageUrl(tmdb, 'sm')).toBe(tmdb);

      const pravatar = 'https://i.pravatar.cc/150?img=1';
      expect(getImageUrl(pravatar, 'md')).toBe(pravatar);
    });

    it('inserts size suffix for non-external full URLs', () => {
      const url = 'https://r2.example.com/poster.jpg';
      expect(getImageUrl(url, 'sm')).toBe('https://r2.example.com/poster_sm.jpg');
      expect(getImageUrl(url, 'lg')).toBe('https://r2.example.com/poster_lg.jpg');
    });

    it('returns null for relative key without bucket', () => {
      expect(getImageUrl('abc123.jpg', 'sm')).toBeNull();
    });

    it('returns null for relative key when env var is missing', () => {
      delete process.env.EXPO_PUBLIC_R2_BASE_URL_POSTERS;
      delete process.env.R2_PUBLIC_BASE_URL_POSTERS;
      expect(getImageUrl('abc123.jpg', 'sm', 'POSTERS')).toBeNull();
    });

    it('resolves relative key with bucket env var', () => {
      process.env.EXPO_PUBLIC_R2_BASE_URL_POSTERS = 'https://r2.example.com/posters';
      expect(getImageUrl('abc123.jpg', 'original', 'POSTERS')).toBe(
        'https://r2.example.com/posters/abc123.jpg',
      );
      expect(getImageUrl('abc123.jpg', 'md', 'POSTERS')).toBe(
        'https://r2.example.com/posters/abc123_md.jpg',
      );
      delete process.env.EXPO_PUBLIC_R2_BASE_URL_POSTERS;
    });

    it('strips trailing slash from base URL', () => {
      process.env.EXPO_PUBLIC_R2_BASE_URL_ACTORS = 'https://r2.example.com/actors/';
      expect(getImageUrl('photo.png', 'original', 'ACTORS')).toBe(
        'https://r2.example.com/actors/photo.png',
      );
      delete process.env.EXPO_PUBLIC_R2_BASE_URL_ACTORS;
    });

    it('falls back to R2_PUBLIC_BASE_URL_ env var (admin)', () => {
      process.env.R2_PUBLIC_BASE_URL_AVATARS = 'https://r2.example.com/avatars';
      expect(getImageUrl('avatar.jpg', 'sm', 'AVATARS')).toBe(
        'https://r2.example.com/avatars/avatar_sm.jpg',
      );
      delete process.env.R2_PUBLIC_BASE_URL_AVATARS;
    });
  });

  describe('entityTypeToBucket', () => {
    it('maps movie to POSTERS', () => {
      expect(entityTypeToBucket('movie')).toBe('POSTERS');
    });

    it('maps actor to ACTORS', () => {
      expect(entityTypeToBucket('actor')).toBe('ACTORS');
    });

    it('maps production_house to PRODUCTION_HOUSES', () => {
      expect(entityTypeToBucket('production_house')).toBe('PRODUCTION_HOUSES');
    });

    it('maps user to AVATARS', () => {
      expect(entityTypeToBucket('user')).toBe('AVATARS');
    });
  });

  describe('posterBucket', () => {
    it('returns BACKDROPS when imageType is backdrop', () => {
      expect(posterBucket('backdrop')).toBe('BACKDROPS');
    });

    it('returns POSTERS for any other value', () => {
      expect(posterBucket('poster')).toBe('POSTERS');
      expect(posterBucket(null)).toBe('POSTERS');
      expect(posterBucket(undefined)).toBe('POSTERS');
    });
  });

  describe('backdropBucket', () => {
    it('returns POSTERS when imageType is poster', () => {
      expect(backdropBucket('poster')).toBe('POSTERS');
    });

    it('returns BACKDROPS for any other value', () => {
      expect(backdropBucket('backdrop')).toBe('BACKDROPS');
      expect(backdropBucket(null)).toBe('BACKDROPS');
      expect(backdropBucket(undefined)).toBe('BACKDROPS');
    });
  });
});
