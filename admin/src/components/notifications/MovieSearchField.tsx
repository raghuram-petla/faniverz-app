'use client';

import { useMemo } from 'react';
import { Search } from 'lucide-react';

interface Movie {
  id: string;
  title: string;
}

/** @contract typeahead movie search with dropdown selection for notification targeting */
export interface MovieSearchFieldProps {
  /** @nullable undefined during initial movie list fetch */
  movies: Movie[] | undefined;
  movieSearch: string;
  /** @edge empty string means no movie selected; dropdown only shows when movieId is empty */
  movieId: string;
  inputClass: string;
  onSearchChange: (value: string) => void;
  onMovieSelect: (id: string, title: string) => void;
  onClear: () => void;
}

export function MovieSearchField({
  movies,
  movieSearch,
  movieId,
  inputClass,
  onSearchChange,
  onMovieSelect,
  onClear,
}: MovieSearchFieldProps) {
  /** @edge client-side filter on full movie list — works for current dataset size but not scalable */
  const filtered = useMemo(
    () => movies?.filter((m) => m.title.toLowerCase().includes(movieSearch.toLowerCase())),
    [movies, movieSearch],
  );

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-on-surface-muted">Movie (optional)</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-disabled" />
        <input
          type="text"
          value={movieSearch}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search movies..."
          className={`${inputClass} pl-10`}
        />
      </div>
      {/** @invariant dropdown only visible when searching AND no movie is already selected */}
      {movieSearch && filtered && filtered.length > 0 && !movieId && (
        <div className="bg-surface-elevated border border-outline rounded-lg max-h-40 overflow-y-auto">
          {/** @edge caps dropdown at 10 results to prevent layout overflow */}
          {filtered.slice(0, 10).map((movie) => (
            <button
              key={movie.id}
              type="button"
              onClick={() => onMovieSelect(movie.id, movie.title)}
              className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-input transition-colors"
            >
              {movie.title}
            </button>
          ))}
        </div>
      )}
      {movieId && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-status-green">Selected</span>
          <button
            type="button"
            onClick={onClear}
            className="text-sm text-on-surface-subtle hover:text-on-surface transition-colors"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
