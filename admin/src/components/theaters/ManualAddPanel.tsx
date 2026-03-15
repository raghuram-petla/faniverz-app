'use client';
import { useState } from 'react';
import { Film, Loader2, Plus, Pencil, X, Check } from 'lucide-react';
import { SearchInput } from '@/components/common/SearchInput';
import { formatDate } from '@/lib/utils';
import { getImageUrl } from '@shared/imageUrl';
import type { Movie } from '@/lib/types';

// @contract Right-column panel: search for a movie, then fill in start date + label to add to theaters
export interface ManualAddPanelProps {
  search: string;
  setSearch: (v: string) => void;
  debouncedSearch: string;
  isSearching: boolean;
  results: Movie[];
  onAdd: (
    movieId: string,
    title: string,
    posterUrl: string | null,
    startDate: string,
    label: string | null,
  ) => void;
  isAdding: boolean;
}

export function ManualAddPanel({
  search,
  setSearch,
  debouncedSearch,
  isSearching,
  results,
  onAdd,
  isAdding,
}: ManualAddPanelProps) {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [label, setLabel] = useState('');

  function handleAdd() {
    if (!selectedMovie || !startDate) return;
    onAdd(
      selectedMovie.id,
      selectedMovie.title,
      selectedMovie.poster_url,
      startDate,
      label || null,
    );
    setSelectedMovie(null);
    setStartDate(new Date().toISOString().split('T')[0]);
    setLabel('');
    setSearch('');
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-on-surface mb-3">Add a Movie to "In Theaters"</h2>
      <div className="bg-surface-card border border-outline rounded-xl p-4 space-y-3">
        {!selectedMovie ? (
          <>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search movies..."
              isLoading={isSearching}
            />
            {search.length === 1 && (
              <p className="text-xs text-on-surface-subtle">Type at least 2 characters</p>
            )}
            {debouncedSearch.length >= 2 && (
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {results.map((movie) => {
                  const alreadyInTheaters = movie.in_theaters;
                  return (
                    <button
                      key={movie.id}
                      onClick={() => !alreadyInTheaters && setSelectedMovie(movie)}
                      disabled={alreadyInTheaters}
                      className={`flex items-center gap-3 p-2 rounded-lg w-full text-left ${
                        alreadyInTheaters
                          ? 'opacity-60 cursor-default'
                          : 'hover:bg-surface-elevated cursor-pointer'
                      }`}
                    >
                      {movie.poster_url ? (
                        <img
                          src={getImageUrl(movie.poster_url, 'sm') ?? movie.poster_url}
                          alt=""
                          className="w-8 h-11 rounded object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-11 rounded bg-input flex items-center justify-center shrink-0">
                          <Film className="w-3 h-3 text-on-surface-subtle" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-on-surface truncate">
                          {movie.title}
                        </p>
                        <p className="text-xs text-on-surface-muted">
                          {movie.release_date ? formatDate(movie.release_date) : 'No date'}
                        </p>
                      </div>
                      {alreadyInTheaters && (
                        <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/15 px-2 py-0.5 rounded-full font-medium shrink-0">
                          <Check className="w-3 h-3" /> In Theaters
                        </span>
                      )}
                    </button>
                  );
                })}
                {!isSearching && results.length === 0 && (
                  <p className="text-sm text-on-surface-subtle text-center py-4">No movies found</p>
                )}
              </div>
            )}
            {debouncedSearch.length < 2 && (
              <p className="text-xs text-on-surface-subtle">
                Search for a movie to add it to "In Theaters"
              </p>
            )}
          </>
        ) : (
          <div className="space-y-4">
            {/* Selected movie header */}
            <div className="flex items-center gap-3 p-2 bg-surface-elevated rounded-lg">
              {selectedMovie.poster_url ? (
                <img
                  src={getImageUrl(selectedMovie.poster_url, 'sm') ?? selectedMovie.poster_url}
                  alt=""
                  className="w-10 h-14 rounded object-cover shrink-0"
                />
              ) : (
                <div className="w-10 h-14 rounded bg-input flex items-center justify-center shrink-0">
                  <Film className="w-4 h-4 text-on-surface-subtle" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-on-surface truncate">{selectedMovie.title}</p>
                <p className="text-xs text-on-surface-muted">
                  {selectedMovie.release_date
                    ? `Release: ${formatDate(selectedMovie.release_date)}`
                    : 'No release date'}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSelectedMovie(null)}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-on-surface-muted bg-input hover:bg-input-active rounded-md transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Change
                </button>
                <button
                  onClick={() => {
                    setSelectedMovie(null);
                    setStartDate(new Date().toISOString().split('T')[0]);
                    setLabel('');
                    setSearch('');
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-md transition-colors"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              </div>
            </div>

            {/* Theatrical run form */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-on-surface-muted mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-input rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
              <div>
                <label className="block text-sm text-on-surface-muted mb-1">
                  Label <span className="text-on-surface-subtle">(optional)</span>
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Re-release, Director's Cut"
                  className="w-full bg-input rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-red-600 placeholder:text-on-surface-subtle"
                />
              </div>
              <button
                onClick={handleAdd}
                disabled={!startDate || isAdding}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isAdding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add to "In Theaters"
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
