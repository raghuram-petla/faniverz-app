'use client';

import { useAdminOttReleases, useDeleteOttRelease } from '@/hooks/useAdminOtt';
import { Tv, Trash2, Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function OttReleasesPage() {
  const { data: releases, isLoading } = useAdminOttReleases();
  const deleteRelease = useDeleteOttRelease();

  const handleDelete = (movieId: string, platformId: string) => {
    if (!confirm('Remove this OTT release?')) return;
    deleteRelease.mutate({ movieId, platformId });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
            <Tv className="w-5 h-5 text-purple-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">OTT Releases</h1>
        </div>
        <Link
          href="/ott/new"
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Release
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
        </div>
      ) : !releases?.length ? (
        <div className="text-center py-20 text-white/40">
          No OTT releases found. Add one to get started.
        </div>
      ) : (
        <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-sm font-medium text-white/60 px-6 py-4">Movie</th>
                <th className="text-left text-sm font-medium text-white/60 px-6 py-4">Platform</th>
                <th className="text-left text-sm font-medium text-white/60 px-6 py-4">
                  Available From
                </th>
                <th className="text-right text-sm font-medium text-white/60 px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {releases.map((release) => (
                <tr
                  key={`${release.movie_id}-${release.platform_id}`}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="text-white font-medium">
                      {release.movie?.title ?? release.movie_id}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {release.platform ? (
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ backgroundColor: release.platform.color }}
                        >
                          {release.platform.logo}
                        </span>
                        <span className="font-medium" style={{ color: release.platform.color }}>
                          {release.platform.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-white/40">{release.platform_id}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {release.available_from ? (
                      <span className="text-blue-400 text-sm">{release.available_from}</span>
                    ) : (
                      <span className="text-green-400 text-sm">Live now</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(release.movie_id, release.platform_id)}
                      disabled={deleteRelease.isPending}
                      className="p-2 text-white/40 hover:text-red-500 transition-colors disabled:opacity-50"
                      title="Delete release"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
