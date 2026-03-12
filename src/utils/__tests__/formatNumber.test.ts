import { formatCompactNumber } from '../formatNumber';

describe('formatCompactNumber', () => {
  it('returns "1.2M" for 1200000', () => {
    expect(formatCompactNumber(1200000)).toBe('1.2M');
  });

  it('returns "5.0M" for 5000000', () => {
    expect(formatCompactNumber(5000000)).toBe('5.0M');
  });

  it('returns "2K" for 1500', () => {
    expect(formatCompactNumber(1500)).toBe('2K');
  });

  it('returns "999" for 999', () => {
    expect(formatCompactNumber(999)).toBe('999');
  });

  it('returns "0" for 0', () => {
    expect(formatCompactNumber(0)).toBe('0');
  });

  it('returns "1.0M" for 1000000', () => {
    expect(formatCompactNumber(1000000)).toBe('1.0M');
  });
});
