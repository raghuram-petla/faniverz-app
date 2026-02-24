import { colors } from '@/theme/colors';
import { ReleaseType } from '@/types';

import { RELEASE_TYPE_CONFIG, getReleaseTypeLabel, getReleaseTypeColor } from '../releaseType';

describe('RELEASE_TYPE_CONFIG', () => {
  it('contains entries for all 3 release types', () => {
    expect(Object.keys(RELEASE_TYPE_CONFIG)).toHaveLength(3);
    expect(RELEASE_TYPE_CONFIG).toHaveProperty('theatrical');
    expect(RELEASE_TYPE_CONFIG).toHaveProperty('ott');
    expect(RELEASE_TYPE_CONFIG).toHaveProperty('upcoming');
  });
});

describe('getReleaseTypeLabel', () => {
  it('returns "In Theaters" for theatrical', () => {
    expect(getReleaseTypeLabel('theatrical')).toBe('In Theaters');
  });

  it('returns "Streaming" for ott', () => {
    expect(getReleaseTypeLabel('ott')).toBe('Streaming');
  });

  it('returns "Coming Soon" for upcoming', () => {
    expect(getReleaseTypeLabel('upcoming')).toBe('Coming Soon');
  });

  it('falls back to the raw type string for unknown types', () => {
    expect(getReleaseTypeLabel('unknown' as ReleaseType)).toBe('unknown');
  });
});

describe('getReleaseTypeColor', () => {
  it('returns red600 for theatrical', () => {
    expect(getReleaseTypeColor('theatrical')).toBe(colors.red600);
  });

  it('returns purple600 for ott', () => {
    expect(getReleaseTypeColor('ott')).toBe(colors.purple600);
  });

  it('returns blue600 for upcoming', () => {
    expect(getReleaseTypeColor('upcoming')).toBe(colors.blue600);
  });

  it('falls back to white40 for unknown types', () => {
    expect(getReleaseTypeColor('unknown' as ReleaseType)).toBe(colors.white40);
  });
});
