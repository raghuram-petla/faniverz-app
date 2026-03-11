'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAdminMovies, useDeleteMovie } from '@/hooks/useAdminMovies';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate } from '@/lib/utils';
import { Plus, Edit, Trash2, Loader2, Film } from 'lucide-react';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { SearchInput } from '@/components/common/SearchInput';
import { LoadMoreButton } from '@/components/common/LoadMoreButton';
import { MOVIE_STATUS_CONFIG } from '@shared/constants';
import { deriveMovieStatus } from '@shared/movieStatus';
import type { Movie } from '@/lib/types';
import { getImageUrl } from '@shared/imageUrl';

function getStatusBadge(movie: Movie) {
  // For list page, we don't have platform count; use 0 (streaming will show for those with platforms in detail)
  const status = deriveMovieStatus(movie, 0);
  const config = MOVIE_STATUS_CONFIG[status];
  const colorMap: Record<string, string> = {
    '#F59E0B': 'bg-amber-600/20 text-amber-400',
    '#2563EB': 'bg-blue-600/20 text-blue-400',
    '#DC2626': 'bg-red-600/20 text-red-400',
    '#9333EA': 'bg-purple-600/20 text-purple-400',
    '#6B7280': 'bg-gray-600/20 text-gray-400',
  };
  return {
    label: config.label,
    className: colorMap[config.color] ?? 'bg-gray-600/20 text-gray-400',
  };
}

export default function MoviesPage() {
  const { isPHAdmin, productionHouseIds, canDelete } = usePermissions();
  const { search, setSearch, debouncedSearch } = useDebouncedSearch();
  const [statusFilter, setStatusFilter] = useState<string>('');
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
                <tr key={movie.id} className="hover:bg-surface-elevated">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {movie.poster_url ? (
                        <img
                          src={getImageUrl(movie.poster_url, 'sm')!}
                          alt=""
                          className="w-10 h-14 rounded object-cover"
                        />
                      ) : (
                        <div className="w-10 h-14 rounded bg-input flex items-center justify-center">
                          <Film className="w-4 h-4 text-on-surface-subtle" />
                        </div>
                      )}
                      <span className="font-medium text-on-surface">{movie.title}</span>
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
