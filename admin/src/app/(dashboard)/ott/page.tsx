'use client';

import { useAdminOttReleases, useDeleteOttRelease } from '@/hooks/useAdminOtt';
import { usePermissions } from '@/hooks/usePermissions';
import { Trash2, Plus, Loader2, Pencil } from 'lucide-react';
import Link from 'next/link';

export default function OttReleasesPage() {
  // @coupling usePermissions gates both data scoping (PH filter) and delete button visibility
  const { isPHAdmin, productionHouseIds, canDelete } = usePermissions();
  // @boundary PH admins only see releases for their production house movies
  const { data: releases, isLoading } = useAdminOttReleases(
    isPHAdmin ? productionHouseIds : undefined,
  );
  const deleteRelease = useDeleteOttRelease();

  const handleDelete = (movieId: string, platformId: string) => {
    if (!confirm('Remove this OTT release?')) return;
    deleteRelease.mutate({ movieId, platformId });
  };

  return (
    <div className="space-y-6">
      <div className="flex">
        <Link
          href="/ott/new"
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors font-medium ml-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Release
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-on-surface-subtle animate-spin" />
        </div>
      ) : !releases?.length ? (
        <div className="text-center py-20 text-on-surface-subtle">
          No OTT releases found. Add one to get started.
        </div>
      ) : (
        <div className="bg-surface-card border border-outline rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline">
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Movie
                </th>
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Platform
                </th>
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Available From
                </th>
                <th className="text-right text-sm font-medium text-on-surface-muted px-6 py-4">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {releases.map((release) => (
                <tr
                  key={`${release.movie_id}-${release.platform_id}`} /* @invariant Composite key — OTT releases keyed by (movie_id, platform_id) pair */
                  className="border-b border-outline-subtle hover:bg-surface-elevated transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="text-on-surface font-medium">
                      <span className="truncate max-w-[200px] inline-block align-middle">
                        {release.movie?.title ?? release.movie_id}
                      </span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {release.platform ? (
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-on-surface"
                          style={{ backgroundColor: release.platform.color }}
                        >
                          {release.platform.logo}
                        </span>
                        <span className="font-medium" style={{ color: release.platform.color }}>
                          {release.platform.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-on-surface-subtle">{release.platform_id}</span>
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
                    <div className="flex items-center justify-end gap-1">
                      {/* @contract Edit route uses tilde-separated composite key in URL */}
                      <Link
                        href={`/ott/${release.movie_id}~${release.platform_id}`}
                        className="p-2 text-on-surface-subtle hover:text-blue-400 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      {/* @invariant Delete gated by role-based canDelete('ott_release') */}
                      {canDelete('ott_release') && (
                        <button
                          onClick={() => handleDelete(release.movie_id, release.platform_id)}
                          disabled={deleteRelease.isPending}
                          className="p-2 text-on-surface-subtle hover:text-red-500 transition-colors disabled:opacity-50"
                          title="Delete release"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
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
