'use client';

import { Search } from 'lucide-react';

interface Movie {
  id: string;
  title: string;
}

export interface MovieSearchFieldProps {
  movies: Movie[] | undefined;
  movieSearch: string;
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
  const filtered = movies?.filter((m) => m.title.toLowerCase().includes(movieSearch.toLowerCase()));

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
      {movieSearch && filtered && filtered.length > 0 && !movieId && (
        <div className="bg-surface-elevated border border-outline rounded-lg max-h-40 overflow-y-auto">
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
          <span className="text-sm text-green-400">Selected</span>
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
