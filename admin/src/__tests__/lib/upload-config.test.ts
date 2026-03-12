import { describe, it, expect } from 'vitest';
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_LABEL } from '@/lib/upload-config';

describe('upload-config', () => {
  it('MAX_FILE_SIZE equals 5MB', () => {
    expect(MAX_FILE_SIZE).toBe(5 * 1024 * 1024);
  });

  it('ALLOWED_MIME_TYPES contains jpeg, png, webp', () => {
    expect(ALLOWED_MIME_TYPES).toContain('image/jpeg');
    expect(ALLOWED_MIME_TYPES).toContain('image/png');
    expect(ALLOWED_MIME_TYPES).toContain('image/webp');
  });

  it('MAX_FILE_SIZE_LABEL equals "5 MB"', () => {
    expect(MAX_FILE_SIZE_LABEL).toBe('5 MB');
  });

  it('ALLOWED_MIME_TYPES has exactly 3 entries', () => {
    expect(ALLOWED_MIME_TYPES).toHaveLength(3);
  });
});
