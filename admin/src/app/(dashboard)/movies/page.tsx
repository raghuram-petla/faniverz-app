'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAdminMovies, useDeleteMovie } from '@/hooks/useAdminMovies';
import { formatDate } from '@/lib/utils';
import { Plus, Edit, Trash2, Search, Loader2 } from 'lucide-react';

export default function MoviesPage() {
  const { data: movies = [], isLoading } = useAdminMovies();
  const deleteMovie = useDeleteMovie();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const filtered = movies.filter((m) => {
    if (search && !m.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && m.release_type !== typeFilter) return false;
    return true;
  });

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
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-red-600"
        >
          <option value="">All Types</option>
          <option value="theatrical">Theatrical</option>
          <option value="ott">OTT</option>
          <option value="upcoming">Upcoming</option>
        </select>
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
              {filtered.map((movie) => (
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
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        movie.release_type === 'theatrical'
                          ? 'bg-red-600/20 text-red-400'
                          : movie.release_type === 'ott'
                            ? 'bg-purple-600/20 text-purple-400'
                            : 'bg-blue-600/20 text-blue-400'
                      }`}
                    >
                      {movie.release_type}
                    </span>
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
              {filtered.length === 0 && (
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
    </div>
  );
}
