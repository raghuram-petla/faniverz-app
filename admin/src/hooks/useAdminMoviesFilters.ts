// @contract Resolved advanced filters passed to useAdminMovies (debounced values already resolved)
export interface AdvancedFilters {
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

// @contract Applies status filter conditions that don't use .in('id', ...)
// Returns idScope (IDs to include) and excludeIds separately to avoid double .in() on same column
export function applyStatusFilter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  statusFilter: string,
  today: string,
  pmIds: string[],
): { query: unknown; empty: boolean; includeIds: string[] | null; excludeIds: string[] } {
  if (statusFilter === 'upcoming') {
    return {
      query: query.gt('release_date', today),
      empty: false,
      includeIds: null,
      excludeIds: [],
    };
  } else if (statusFilter === 'in_theaters') {
    return { query: query.eq('in_theaters', true), empty: false, includeIds: null, excludeIds: [] };
  } else if (statusFilter === 'announced') {
    return {
      query: query.is('release_date', null),
      empty: false,
      includeIds: null,
      excludeIds: [],
    };
  } else if (statusFilter === 'streaming') {
    if (pmIds.length === 0) return { query, empty: true, includeIds: null, excludeIds: [] };
    // @edge Return pmIds as includeIds instead of calling .in() — merged with other ID sets later
    return {
      query: query.lte('release_date', today).eq('in_theaters', false),
      empty: false,
      includeIds: pmIds,
      excludeIds: [],
    };
  } else if (statusFilter === 'released') {
    const q = query
      .not('release_date', 'is', null)
      .lte('release_date', today)
      .eq('in_theaters', false);
    return { query: q, empty: false, includeIds: null, excludeIds: pmIds };
  }
  return { query, empty: false, includeIds: null, excludeIds: [] };
}

// @contract Applies direct column filters (not ID-based) from AdvancedFilters to query builder
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyColumnFilters(query: any, filters: AdvancedFilters | undefined) {
  if (!filters) return query;

  if (filters.genres.length > 0) {
    query = query.overlaps('genres', filters.genres);
  }
  if (filters.releaseYear) {
    const month = filters.releaseMonth || '01';
    const endMonth = filters.releaseMonth || '12';
    const start = `${filters.releaseYear}-${month}-01`;
    const lastDay = new Date(Number(filters.releaseYear), Number(endMonth), 0).getDate();
    const end = `${filters.releaseYear}-${endMonth}-${String(lastDay).padStart(2, '0')}`;
    query = query.gte('release_date', start).lte('release_date', end);
  }
  if (filters.certification) {
    query = query.eq('certification', filters.certification);
  }
  if (filters.language) {
    query = query.eq('original_language', filters.language);
  }
  if (filters.isFeatured) {
    query = query.eq('is_featured', true);
  }
  if (filters.minRating) {
    query = query.gte('rating', Number(filters.minRating));
  }
  if (filters.directorSearch) {
    // @edge: escape LIKE wildcards (%, _, \) to prevent unintended pattern matching
    const escaped = filters.directorSearch.replace(/[\\%_]/g, (ch) => '\\' + ch);
    query = query.ilike('director', `%${escaped}%`);
  }
  return query;
}

// @invariant All ID-based include filters must be intersected in JS before a single .in('id', ...).
// PostgREST overwrites duplicate column filters — multiple .in('id', ...) on the same column
// silently uses only the LAST one, discarding earlier filters. This is a PostgREST design
// decision (not a bug) that caused invisible data leaks before this intersection approach.
// @edge: uses Set for O(n+m) intersection instead of O(n*m) array.includes
export function intersectIdSets(...sets: (string[] | null)[]): string[] | null {
  const defined = sets.filter((s): s is string[] => s !== null);
  if (defined.length === 0) return null;
  return defined.reduce((acc, set) => {
    const lookup = new Set(set);
    return acc.filter((id) => lookup.has(id));
  });
}
