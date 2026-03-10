'use client';
import { useState, useEffect } from 'react';

export function useDebouncedSearch(delay = 300) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), delay);
    return () => clearTimeout(id);
  }, [search, delay]);

  return { search, setSearch, debouncedSearch };
}
