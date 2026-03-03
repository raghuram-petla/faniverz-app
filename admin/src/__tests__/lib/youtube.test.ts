import { describe, it, expect } from 'vitest';
import { extractYouTubeId, getYouTubeThumbnail } from '@/lib/youtube';

describe('extractYouTubeId', () => {
  it('extracts ID from standard watch URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from youtu.be short URL', () => {
    expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from embed URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from shorts URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from mobile URL', () => {
    expect(extractYouTubeId('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('accepts bare 11-char YouTube ID', () => {
    expect(extractYouTubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('trims whitespace', () => {
    expect(extractYouTubeId('  dQw4w9WgXcQ  ')).toBe('dQw4w9WgXcQ');
  });

  it('returns null for empty string', () => {
    expect(extractYouTubeId('')).toBeNull();
  });

  it('returns null for invalid input', () => {
    expect(extractYouTubeId('not-a-youtube-url')).toBeNull();
  });

  it('returns null for non-YouTube URL', () => {
    expect(extractYouTubeId('https://example.com/watch?v=abc123')).toBeNull();
  });

  it('handles URL with extra query params', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30')).toBe(
      'dQw4w9WgXcQ',
    );
  });

  it('handles youtu.be with query params', () => {
    expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ?t=30')).toBe('dQw4w9WgXcQ');
  });
});

describe('getYouTubeThumbnail', () => {
  it('returns mqdefault thumbnail by default', () => {
    expect(getYouTubeThumbnail('dQw4w9WgXcQ')).toBe(
      'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
    );
  });

  it('returns hqdefault thumbnail when specified', () => {
    expect(getYouTubeThumbnail('dQw4w9WgXcQ', 'hqdefault')).toBe(
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    );
  });

  it('returns maxresdefault thumbnail when specified', () => {
    expect(getYouTubeThumbnail('dQw4w9WgXcQ', 'maxresdefault')).toBe(
      'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    );
  });
});
