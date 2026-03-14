'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAdminMovies, useDeleteMovie } from '@/hooks/useAdminMovies';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate } from '@/lib/utils';
import { Plus, Edit, Trash2, Loader2, Film, Pencil } from 'lucide-react';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { SearchInput } from '@/components/common/SearchInput';
import { LoadMoreButton } from '@/components/common/LoadMoreButton';
import { MOVIE_STATUS_CONFIG } from '@shared/constants';
import { deriveMovieStatus } from '@shared/movieStatus';
import type { Movie } from '@/lib/types';
import { getImageUrl } from '@shared/imageUrl';

// @coupling Must stay in sync with shared MOVIE_STATUS_CONFIG keys
const STATUS_BADGE_CLASSES: Record<string, string> = {
  announced: 'bg-amber-600/20 text-amber-400',
  upcoming: 'bg-blue-600/20 text-blue-400',
  in_theaters: 'bg-red-600/20 text-red-400',
  streaming: 'bg-purple-600/20 text-purple-400',
  released: 'bg-gray-600/20 text-gray-400',
};

// @contract Derives display status from movie data at runtime (not stored in DB)
// @assumes deriveMovieStatus second param (ottCount) is 0 here — list page doesn't fetch OTT data
function getStatusBadge(movie: Movie) {
  const status = deriveMovieStatus(movie, 0);
  const config = MOVIE_STATUS_CONFIG[status];
  return {
    label: config.label,
    className: STATUS_BADGE_CLASSES[status] ?? 'bg-gray-600/20 text-gray-400',
  };
}

export default function MoviesPage() {
  // @coupling usePermissions gates data scoping, delete button, and edit visibility
  const { isPHAdmin, productionHouseIds, canDelete } = usePermissions();
  const { search, setSearch, debouncedSearch } = useDebouncedSearch();
  const [statusFilter, setStatusFilter] = useState<string>('');
  // @boundary PH admins see only their production house movies via productionHouseIds filter
  const { data, isLoading, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useAdminMovies(debouncedSearch, statusFilter, isPHAdmin ? productionHouseIds : undefined);
  const movies = data?.pages.flat() ?? [];
  const deleteMovie = useDeleteMovie();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Movies</h1>
        <Link
          href="/movies/new"
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700"
        >
          <Plus className="w-4 h-4" /> Add Movie
        </Link>
      </div>

      <div className="space-y-2">
        <div className="flex gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search movies..."
            isLoading={isFetching}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-input rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-red-600"
          >
            <option value="">All Status</option>
            <option value="announced">Announced</option>
            <option value="upcoming">Upcoming</option>
            <option value="in_theaters">In Theaters</option>
            <option value="streaming">Streaming</option>
            <option value="released">Released</option>
          </select>
        </div>
        {search.length === 1 && (
          <p className="text-xs text-on-surface-subtle">Type at least 2 characters to search</p>
        )}
        {!isLoading && movies.length > 0 && (
          <p className="text-xs text-on-surface-subtle">
            Showing {movies.length} movie{movies.length !== 1 ? 's' : ''}
            {debouncedSearch ? ` matching "${debouncedSearch}"` : ''}
            {statusFilter ? ` (${statusFilter})` : ''}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
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
              {movies.map((movie) => (
                <tr key={movie.id} className="hover:bg-surface-elevated group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/movies/${movie.id}`} className="relative shrink-0">
                        {movie.poster_url ? (
                          <img
                            src={getImageUrl(movie.poster_url, 'sm') ?? movie.poster_url}
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
                      <Link
                        href={`/movies/${movie.id}`}
                        className="font-medium text-on-surface hover:text-red-400 transition-colors truncate max-w-[200px] inline-block align-middle"
                      >
                        {movie.title}
                      </Link>
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
                    {/* @nullable release_date absent for announced movies */}
                  </td>
                  <td className="px-4 py-3 text-sm text-yellow-400">
                    {movie.rating > 0 ? `★ ${movie.rating.toFixed(1)}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/movies/${movie.id}`}
                        className="p-2 rounded-lg text-on-surface-subtle hover:text-on-surface hover:bg-input"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      {/* @invariant Delete gated by role-based canDelete('movie') */}
                      {canDelete('movie') && (
                        <button
                          onClick={() => {
                            if (confirm('Delete this movie?'))
                              deleteMovie.mutate(movie.id, {
                                onError: (err: Error) => alert(`Error: ${err.message}`),
                              });
                          }}
                          className="p-2 rounded-lg text-on-surface-subtle hover:text-red-500 hover:bg-red-600/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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
