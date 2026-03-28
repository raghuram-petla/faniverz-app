'use client';

import type { TmdbSearchAllResult } from '@/hooks/useSync';
import { ActorSearchResults } from './ActorSearchResults';
import { MovieSearchResults } from './MovieSearchResults';

export interface SearchResultsPanelProps {
  data: TmdbSearchAllResult;
  /** @contract: when true, all mutation buttons (import/refresh) are hidden — viewer role */
  isReadOnly?: boolean;
}

/** @contract Shows TMDB search results — actors list + movies grid with import/refresh actions */
export function SearchResultsPanel({ data, isReadOnly }: SearchResultsPanelProps) {
  const movieExistingSet = new Set(data.movies.existingTmdbIds);
  const actorExistingSet = new Set(data.actors.existingTmdbPersonIds);

  return (
    <div className="space-y-6">
      {data.actors.results.length > 0 && (
        <ActorSearchResults
          actors={data.actors.results}
          existingSet={actorExistingSet}
          isReadOnly={isReadOnly}
        />
      )}
      {data.movies.results.length > 0 && (
        <MovieSearchResults
          movies={data.movies.results}
          existingSet={movieExistingSet}
          duplicateSuspects={data.movies.duplicateSuspects}
        />
      )}
      {data.movies.results.length === 0 && data.actors.results.length === 0 && (
        <p className="text-sm text-on-surface-muted">No results found.</p>
      )}
    </div>
  );
}
