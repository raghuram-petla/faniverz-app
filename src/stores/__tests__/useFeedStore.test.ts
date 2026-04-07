import { useFeedStore } from '../useFeedStore';

describe('useFeedStore', () => {
  beforeEach(() => {
    useFeedStore.setState({ filter: 'all', pageIndex: 0 });
  });

  it('has initial filter of "all"', () => {
    expect(useFeedStore.getState().filter).toBe('all');
  });

  it('has initial pageIndex of 0', () => {
    expect(useFeedStore.getState().pageIndex).toBe(0);
  });

  it('setFilter updates the filter', () => {
    useFeedStore.getState().setFilter('trailers');
    expect(useFeedStore.getState().filter).toBe('trailers');
  });

  it('setFilter updates pageIndex to match pill index', () => {
    useFeedStore.getState().setFilter('trailers');
    // 'trailers' is the second pill (index 1)
    expect(useFeedStore.getState().pageIndex).toBe(1);
  });

  it('setFilter with unknown filter falls back to pageIndex 0', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useFeedStore.getState().setFilter('unknown-filter' as any);
    expect(useFeedStore.getState().pageIndex).toBe(0);
  });

  it('can change filter multiple times', () => {
    useFeedStore.getState().setFilter('songs');
    expect(useFeedStore.getState().filter).toBe('songs');

    useFeedStore.getState().setFilter('posters');
    expect(useFeedStore.getState().filter).toBe('posters');

    useFeedStore.getState().setFilter('all');
    expect(useFeedStore.getState().filter).toBe('all');
  });

  it('supports all filter options', () => {
    const filters = ['all', 'trailers', 'songs', 'posters', 'bts', 'surprise'] as const;
    for (const f of filters) {
      useFeedStore.getState().setFilter(f);
      expect(useFeedStore.getState().filter).toBe(f);
    }
  });

  it('setPageIndex updates pageIndex and filter to matching pill', () => {
    useFeedStore.getState().setPageIndex(1);
    expect(useFeedStore.getState().pageIndex).toBe(1);
    expect(useFeedStore.getState().filter).toBe('trailers');
  });

  it('setPageIndex to index 0 sets filter to "all"', () => {
    // First navigate away
    useFeedStore.getState().setPageIndex(2);
    // Then back to 0
    useFeedStore.getState().setPageIndex(0);
    expect(useFeedStore.getState().pageIndex).toBe(0);
    expect(useFeedStore.getState().filter).toBe('all');
  });

  it('setPageIndex with out-of-range index does not update state', () => {
    useFeedStore.setState({ filter: 'all', pageIndex: 0 });
    useFeedStore.getState().setPageIndex(999);
    // pill is undefined, so state should not change
    expect(useFeedStore.getState().pageIndex).toBe(0);
    expect(useFeedStore.getState().filter).toBe('all');
  });

  it('setPageIndex syncs filter with corresponding pill value', () => {
    // Test several valid indices
    useFeedStore.getState().setPageIndex(0);
    expect(useFeedStore.getState().filter).toBe('all');

    useFeedStore.getState().setPageIndex(2);
    expect(useFeedStore.getState().filter).toBe('songs');
  });
});
