'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAdminCast } from '@/hooks/useAdminCast';

export default function CastPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const { data: cast = [], isLoading } = useAdminCast({
    search: search || undefined,
    role: roleFilter || undefined,
  });

  return (
    <div data-testid="cast-page">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Cast & Crew</h1>

      <div className="flex gap-4 mb-4">
        <input
          data-testid="cast-search"
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-64"
        />
        <select
          data-testid="role-filter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Roles</option>
          <option value="actor">Actor</option>
          <option value="director">Director</option>
          <option value="producer">Producer</option>
          <option value="music_director">Music Director</option>
        </select>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table data-testid="cast-table" className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Telugu Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Movies</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cast.map((person: Record<string, unknown>) => (
                <tr key={person.tmdb_person_id as number} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{person.name as string}</td>
                  <td className="px-4 py-3 text-gray-600">{(person.name_te as string) || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs bg-gray-100">
                      {person.role as string}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{person.movie_count as number}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/cast/${person.tmdb_person_id}`}
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
