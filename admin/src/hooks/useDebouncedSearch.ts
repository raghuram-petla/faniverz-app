'use client';
import { useState, useEffect } from 'react';

// @contract: debouncedSearch is always trimmed; search preserves raw input
// @sideeffect: schedules a timeout on every search/delay change; cleans up on unmount
export function useDebouncedSearch(delay = 300) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), delay);
    return () => clearTimeout(id);
  }, [search, delay]);

  return { search, setSearch, debouncedSearch };
}
