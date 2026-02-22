'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAdminMovies, useUpdateMovie } from '@/hooks/useAdminMovies';
import { formatDate } from '@/lib/utils';

export default function MoviesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { data: movies = [], isLoading } = useAdminMovies({
    search: search || undefined,
    status: statusFilter || undefined,
  });
  const updateMovie = useUpdateMovie();

  const toggleFeatured = (id: number, current: boolean) => {
    updateMovie.mutate({ id, updates: { is_featured: !current } });
  };

  const changeStatus = (id: number, status: string) => {
    updateMovie.mutate({ id, updates: { status } });
  };

  return (
    <div data-testid="movies-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Movies</h1>
        <Link
          href="/movies/new"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          Add Movie
        </Link>
      </div>

      <div className="flex gap-4 mb-4">
        <input
          data-testid="search-input"
          type="text"
          placeholder="Search movies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-64"
        />
        <select
          data-testid="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="upcoming">Upcoming</option>
          <option value="released">Released</option>
          <option value="postponed">Postponed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table data-testid="movies-table" className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Release Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Featured</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {movies.map((movie: Record<string, unknown>) => (
                <tr key={movie.id as number} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{movie.title as string}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {movie.release_date ? formatDate(movie.release_date as string) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs bg-gray-100">
                      {movie.release_type as string}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={movie.status as string}
                      onChange={(e) => changeStatus(movie.id as number, e.target.value)}
                      className="text-xs border rounded px-2 py-1"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="released">Released</option>
                      <option value="postponed">Postponed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() =>
                        toggleFeatured(movie.id as number, movie.is_featured as boolean)
                      }
                      className="text-xs"
                    >
                      {movie.is_featured ? '⭐' : '☆'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/movies/${movie.id}`}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
