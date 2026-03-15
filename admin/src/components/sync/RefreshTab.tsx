'use client';

import { useState } from 'react';
import { useMovieSearch, useActorSearch, useRefreshMovie, useRefreshActor } from '@/hooks/useSync';
import { formatRelativeTime } from './syncHelpers';
import { Search, Film, Users, Loader2, RefreshCw, Clock } from 'lucide-react';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';

/** @contract single-item refresh for movies and actors via TMDB — search, select, refresh */
export function RefreshTab() {
  return (
    <div className="space-y-6">
      <RefreshMovieSection />
      <RefreshActorSection />
    </div>
  );
}

// ── Movie Section ────────────────────────────────────────────────────────────

/** @coupling uses debounced search to query local DB movies, then refreshes selected one from TMDB */
function RefreshMovieSection() {
  const {
    search: query,
    setSearch: setQuery,
    debouncedSearch: debouncedQuery,
  } = useDebouncedSearch();
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const { data: searchResults } = useMovieSearch(debouncedQuery);
  const refreshMovie = useRefreshMovie();

  const selectedMovie = searchResults?.find((m) => m.id === selectedMovieId);

  return (
    <div className="bg-surface-card border border-outline rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Film className="w-5 h-5 text-status-blue" />
        <h2 className="text-lg font-semibold text-on-surface">Refresh Movie</h2>
      </div>

      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-subtle" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
              setSelectedMovieId(null);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search movie by title..."
            className="w-full bg-input rounded-lg pl-10 pr-4 py-2 text-sm text-on-surface placeholder:text-on-surface-subtle outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        {showDropdown && searchResults && searchResults.length > 0 && !selectedMovieId && (
          <div className="absolute z-10 mt-1 w-full bg-surface-card border border-outline rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((movie) => (
              <button
                key={movie.id}
                onClick={() => {
                  setSelectedMovieId(movie.id);
                  setQuery(movie.title);
                  setShowDropdown(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-surface-elevated transition-colors border-b border-outline-subtle last:border-0"
              >
                <span className="text-sm text-on-surface font-medium">{movie.title}</span>
                <span className="text-xs text-on-surface-subtle ml-2">{movie.release_date}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedMovie && (
        <div className="mt-4 p-4 bg-surface-elevated rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-on-surface font-medium">{selectedMovie.title}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-on-surface-subtle">
                  Released: {selectedMovie.release_date}
                </span>
                {selectedMovie.tmdb_id && (
                  <span className="text-xs text-on-surface-subtle">
                    TMDB: {selectedMovie.tmdb_id}
                  </span>
                )}
                {selectedMovie.tmdb_last_synced_at ? (
                  <span className="text-xs text-on-surface-subtle flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Synced {formatRelativeTime(selectedMovie.tmdb_last_synced_at)}
                  </span>
                ) : (
                  <span className="text-xs text-status-yellow">Never synced</span>
                )}
              </div>
            </div>
            <button
              onClick={() => refreshMovie.mutate(selectedMovie.id)}
              /** @edge movies without tmdb_id (manually added) cannot be refreshed from TMDB */
              disabled={refreshMovie.isPending || !selectedMovie.tmdb_id}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {refreshMovie.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Refresh from TMDB
            </button>
          </div>
          {!selectedMovie.tmdb_id && (
            <p className="text-xs text-status-yellow mt-2">
              This movie has no TMDB ID and cannot be refreshed.
            </p>
          )}
          {refreshMovie.isSuccess && (
            <p className="text-xs text-status-green mt-2">
              Refreshed — {refreshMovie.data?.result?.castCount ?? 0} cast,{' '}
              {refreshMovie.data?.result?.crewCount ?? 0} crew
            </p>
          )}
          {refreshMovie.isError && (
            <p className="text-xs text-status-red mt-2">
              {refreshMovie.error instanceof Error ? refreshMovie.error.message : 'Refresh failed'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Actor Section ────────────────────────────────────────────────────────────

/** @coupling uses debounced search to query local DB actors, then refreshes selected one from TMDB */
function RefreshActorSection() {
  const {
    search: query,
    setSearch: setQuery,
    debouncedSearch: debouncedQuery,
  } = useDebouncedSearch();
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const { data: searchResults } = useActorSearch(debouncedQuery);
  const refreshActor = useRefreshActor();

  const selectedActor = searchResults?.find((a) => a.id === selectedActorId);

  return (
    <div className="bg-surface-card border border-outline rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-status-green" />
        <h2 className="text-lg font-semibold text-on-surface">Refresh Actor</h2>
      </div>

      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-subtle" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
              setSelectedActorId(null);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search actor by name..."
            className="w-full bg-input rounded-lg pl-10 pr-4 py-2 text-sm text-on-surface placeholder:text-on-surface-subtle outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        {showDropdown && searchResults && searchResults.length > 0 && !selectedActorId && (
          <div className="absolute z-10 mt-1 w-full bg-surface-card border border-outline rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((actor) => (
              <button
                key={actor.id}
                onClick={() => {
                  setSelectedActorId(actor.id);
                  setQuery(actor.name);
                  setShowDropdown(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-surface-elevated transition-colors border-b border-outline-subtle last:border-0"
              >
                <span className="text-sm text-on-surface font-medium">{actor.name}</span>
                {actor.tmdb_person_id && (
                  <span className="text-xs text-on-surface-subtle ml-2">
                    TMDB: {actor.tmdb_person_id}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedActor && (
        <div className="mt-4 p-4 bg-surface-elevated rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-on-surface font-medium">{selectedActor.name}</p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span
                  className={`text-xs ${selectedActor.biography ? 'text-status-green' : 'text-status-yellow'}`}
                >
                  Bio: {selectedActor.biography ? '✓' : '✗'}
                </span>
                <span
                  className={`text-xs ${selectedActor.photo_url ? 'text-status-green' : 'text-status-yellow'}`}
                >
                  Photo: {selectedActor.photo_url ? '✓' : '✗'}
                </span>
                <span
                  className={`text-xs ${selectedActor.birth_date ? 'text-status-green' : 'text-status-yellow'}`}
                >
                  DOB: {selectedActor.birth_date ? '✓' : '✗'}
                </span>
              </div>
            </div>
            <button
              onClick={() => refreshActor.mutate(selectedActor.id)}
              /** @edge actors without tmdb_person_id cannot be refreshed from TMDB */
              disabled={refreshActor.isPending || !selectedActor.tmdb_person_id}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {refreshActor.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Refresh from TMDB
            </button>
          </div>
          {!selectedActor.tmdb_person_id && (
            <p className="text-xs text-status-yellow mt-2">No TMDB person ID. Cannot refresh.</p>
          )}
          {refreshActor.isSuccess && (
            <p className="text-xs text-status-green mt-2">
              Refreshed. Updated: {refreshActor.data?.result?.fields?.join(', ') || 'no changes'}
            </p>
          )}
          {refreshActor.isError && (
            <p className="text-xs text-status-red mt-2">
              {refreshActor.error instanceof Error ? refreshActor.error.message : 'Refresh failed'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
