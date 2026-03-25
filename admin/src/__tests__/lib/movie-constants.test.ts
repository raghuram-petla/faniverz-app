import { describe, it, expect } from 'vitest';
import { CERTIFICATION_OPTIONS, GENRES } from '@/lib/movie-constants';

describe('movie-constants', () => {
  describe('CERTIFICATION_OPTIONS', () => {
    it('exports an array of certification options', () => {
      expect(Array.isArray(CERTIFICATION_OPTIONS)).toBe(true);
      expect(CERTIFICATION_OPTIONS.length).toBeGreaterThan(0);
    });

    it('includes a "None" option with empty value', () => {
      const none = CERTIFICATION_OPTIONS.find((o) => o.label === 'None');
      expect(none).toEqual({ value: '', label: 'None' });
    });

    it('includes U, UA, and A certifications', () => {
      const labels = CERTIFICATION_OPTIONS.map((o) => o.label);
      expect(labels).toContain('U');
      expect(labels).toContain('UA');
      expect(labels).toContain('A');
    });

    it('each option has value and label strings', () => {
      for (const option of CERTIFICATION_OPTIONS) {
        expect(typeof option.value).toBe('string');
        expect(typeof option.label).toBe('string');
      }
    });
  });

  describe('GENRES', () => {
    it('exports GENRES re-exported from shared module', () => {
      expect(GENRES).toBeDefined();
    });
  });
});
