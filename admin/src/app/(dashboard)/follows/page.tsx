'use client';

import { useAdminFollows, useDeleteFollow } from '@/hooks/useAdminFollows';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { SearchInput } from '@/components/common/SearchInput';
import { Heart, Trash2, Loader2 } from 'lucide-react';

export default function FollowsPage() {
  const { search, setSearch, debouncedSearch } = useDebouncedSearch();
  const { data: follows, isLoading, isFetching, isError, error } = useAdminFollows(debouncedSearch);
  const deleteFollow = useDeleteFollow();

  const handleDelete = (id: string) => {
    if (!confirm('Delete this follow? This cannot be undone.')) return;
    deleteFollow.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-pink-600/20 flex items-center justify-center">
          <Heart className="w-5 h-5 text-pink-500" />
        </div>
        <h1 className="text-2xl font-bold text-on-surface">Follows</h1>
        {follows && <span className="text-sm text-on-surface-muted">({follows.length})</span>}
      </div>

      <div className="space-y-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by user name or entity type..."
          isLoading={isFetching}
        />
        {search.length === 1 && (
          <p className="text-xs text-on-surface-subtle">Type at least 2 characters to search</p>
        )}
        {!isLoading && follows && follows.length > 0 && (
          <p className="text-xs text-on-surface-subtle">
            Showing {follows.length} follow{follows.length !== 1 ? 's' : ''}
            {debouncedSearch ? ` matching "${debouncedSearch}"` : ''}
          </p>
        )}
      </div>

      {isError && (
        <div className="bg-red-600/10 border border-red-600/30 rounded-lg px-4 py-3 text-sm text-red-400">
          Error loading follows: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-on-surface-subtle animate-spin" />
        </div>
      ) : !follows?.length ? (
        <div className="text-center py-20 text-on-surface-subtle">No follows found.</div>
      ) : (
        <div className="bg-surface-card border border-outline rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline">
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  User
                </th>
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Entity Type
                </th>
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Entity ID
                </th>
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Followed On
                </th>
                <th className="text-right text-sm font-medium text-on-surface-muted px-6 py-4">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {follows.map((follow) => (
                <tr
                  key={follow.id}
                  className="border-b border-outline-subtle hover:bg-surface-elevated transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-on-surface">
                    {follow.profile?.display_name ?? follow.profile?.email ?? 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-muted">
                    {follow.entity_type.charAt(0).toUpperCase() + follow.entity_type.slice(1)}
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-muted font-mono">
                    {follow.entity_id}
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-muted">
                    {new Date(follow.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(follow.id)}
                      disabled={deleteFollow.isPending}
                      className="p-2 text-on-surface-subtle hover:text-red-500 transition-colors disabled:opacity-50"
                      title="Delete follow"
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
