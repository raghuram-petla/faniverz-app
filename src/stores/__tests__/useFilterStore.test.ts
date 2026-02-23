import { useFilterStore } from '../useFilterStore';

describe('useFilterStore', () => {
  beforeEach(() => {
    useFilterStore.getState().clearAll();
  });

  it('defaults to all filter', () => {
    expect(useFilterStore.getState().selectedFilter).toBe('all');
  });

  it('toggleGenre adds and removes', () => {
    useFilterStore.getState().toggleGenre('Action');
    expect(useFilterStore.getState().selectedGenres).toContain('Action');

    useFilterStore.getState().toggleGenre('Action');
    expect(useFilterStore.getState().selectedGenres).not.toContain('Action');
  });

  it('togglePlatform adds and removes', () => {
    useFilterStore.getState().togglePlatform('netflix');
    expect(useFilterStore.getState().selectedPlatforms).toContain('netflix');

    useFilterStore.getState().togglePlatform('netflix');
    expect(useFilterStore.getState().selectedPlatforms).not.toContain('netflix');
  });

  it('clearAll resets everything', () => {
    useFilterStore.getState().setFilter('theatrical');
    useFilterStore.getState().toggleGenre('Action');
    useFilterStore.getState().setSortBy('top_rated');
    useFilterStore.getState().setSearchQuery('test');

    useFilterStore.getState().clearAll();
    const state = useFilterStore.getState();
    expect(state.selectedFilter).toBe('all');
    expect(state.selectedGenres).toEqual([]);
    expect(state.sortBy).toBe('popular');
    expect(state.searchQuery).toBe('');
  });
});
