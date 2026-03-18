import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMovieFilters } from '@/hooks/useMovieFilters';

describe('useMovieFilters', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial state with no active filters', () => {
    const { result } = renderHook(() => useMovieFilters());

    expect(result.current.filters).toEqual({
      genres: [],
      releaseYear: '',
      releaseMonth: '',
      certification: '',
      language: '',
      platformId: '',
      isFeatured: false,
      minRating: '',
      actorSearch: '',
      directorSearch: '',
    });
    expect(result.current.activeFilterCount).toBe(0);
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('setFilter updates a single filter value', () => {
    const { result } = renderHook(() => useMovieFilters());

    act(() => result.current.setFilter('certification', 'UA'));
    expect(result.current.filters.certification).toBe('UA');
    expect(result.current.activeFilterCount).toBe(1);
  });

  it('setFilter clears month when year is cleared', () => {
    const { result } = renderHook(() => useMovieFilters());

    act(() => {
      result.current.setFilter('releaseYear', '2025');
      result.current.setFilter('releaseMonth', '03');
    });
    expect(result.current.filters.releaseMonth).toBe('03');

    act(() => result.current.setFilter('releaseYear', ''));
    expect(result.current.filters.releaseMonth).toBe('');
  });

  it('toggleGenre adds and removes genres', () => {
    const { result } = renderHook(() => useMovieFilters());

    act(() => result.current.toggleGenre('Action'));
    expect(result.current.filters.genres).toEqual(['Action']);
    expect(result.current.activeFilterCount).toBe(1);

    act(() => result.current.toggleGenre('Drama'));
    expect(result.current.filters.genres).toEqual(['Action', 'Drama']);
    // genres count as 1 filter regardless of how many selected
    expect(result.current.activeFilterCount).toBe(1);

    act(() => result.current.toggleGenre('Action'));
    expect(result.current.filters.genres).toEqual(['Drama']);
  });

  it('clearAll resets all filters to defaults', () => {
    const { result } = renderHook(() => useMovieFilters());

    act(() => {
      result.current.setFilter('certification', 'U');
      result.current.setFilter('language', 'te');
      result.current.toggleGenre('Action');
      result.current.setFilter('isFeatured', true);
    });
    expect(result.current.activeFilterCount).toBe(4);

    act(() => result.current.clearAll());
    expect(result.current.activeFilterCount).toBe(0);
    expect(result.current.filters.certification).toBe('');
    expect(result.current.filters.genres).toEqual([]);
  });

  it('activeFilterCount counts all non-default filters', () => {
    const { result } = renderHook(() => useMovieFilters());

    act(() => {
      result.current.setFilter('releaseYear', '2025');
      result.current.setFilter('releaseMonth', '06');
      result.current.setFilter('certification', 'A');
      result.current.setFilter('language', 'hi');
      result.current.setFilter('platformId', 'netflix');
      result.current.setFilter('isFeatured', true);
      result.current.setFilter('minRating', '3');
      result.current.setFilter('actorSearch', 'Mahesh');
      result.current.setFilter('directorSearch', 'Rajamouli');
      result.current.toggleGenre('Action');
    });

    expect(result.current.activeFilterCount).toBe(10);
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('debounces actorSearch after 300ms', () => {
    const { result } = renderHook(() => useMovieFilters());

    act(() => result.current.setFilter('actorSearch', 'Mahesh'));
    expect(result.current.debouncedActorSearch).toBe('');

    act(() => vi.advanceTimersByTime(300));
    expect(result.current.debouncedActorSearch).toBe('Mahesh');
  });

  it('debounces directorSearch after 300ms', () => {
    const { result } = renderHook(() => useMovieFilters());

    act(() => result.current.setFilter('directorSearch', 'Rajamouli'));
    expect(result.current.debouncedDirectorSearch).toBe('');

    act(() => vi.advanceTimersByTime(300));
    expect(result.current.debouncedDirectorSearch).toBe('Rajamouli');
  });

  it('trims debounced search values', () => {
    const { result } = renderHook(() => useMovieFilters());

    act(() => result.current.setFilter('actorSearch', '  Mahesh  '));
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.debouncedActorSearch).toBe('Mahesh');
  });

  it('does not count whitespace-only actorSearch as active', () => {
    const { result } = renderHook(() => useMovieFilters());

    act(() => result.current.setFilter('actorSearch', '   '));
    expect(result.current.activeFilterCount).toBe(0);
  });
});
