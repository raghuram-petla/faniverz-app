'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAdminMovies, useDeleteMovie } from '@/hooks/useAdminMovies';
import { formatDate } from '@/lib/utils';
import { Plus, Edit, Trash2, Search, Loader2 } from 'lucide-react';
import { MOVIE_STATUS_CONFIG } from '@shared/constants';
import { deriveMovieStatus } from '@shared/movieStatus';
import type { Movie } from '@/lib/types';

function getStatusBadge(movie: Movie) {
  // For list page, we don't have platform count; use 0 (streaming will show for those with platforms in detail)
  const status = deriveMovieStatus(movie, 0);
  const config = MOVIE_STATUS_CONFIG[status];
  const colorMap: Record<string, string> = {
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
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data, isLoading, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useAdminMovies(debouncedSearch, statusFilter);
  const movies = data?.pages.flat() ?? [];
  const deleteMovie = useDeleteMovie();

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Movies</h1>
        <Link
          href="/movies/new"
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700"
        >
          <Plus className="w-4 h-4" /> Add Movie
        </Link>
      </div>

      <div className="space-y-2">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search movies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-red-600"
            />
            {isFetching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 animate-spin" />
            )}
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-red-600"
          >
            <option value="">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="in_theaters">In Theaters</option>
          </select>
        </div>
        {search.length === 1 && (
          <p className="text-xs text-white/40">Type at least 2 characters to search</p>
        )}
        {!isLoading && movies.length > 0 && (
          <p className="text-xs text-white/40">
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
        <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-4 py-3">
                  Movie
                </th>
                <th className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-4 py-3">
                  Type
                </th>
                <th className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-4 py-3">
                  Release Date
                </th>
                <th className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-4 py-3">
                  Rating
                </th>
                <th className="text-right text-xs font-medium text-white/40 uppercase tracking-wider px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {movies.map((movie) => (
                <tr key={movie.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {movie.poster_url && (
                        <img
                          src={movie.poster_url}
                          alt=""
                          className="w-10 h-14 rounded object-cover"
                        />
                      )}
                      <span className="font-medium text-white">{movie.title}</span>
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
                  <td className="px-4 py-3 text-sm text-white/60">
                    {formatDate(movie.release_date)}
                  </td>
                  <td className="px-4 py-3 text-sm text-yellow-400">
                    {movie.rating > 0 ? `★ ${movie.rating.toFixed(1)}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/movies/${movie.id}`}
                        className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm('Delete this movie?')) deleteMovie.mutate(movie.id);
                        }}
                        className="p-2 rounded-lg text-white/40 hover:text-red-500 hover:bg-red-600/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {movies.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-white/40">
                    No movies found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {hasNextPage && (
        <div className="flex justify-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
