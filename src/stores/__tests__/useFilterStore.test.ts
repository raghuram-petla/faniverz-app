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
    useFilterStore.getState().setFilter('in_theaters');
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
    useFilterStore.getState().setFilter('streaming');
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

  it('toggleProductionHouse adds a production house', () => {
    useFilterStore.getState().toggleProductionHouse('ph-1');
    expect(useFilterStore.getState().selectedProductionHouses).toContain('ph-1');
  });

  it('toggleProductionHouse removes a production house when toggled again', () => {
    useFilterStore.getState().toggleProductionHouse('ph-2');
    expect(useFilterStore.getState().selectedProductionHouses).toContain('ph-2');
    useFilterStore.getState().toggleProductionHouse('ph-2');
    expect(useFilterStore.getState().selectedProductionHouses).not.toContain('ph-2');
  });

  it('clearAll resets selectedProductionHouses', () => {
    useFilterStore.getState().toggleProductionHouse('ph-3');
    useFilterStore.getState().clearAll();
    expect(useFilterStore.getState().selectedProductionHouses).toEqual([]);
  });

  it('setSearchQuery updates searchQuery', () => {
    useFilterStore.getState().setSearchQuery('pushpa');
    expect(useFilterStore.getState().searchQuery).toBe('pushpa');
  });

  it('setSortBy updates sortBy', () => {
    useFilterStore.getState().setSortBy('latest');
    expect(useFilterStore.getState().sortBy).toBe('latest');
    useFilterStore.getState().setSortBy('upcoming');
    expect(useFilterStore.getState().sortBy).toBe('upcoming');
  });

  it('setFilter updates selectedFilter', () => {
    useFilterStore.getState().setFilter('streaming');
    expect(useFilterStore.getState().selectedFilter).toBe('streaming');
  });
});
