import { useFeedStore } from '../useFeedStore';

describe('useFeedStore', () => {
  beforeEach(() => {
    useFeedStore.setState({ filter: 'all' });
  });

  it('has initial filter of "all"', () => {
    expect(useFeedStore.getState().filter).toBe('all');
  });

  it('setFilter updates the filter', () => {
    useFeedStore.getState().setFilter('trailers');
    expect(useFeedStore.getState().filter).toBe('trailers');
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
});
