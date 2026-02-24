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

  it('supports multiple simultaneous genre toggles', () => {
    useFilterStore.getState().toggleGenre('Action');
    useFilterStore.getState().toggleGenre('Drama');
    useFilterStore.getState().toggleGenre('Comedy');
    const state = useFilterStore.getState();
    expect(state.selectedGenres).toEqual(['Action', 'Drama', 'Comedy']);
  });

  it('clearAll from fully populated state resets selectedPlatforms', () => {
    useFilterStore.getState().togglePlatform('netflix');
    useFilterStore.getState().togglePlatform('aha');
    useFilterStore.getState().toggleGenre('Action');
    useFilterStore.getState().setFilter('ott');
    useFilterStore.getState().setSortBy('latest');
    useFilterStore.getState().setSearchQuery('query');

    useFilterStore.getState().clearAll();
    const state = useFilterStore.getState();
    expect(state.selectedPlatforms).toEqual([]);
    expect(state.selectedGenres).toEqual([]);
    expect(state.selectedFilter).toBe('all');
    expect(state.sortBy).toBe('popular');
    expect(state.searchQuery).toBe('');
  });

  it('toggling the same genre twice returns to empty', () => {
    useFilterStore.getState().toggleGenre('Horror');
    expect(useFilterStore.getState().selectedGenres).toContain('Horror');
    useFilterStore.getState().toggleGenre('Horror');
    expect(useFilterStore.getState().selectedGenres).toEqual([]);
  });
});
