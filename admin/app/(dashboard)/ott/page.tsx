'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAdminOttReleases, useDeleteOttRelease } from '@/hooks/useAdminOtt';
import { useAdminPlatforms } from '@/hooks/useAdminPlatforms';
import { formatDate } from '@/lib/utils';

export default function OttReleasesPage() {
  const [platformFilter, setPlatformFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const { data: releases = [], isLoading } = useAdminOttReleases({
    platformId: platformFilter ? Number(platformFilter) : undefined,
    source: sourceFilter || undefined,
  });
  const { data: platforms = [] } = useAdminPlatforms();
  const deleteRelease = useDeleteOttRelease();

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this OTT release?')) {
      deleteRelease.mutate(id);
    }
  };

  return (
    <div data-testid="ott-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">OTT Releases</h1>
        <Link
          href="/ott/new"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          Add OTT Release
        </Link>
      </div>

      <div className="flex gap-4 mb-4">
        <select
          data-testid="platform-filter"
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Platforms</option>
          {platforms.map((p: Record<string, unknown>) => (
            <option key={p.id as number} value={p.id as number}>
              {p.name as string}
            </option>
          ))}
        </select>
        <select
          data-testid="source-filter"
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Sources</option>
          <option value="tmdb">TMDB</option>
          <option value="manual">Manual</option>
        </select>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table data-testid="ott-table" className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Movie</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Platform</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Release Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Exclusive</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Source</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {releases.map((release: Record<string, unknown>) => {
                const movie = release.movies as Record<string, unknown> | null;
                const platform = release.platforms as Record<string, unknown> | null;
                return (
                  <tr key={release.id as number} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{movie?.title as string}</td>
                    <td className="px-4 py-3">{platform?.name as string}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {release.ott_release_date
                        ? formatDate(release.ott_release_date as string)
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {release.is_exclusive ? (
                        <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                          Exclusive
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100">
                        {release.source as string}
                      </span>
                    </td>
                    <td className="px-4 py-3 space-x-2">
                      <Link
                        href={`/ott/${release.id}`}
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(release.id as number)}
                        className="text-red-600 hover:text-red-800 text-xs font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
