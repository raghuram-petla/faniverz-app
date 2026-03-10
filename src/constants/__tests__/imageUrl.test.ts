import { getImageUrl } from '@shared/imageUrl';

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

  // R2 URLs (production)
  it('returns _sm variant for R2 URL', () => {
    expect(getImageUrl('https://pub-abc.r2.dev/abc.jpg', 'sm')).toBe(
      'https://pub-abc.r2.dev/abc_sm.jpg',
    );
  });

  it('returns _md variant for R2 URL', () => {
    expect(getImageUrl('https://pub-abc.r2.dev/abc.jpg', 'md')).toBe(
      'https://pub-abc.r2.dev/abc_md.jpg',
    );
  });

  it('returns _lg variant for R2 URL', () => {
    expect(getImageUrl('https://pub-abc.r2.dev/abc.jpg', 'lg')).toBe(
      'https://pub-abc.r2.dev/abc_lg.jpg',
    );
  });

  it('works with .png extension', () => {
    expect(getImageUrl('https://pub-abc.r2.dev/poster.png', 'sm')).toBe(
      'https://pub-abc.r2.dev/poster_sm.png',
    );
  });

  it('works with .webp extension', () => {
    expect(getImageUrl('https://pub-abc.r2.dev/banner.webp', 'md')).toBe(
      'https://pub-abc.r2.dev/banner_md.webp',
    );
  });

  it('handles URLs with no extension gracefully (returns original)', () => {
    const url = 'https://pub-abc.r2.dev/abc';
    expect(getImageUrl(url, 'sm')).toBe(url);
  });

  // MinIO URLs (local dev)
  it('returns _sm variant for MinIO localhost URL', () => {
    expect(getImageUrl('http://localhost:9000/faniverz-actor-photos/abc.jpg', 'sm')).toBe(
      'http://localhost:9000/faniverz-actor-photos/abc_sm.jpg',
    );
  });

  it('returns _lg variant for MinIO localhost URL', () => {
    expect(getImageUrl('http://localhost:9000/faniverz-movie-posters/poster.jpg', 'lg')).toBe(
      'http://localhost:9000/faniverz-movie-posters/poster_lg.jpg',
    );
  });

  // External CDN URLs should return original unchanged
  it('returns original TMDB URL without variant suffix', () => {
    const url = 'https://image.tmdb.org/t/p/w185/abc123.jpg';
    expect(getImageUrl(url, 'sm')).toBe(url);
  });

  it('returns original i.pravatar.cc URL without variant suffix', () => {
    const url = 'https://i.pravatar.cc/500?u=abc';
    expect(getImageUrl(url, 'md')).toBe(url);
  });
});
