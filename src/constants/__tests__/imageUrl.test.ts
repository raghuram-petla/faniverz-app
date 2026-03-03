import { getImageUrl } from '@shared/imageUrl';

describe('getImageUrl', () => {
  it('returns null when originalUrl is null', () => {
    expect(getImageUrl(null)).toBeNull();
  });

  it('returns original URL when size is "original"', () => {
    const url = 'https://r2.dev/abc.jpg';
    expect(getImageUrl(url, 'original')).toBe(url);
  });

  it('returns original URL when size is omitted (default)', () => {
    const url = 'https://r2.dev/abc.jpg';
    expect(getImageUrl(url)).toBe(url);
  });

  it('returns _sm variant for size "sm"', () => {
    expect(getImageUrl('https://r2.dev/abc.jpg', 'sm')).toBe('https://r2.dev/abc_sm.jpg');
  });

  it('returns _md variant for size "md"', () => {
    expect(getImageUrl('https://r2.dev/abc.jpg', 'md')).toBe('https://r2.dev/abc_md.jpg');
  });

  it('returns _lg variant for size "lg"', () => {
    expect(getImageUrl('https://r2.dev/abc.jpg', 'lg')).toBe('https://r2.dev/abc_lg.jpg');
  });

  it('works with .png extension', () => {
    expect(getImageUrl('https://r2.dev/poster.png', 'sm')).toBe('https://r2.dev/poster_sm.png');
  });

  it('works with .webp extension', () => {
    expect(getImageUrl('https://r2.dev/banner.webp', 'md')).toBe('https://r2.dev/banner_md.webp');
  });

  it('preserves full URL path with nested directories', () => {
    expect(getImageUrl('https://cdn.example.com/movies/2026/posters/hero.jpg', 'lg')).toBe(
      'https://cdn.example.com/movies/2026/posters/hero_lg.jpg',
    );
  });

  it('handles URLs with no extension gracefully (returns original)', () => {
    const url = 'https://r2.dev/abc';
    expect(getImageUrl(url, 'sm')).toBe(url);
  });
});
