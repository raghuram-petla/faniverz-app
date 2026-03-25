'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAdminMovies, useDeleteMovie } from '@/hooks/useAdminMovies';
import { usePermissions } from '@/hooks/usePermissions';
import { useMovieFilters } from '@/hooks/useMovieFilters';
import { formatDate } from '@/lib/utils';
import { Edit, Trash2, Loader2, Film, Pencil } from 'lucide-react';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { LoadMoreButton } from '@/components/common/LoadMoreButton';
import { MovieListToolbar } from '@/components/movies/MovieListToolbar';
import { useLanguageContext } from '@/hooks/useLanguageContext';
import { MOVIE_STATUS_CONFIG } from '@shared/constants';
import { deriveMovieStatus } from '@shared/movieStatus';
import type { Movie } from '@/lib/types';
import { getImageUrl } from '@shared/imageUrl';
import { useLanguageName } from '@/hooks/useLanguageOptions';

// @coupling Must stay in sync with shared MOVIE_STATUS_CONFIG keys
const STATUS_BADGE_CLASSES: Record<string, string> = {
  announced: 'bg-amber-600/20 text-status-amber',
  upcoming: 'bg-blue-600/20 text-status-blue',
  in_theaters: 'bg-red-600/20 text-status-red',
  streaming: 'bg-purple-600/20 text-status-purple',
  released: 'bg-gray-600/20 text-gray-400',
};

// @contract Derives display status from movie data at runtime (not stored in DB)
// @assumes deriveMovieStatus second param (ottCount) is 0 here — list page doesn't fetch OTT data
function getStatusBadge(movie: Movie) {
  const status = deriveMovieStatus(movie, 0);
  const config = MOVIE_STATUS_CONFIG[status];
  return {
    label: config.label,
    /* v8 ignore start */
    className: STATUS_BADGE_CLASSES[status] ?? 'bg-gray-600/20 text-gray-400',
    /* v8 ignore stop */
  };
}

// @contract Infinite scroll via TanStack Query useInfiniteQuery — pages are cursor-based (offset).
// @boundary Movie status is DERIVED at render time via deriveMovieStatus, never stored in DB.
export default function MoviesPage() {
  // @coupling usePermissions gates data scoping, delete button, and edit visibility
  const { isPHAdmin, productionHouseIds, canDeleteTopLevel, isReadOnly } = usePermissions();
  const { selectedLanguageCode } = useLanguageContext();
  const getLangName = useLanguageName();
  const { search, setSearch, debouncedSearch } = useDebouncedSearch();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const {
    filters,
    setFilter,
    toggleGenre,
    clearAll,
    activeFilterCount,
    hasActiveFilters,
    debouncedActorSearch,
    debouncedDirectorSearch,
  } = useMovieFilters();

  // @contract Build resolved filters with debounced text values for the query hook
  const resolvedFilters = {
    ...filters,
    actorSearch: debouncedActorSearch,
    directorSearch: debouncedDirectorSearch,
  };

  // @boundary PH admins see only their production house movies via productionHouseIds filter
  // @contract When searching, show all languages (disabled for non-matching) so users see
  // the movie exists. When browsing (no search), filter by selected language.
  const { data, isLoading, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useAdminMovies(
      debouncedSearch,
      statusFilter,
      /* v8 ignore start */
      isPHAdmin ? productionHouseIds : undefined,
      hasActiveFilters ? resolvedFilters : undefined,
      debouncedSearch ? undefined : selectedLanguageCode,
      /* v8 ignore stop */
    );
  const movies = data?.pages.flat() ?? [];
  const deleteMovie = useDeleteMovie();

  return (
    <div className="space-y-6">
      <MovieListToolbar
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        filters={filters}
        setFilter={setFilter}
        toggleGenre={toggleGenre}
        clearAll={clearAll}
        activeFilterCount={activeFilterCount}
        hasActiveFilters={hasActiveFilters}
        isFetching={isFetching}
        isReadOnly={isReadOnly}
        movieCount={isLoading ? 0 : movies.length}
        debouncedSearch={debouncedSearch}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-status-red animate-spin" />
        </div>
      ) : (
        <div className="bg-surface-card border border-outline rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline">
                <th className="text-left text-xs font-medium text-on-surface-subtle uppercase tracking-wider px-4 py-3">
                  Movie
                </th>
                <th className="text-left text-xs font-medium text-on-surface-subtle uppercase tracking-wider px-4 py-3">
                  Type
                </th>
                <th className="text-left text-xs font-medium text-on-surface-subtle uppercase tracking-wider px-4 py-3">
                  Release Date
                </th>
                <th className="text-left text-xs font-medium text-on-surface-subtle uppercase tracking-wider px-4 py-3">
                  Rating
                </th>
                <th className="text-right text-xs font-medium text-on-surface-subtle uppercase tracking-wider px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-subtle">
              {movies.map((movie) => {
                // @contract Uses switcher selection (not role-based permission) to determine
                // if a movie is outside the active language. A root user with Telugu selected
                // should see Hindi movies as disabled, even though they have all-language access.
                const isOtherLanguage = selectedLanguageCode
                  ? movie.original_language !== selectedLanguageCode
                  : false;
                const movieLangName = isOtherLanguage ? getLangName(movie.original_language) : null;
                return (
                  <tr
                    key={movie.id}
                    className={`group ${isOtherLanguage ? 'opacity-40' : 'hover:bg-surface-elevated'}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {isOtherLanguage ? (
                          <div className="relative shrink-0">
                            {movie.poster_url ? (
                              <img
                                src={
                                  getImageUrl(
                                    movie.poster_url,
                                    'sm',
                                    movie.poster_image_type === 'backdrop'
                                      ? 'BACKDROPS'
                                      : 'POSTERS',
                                  ) ?? movie.poster_url
                                }
                                alt=""
                                className="w-10 h-14 rounded object-cover grayscale"
                              />
                            ) : (
                              <div className="w-10 h-14 rounded bg-input flex items-center justify-center">
                                <Film className="w-4 h-4 text-on-surface-subtle" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <Link href={`/movies/${movie.id}`} className="relative shrink-0">
                            {movie.poster_url ? (
                              <img
                                src={
                                  getImageUrl(
                                    movie.poster_url,
                                    'sm',
                                    movie.poster_image_type === 'backdrop'
                                      ? 'BACKDROPS'
                                      : 'POSTERS',
                                  ) ?? movie.poster_url
                                }
                                alt=""
                                className="w-10 h-14 rounded object-cover"
                              />
                            ) : (
                              <div className="w-10 h-14 rounded bg-input flex items-center justify-center">
                                <Film className="w-4 h-4 text-on-surface-subtle" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Pencil className="w-3 h-3 text-white" />
                            </div>
                          </Link>
                        )}
                        <div className="flex flex-col">
                          {isOtherLanguage ? (
                            <span className="font-medium text-on-surface-muted truncate max-w-[200px] inline-block">
                              {movie.title}
                            </span>
                          ) : (
                            <Link
                              href={`/movies/${movie.id}`}
                              className="font-medium text-on-surface hover:text-status-red transition-colors truncate max-w-[200px] inline-block"
                            >
                              {movie.title}
                            </Link>
                          )}
                          {movieLangName && (
                            <span className="text-[10px] text-on-surface-muted">
                              {movieLangName}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const badge = getStatusBadge(movie);
                        return (
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm text-on-surface-muted">
                      {movie.release_date ? formatDate(movie.release_date) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-status-yellow">
                      {movie.rating > 0 ? `★ ${movie.rating.toFixed(1)}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {!isOtherLanguage && (
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/movies/${movie.id}`}
                            className="p-2 rounded-lg text-on-surface-subtle hover:text-on-surface hover:bg-input"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          {canDeleteTopLevel() && (
                            <button
                              onClick={() => {
                                if (confirm('Delete this movie?'))
                                  deleteMovie.mutate(movie.id, {
                                    onError: (err: Error) => alert(`Error: ${err.message}`),
                                  });
                              }}
                              className="p-2 rounded-lg text-on-surface-subtle hover:text-status-red hover:bg-red-600/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {movies.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-on-surface-subtle">
                    No movies found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <LoadMoreButton
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </div>
  );
}
