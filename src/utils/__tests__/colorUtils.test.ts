import { isDark } from '../colorUtils';

describe('isDark', () => {
  it('returns true for black (#000000)', () => {
    expect(isDark('#000000')).toBe(true);
  });

  it('returns false for white (#FFFFFF)', () => {
    expect(isDark('#FFFFFF')).toBe(false);
  });

  it('returns true for very dark colors', () => {
    expect(isDark('#0a0a0a')).toBe(true);
  });

  it('returns false for mid-gray', () => {
    expect(isDark('#808080')).toBe(false);
  });

  it('handles hex without hash prefix', () => {
    expect(isDark('000000')).toBe(true);
    expect(isDark('FFFFFF')).toBe(false);
  });

  it('returns false for bright red', () => {
    expect(isDark('#FF0000')).toBe(false);
  });
});
