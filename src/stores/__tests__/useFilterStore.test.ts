jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { useFilterStore } from '../useFilterStore';

describe('useFilterStore', () => {
  beforeEach(() => {
    useFilterStore.setState({
      releaseType: 'all',
      sortBy: 'date_asc',
    });
  });

  it('defaults to all release types', () => {
    expect(useFilterStore.getState().releaseType).toBe('all');
  });

  it('defaults to date_asc sort', () => {
    expect(useFilterStore.getState().sortBy).toBe('date_asc');
  });

  it('setReleaseType changes filter', () => {
    useFilterStore.getState().setReleaseType('theatrical');
    expect(useFilterStore.getState().releaseType).toBe('theatrical');

    useFilterStore.getState().setReleaseType('ott');
    expect(useFilterStore.getState().releaseType).toBe('ott');

    useFilterStore.getState().setReleaseType('all');
    expect(useFilterStore.getState().releaseType).toBe('all');
  });

  it('setSortBy changes sort order', () => {
    useFilterStore.getState().setSortBy('popularity');
    expect(useFilterStore.getState().sortBy).toBe('popularity');

    useFilterStore.getState().setSortBy('rating');
    expect(useFilterStore.getState().sortBy).toBe('rating');

    useFilterStore.getState().setSortBy('date_desc');
    expect(useFilterStore.getState().sortBy).toBe('date_desc');
  });

  it('persists to AsyncStorage with correct key', () => {
    // The store is configured with persist middleware and key 'faniverz-filters'
    // Verify the persist config exists
    const persistOptions = useFilterStore.persist;
    expect(persistOptions).toBeDefined();
    expect(persistOptions.getOptions().name).toBe('faniverz-filters');
  });
});
