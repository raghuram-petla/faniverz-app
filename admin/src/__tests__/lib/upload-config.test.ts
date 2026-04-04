import { describe, it, expect } from 'vitest';
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from '@/lib/upload-config';

describe('upload-config', () => {
  it('MAX_FILE_SIZE equals 5MB', () => {
    expect(MAX_FILE_SIZE).toBe(5 * 1024 * 1024);
  });

  it('ALLOWED_MIME_TYPES contains jpeg, png, webp', () => {
    expect(ALLOWED_MIME_TYPES).toContain('image/jpeg');
    expect(ALLOWED_MIME_TYPES).toContain('image/png');
    expect(ALLOWED_MIME_TYPES).toContain('image/webp');
  });

  it('ALLOWED_MIME_TYPES has exactly 3 entries', () => {
    expect(ALLOWED_MIME_TYPES).toHaveLength(3);
  });
});
