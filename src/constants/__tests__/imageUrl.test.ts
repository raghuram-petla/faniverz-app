import { getImageUrl, entityTypeToBucket } from '@shared/imageUrl';

describe('getImageUrl', () => {
  it('returns null when originalUrl is null', () => {
    expect(getImageUrl(null)).toBeNull();
  });

  it('returns original URL when size is "original"', () => {
    const url = 'https://pub-abc.r2.dev/abc.jpg';
    expect(getImageUrl(url, 'original')).toBe(url);
  });

  it('returns original URL when size is omitted (default)', () => {
    const url = 'https://pub-abc.r2.dev/abc.jpg';
    expect(getImageUrl(url)).toBe(url);
  });

  // Full URLs — backward compat (pre-migration records still stored as full URLs)
  it('returns _sm variant for full R2 URL', () => {
    expect(getImageUrl('https://pub-abc.r2.dev/abc.jpg', 'sm')).toBe(
      'https://pub-abc.r2.dev/abc_sm.jpg',
    );
  });

  it('returns _md variant for full R2 URL', () => {
    expect(getImageUrl('https://pub-abc.r2.dev/abc.jpg', 'md')).toBe(
      'https://pub-abc.r2.dev/abc_md.jpg',
    );
  });

  it('returns _lg variant for full R2 URL', () => {
    expect(getImageUrl('https://pub-abc.r2.dev/abc.jpg', 'lg')).toBe(
      'https://pub-abc.r2.dev/abc_lg.jpg',
    );
  });

  it('works with .png extension on full URL', () => {
    expect(getImageUrl('https://pub-abc.r2.dev/poster.png', 'sm')).toBe(
      'https://pub-abc.r2.dev/poster_sm.png',
    );
  });

  it('works with .webp extension on full URL', () => {
    expect(getImageUrl('https://pub-abc.r2.dev/banner.webp', 'md')).toBe(
      'https://pub-abc.r2.dev/banner_md.webp',
    );
  });

  // Full URLs — MinIO localhost (backward compat)
  it('returns _sm variant for MinIO localhost full URL', () => {
    expect(getImageUrl('http://localhost:9000/faniverz-actor-photos/abc.jpg', 'sm')).toBe(
      'http://localhost:9000/faniverz-actor-photos/abc_sm.jpg',
    );
  });

  it('returns _lg variant for MinIO localhost full URL', () => {
    expect(getImageUrl('http://localhost:9000/faniverz-movie-posters/poster.jpg', 'lg')).toBe(
      'http://localhost:9000/faniverz-movie-posters/poster_lg.jpg',
    );
  });

  // External CDN URLs — never add variant suffix
  it('returns original TMDB URL without variant suffix', () => {
    const url = 'https://image.tmdb.org/t/p/w185/abc123.jpg';
    expect(getImageUrl(url, 'sm')).toBe(url);
  });

  it('returns original i.pravatar.cc URL without variant suffix', () => {
    const url = 'https://i.pravatar.cc/500?u=abc';
    expect(getImageUrl(url, 'md')).toBe(url);
  });

  // Relative keys — post-migration format
  it('returns null for relative key when no bucket provided', () => {
    expect(getImageUrl('abc123.jpg', 'sm')).toBeNull();
  });

  it('returns null for relative key when base URL env var is not set', () => {
    // env vars are not set in test environment
    expect(getImageUrl('abc123.jpg', 'sm', 'POSTERS')).toBeNull();
  });

  it('constructs full URL from relative key and base URL env var', () => {
    const original = process.env.EXPO_PUBLIC_R2_BASE_URL_POSTERS;
    process.env.EXPO_PUBLIC_R2_BASE_URL_POSTERS = 'http://10.0.0.1:9000/faniverz-movie-posters';
    expect(getImageUrl('abc123.jpg', 'sm', 'POSTERS')).toBe(
      'http://10.0.0.1:9000/faniverz-movie-posters/abc123_sm.jpg',
    );
    process.env.EXPO_PUBLIC_R2_BASE_URL_POSTERS = original;
  });

  it('constructs original URL from relative key without size suffix', () => {
    const original = process.env.EXPO_PUBLIC_R2_BASE_URL_POSTERS;
    process.env.EXPO_PUBLIC_R2_BASE_URL_POSTERS = 'http://10.0.0.1:9000/faniverz-movie-posters';
    expect(getImageUrl('abc123.jpg', 'original', 'POSTERS')).toBe(
      'http://10.0.0.1:9000/faniverz-movie-posters/abc123.jpg',
    );
    process.env.EXPO_PUBLIC_R2_BASE_URL_POSTERS = original;
  });

  it('strips trailing slash from base URL when constructing full URL', () => {
    const original = process.env.EXPO_PUBLIC_R2_BASE_URL_AVATARS;
    process.env.EXPO_PUBLIC_R2_BASE_URL_AVATARS = 'http://10.0.0.1:9000/faniverz-profile-avatars/';
    expect(getImageUrl('user1.jpg', 'sm', 'AVATARS')).toBe(
      'http://10.0.0.1:9000/faniverz-profile-avatars/user1_sm.jpg',
    );
    process.env.EXPO_PUBLIC_R2_BASE_URL_AVATARS = original;
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
