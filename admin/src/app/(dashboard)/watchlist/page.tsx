'use client';

import { useAdminWatchlist, useDeleteWatchlistEntry } from '@/hooks/useAdminWatchlist';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { SearchInput } from '@/components/common/SearchInput';
import { Bookmark, Trash2, Loader2 } from 'lucide-react';

export default function WatchlistPage() {
  const { search, setSearch, debouncedSearch } = useDebouncedSearch();
  const {
    data: entries,
    isLoading,
    isFetching,
    isError,
    error,
  } = useAdminWatchlist(debouncedSearch);
  const deleteEntry = useDeleteWatchlistEntry();

  const handleDelete = (id: string) => {
    if (!confirm('Delete this watchlist entry? This cannot be undone.')) return;
    deleteEntry.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
          <Bookmark className="w-5 h-5 text-blue-500" />
        </div>
        <h1 className="text-2xl font-bold text-on-surface">Watchlist</h1>
        {entries && <span className="text-sm text-on-surface-muted">({entries.length})</span>}
      </div>

      <div className="space-y-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by movie title or user name..."
          isLoading={isFetching}
        />
        {search.length === 1 && (
          <p className="text-xs text-on-surface-subtle">Type at least 2 characters to search</p>
        )}
        {!isLoading && entries && entries.length > 0 && (
          <p className="text-xs text-on-surface-subtle">
            Showing {entries.length} entr{entries.length !== 1 ? 'ies' : 'y'}
            {debouncedSearch ? ` matching "${debouncedSearch}"` : ''}
          </p>
        )}
      </div>

      {isError && (
        <div className="bg-red-600/10 border border-red-600/30 rounded-lg px-4 py-3 text-sm text-red-400">
          Error loading watchlist: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-on-surface-subtle animate-spin" />
        </div>
      ) : !entries?.length ? (
        <div className="text-center py-20 text-on-surface-subtle">No watchlist entries found.</div>
      ) : (
        <div className="bg-surface-card border border-outline rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline">
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Movie
                </th>
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  User
                </th>
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Status
                </th>
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Added
                </th>
                <th className="text-right text-sm font-medium text-on-surface-muted px-6 py-4">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-outline-subtle hover:bg-surface-elevated transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="text-on-surface font-medium text-sm">
                      {entry.movie?.title ?? 'Unknown movie'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-muted">
                    {entry.profile?.display_name ?? entry.profile?.email ?? 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={entry.status === 'watched' ? 'text-green-500' : 'text-yellow-500'}
                    >
                      {entry.status === 'watched' ? 'Watched' : 'To Watch'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-muted">
                    {new Date(entry.added_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={deleteEntry.isPending}
                      className="p-2 text-on-surface-subtle hover:text-red-500 transition-colors disabled:opacity-50"
                      title="Delete watchlist entry"
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
