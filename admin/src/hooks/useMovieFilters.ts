'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';

// @contract Filter state for advanced movie search — all defaults are "no filter"
export interface MovieFilters {
  genres: string[];
  releaseYear: string;
  releaseMonth: string;
  certification: string;
  language: string;
  platformId: string;
  isFeatured: boolean;
  minRating: string;
  actorSearch: string;
  directorSearch: string;
}

const INITIAL_FILTERS: MovieFilters = {
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
};

// @contract Manages advanced filter state with debounced text fields
// @sideeffect Schedules timeouts for actor/director search debouncing
export function useMovieFilters() {
  const [filters, setFilters] = useState<MovieFilters>(INITIAL_FILTERS);
  const [debouncedActorSearch, setDebouncedActorSearch] = useState('');
  const [debouncedDirectorSearch, setDebouncedDirectorSearch] = useState('');

  // @sideeffect Debounce actor search input by 300ms
  useEffect(() => {
    const id = setTimeout(() => setDebouncedActorSearch(filters.actorSearch.trim()), 300);
    return () => clearTimeout(id);
  }, [filters.actorSearch]);

  // @sideeffect Debounce director search input by 300ms
  useEffect(() => {
    const id = setTimeout(() => setDebouncedDirectorSearch(filters.directorSearch.trim()), 300);
    return () => clearTimeout(id);
  }, [filters.directorSearch]);

  const setFilter = useCallback(<K extends keyof MovieFilters>(key: K, value: MovieFilters[K]) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      // @edge Clear month when year is cleared
      if (key === 'releaseYear' && value === '') {
        next.releaseMonth = '';
      }
      return next;
    });
  }, []);

  const toggleGenre = useCallback((genre: string) => {
    setFilters((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  }, []);

  const clearAll = useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.genres.length > 0) count++;
    if (filters.releaseYear) count++;
    if (filters.releaseMonth) count++;
    if (filters.certification) count++;
    if (filters.language) count++;
    if (filters.platformId) count++;
    if (filters.isFeatured) count++;
    if (filters.minRating) count++;
    if (filters.actorSearch.trim()) count++;
    if (filters.directorSearch.trim()) count++;
    return count;
  }, [filters]);

  const hasActiveFilters = activeFilterCount > 0;

  return {
    filters,
    setFilter,
    toggleGenre,
    clearAll,
    activeFilterCount,
    hasActiveFilters,
    debouncedActorSearch,
    debouncedDirectorSearch,
  };
}
