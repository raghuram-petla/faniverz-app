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

  it('returns false for short hex strings (< 6 chars)', () => {
    // @edge: short hex like #000 or #abc cannot be parsed — defaults to "not dark"
    expect(isDark('#000')).toBe(false);
    expect(isDark('#abc')).toBe(false);
    expect(isDark('000')).toBe(false);
  });

  it('returns false for invalid hex strings (NaN components)', () => {
    // @edge: non-hex characters produce NaN from parseInt → returns false
    expect(isDark('#GGGGGG')).toBe(false);
    expect(isDark('#ZZZZZZ')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isDark('')).toBe(false);
  });

  it('returns true for a very dark navy color', () => {
    // #000033 — very dark blue: r=0, g=0, b=51 → luma = (0+0+5814)/1000 = 5.8 < 40
    expect(isDark('#000033')).toBe(true);
  });

  it('returns false for a bright blue (high luma)', () => {
    // #0000FF — pure blue: r=0, g=0, b=255 → luma = (0+0+29070)/1000 = 29 < 40 → actually dark
    // #0080FF — medium blue: r=0, g=128, b=255 → luma = (0+75136+29070)/1000 = 104 → not dark
    expect(isDark('#0080FF')).toBe(false);
  });
});
