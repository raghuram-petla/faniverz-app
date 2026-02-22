import { getFontFamily, fontSize } from '../typography';

describe('Typography', () => {
  it('returns English font for en locale', () => {
    expect(getFontFamily('en')).toBe('Inter-Regular');
    expect(getFontFamily('en-US')).toBe('Inter-Regular');
    expect(getFontFamily('en', 'bold')).toBe('Inter-Bold');
  });

  it('returns Telugu font for te locale', () => {
    expect(getFontFamily('te')).toBe('NotoSansTelugu-Regular');
    expect(getFontFamily('te-IN')).toBe('NotoSansTelugu-Regular');
    expect(getFontFamily('te', 'bold')).toBe('NotoSansTelugu-Bold');
  });

  it('defaults to English for unknown locale', () => {
    expect(getFontFamily('fr')).toBe('Inter-Regular');
    expect(getFontFamily('hi')).toBe('Inter-Regular');
  });

  it('has correct font size scale', () => {
    expect(fontSize.xs).toBe(10);
    expect(fontSize.sm).toBe(12);
    expect(fontSize.md).toBe(14);
    expect(fontSize.lg).toBe(16);
    expect(fontSize.xl).toBe(18);
    expect(fontSize['2xl']).toBe(20);
    expect(fontSize['3xl']).toBe(24);
    expect(fontSize['4xl']).toBe(28);
    expect(fontSize['5xl']).toBe(32);
  });
});
