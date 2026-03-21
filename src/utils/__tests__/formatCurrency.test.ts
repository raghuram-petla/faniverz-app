import { formatCompactCurrency } from '../formatCurrency';

describe('formatCompactCurrency', () => {
  it('formats billions', () => {
    expect(formatCompactCurrency(2_500_000_000)).toBe('$2.5B');
    expect(formatCompactCurrency(1_000_000_000)).toBe('$1B');
  });

  it('formats millions', () => {
    expect(formatCompactCurrency(25_000_000)).toBe('$25M');
    expect(formatCompactCurrency(1_500_000)).toBe('$1.5M');
    expect(formatCompactCurrency(1_000_000)).toBe('$1M');
  });

  it('formats thousands', () => {
    expect(formatCompactCurrency(500_000)).toBe('$500K');
    expect(formatCompactCurrency(1_000)).toBe('$1K');
    expect(formatCompactCurrency(2_500)).toBe('$2.5K');
  });

  it('formats small values', () => {
    expect(formatCompactCurrency(800)).toBe('$800');
    expect(formatCompactCurrency(50)).toBe('$50');
  });

  it('returns $0 for zero or negative', () => {
    expect(formatCompactCurrency(0)).toBe('$0');
    expect(formatCompactCurrency(-100)).toBe('$0');
  });

  it('strips trailing .0', () => {
    expect(formatCompactCurrency(10_000_000)).toBe('$10M');
    expect(formatCompactCurrency(100_000)).toBe('$100K');
  });
});
