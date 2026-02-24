import { spacing, borderRadius } from '../spacing';

describe('spacing', () => {
  it('exports all expected keys', () => {
    const expectedKeys = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'];
    expect(Object.keys(spacing)).toEqual(expect.arrayContaining(expectedKeys));
    expect(Object.keys(spacing)).toHaveLength(expectedKeys.length);
  });

  it('has correct values for each key', () => {
    expect(spacing.xs).toBe(4);
    expect(spacing.sm).toBe(8);
    expect(spacing.md).toBe(12);
    expect(spacing.lg).toBe(16);
    expect(spacing.xl).toBe(20);
    expect(spacing['2xl']).toBe(24);
    expect(spacing['3xl']).toBe(32);
    expect(spacing['4xl']).toBe(40);
    expect(spacing['5xl']).toBe(48);
  });

  it('has all numeric values', () => {
    Object.values(spacing).forEach((value) => {
      expect(typeof value).toBe('number');
    });
  });

  it('has values in ascending order', () => {
    const values = Object.values(spacing);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });
});

describe('borderRadius', () => {
  it('exports all expected keys', () => {
    const expectedKeys = ['sm', 'md', 'lg', 'xl', '2xl', 'full'];
    expect(Object.keys(borderRadius)).toEqual(expect.arrayContaining(expectedKeys));
    expect(Object.keys(borderRadius)).toHaveLength(expectedKeys.length);
  });

  it('has correct values for each key', () => {
    expect(borderRadius.sm).toBe(4);
    expect(borderRadius.md).toBe(8);
    expect(borderRadius.lg).toBe(12);
    expect(borderRadius.xl).toBe(16);
    expect(borderRadius['2xl']).toBe(20);
    expect(borderRadius.full).toBe(9999);
  });

  it('has all numeric values', () => {
    Object.values(borderRadius).forEach((value) => {
      expect(typeof value).toBe('number');
    });
  });

  it('has "full" as the largest value', () => {
    const values = Object.values(borderRadius);
    const maxValue = Math.max(...values);
    expect(borderRadius.full).toBe(maxValue);
  });
});
