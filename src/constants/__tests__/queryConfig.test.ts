import { STALE_1M, STALE_2M, STALE_5M, STALE_10M, STALE_15M, STALE_24H } from '../queryConfig';

describe('queryConfig', () => {
  it('exports correct millisecond values for each staleTime constant', () => {
    expect(STALE_1M).toBe(60_000);
    expect(STALE_2M).toBe(120_000);
    expect(STALE_5M).toBe(300_000);
    expect(STALE_10M).toBe(600_000);
    expect(STALE_15M).toBe(900_000);
    expect(STALE_24H).toBe(86_400_000);
  });

  it('maintains ascending order', () => {
    const values = [STALE_1M, STALE_2M, STALE_5M, STALE_10M, STALE_15M, STALE_24H];
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });
});
