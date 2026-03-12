'use client';

import { useAdminFavorites, useDeleteFavorite } from '@/hooks/useAdminFavorites';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { SearchInput } from '@/components/common/SearchInput';
import { Star, Trash2, Loader2 } from 'lucide-react';

export default function FavoritesPage() {
  const { search, setSearch, debouncedSearch } = useDebouncedSearch();
  const {
    data: favorites,
    isLoading,
    isFetching,
    isError,
    error,
  } = useAdminFavorites(debouncedSearch);
  const deleteFavorite = useDeleteFavorite();

  const handleDelete = (id: string) => {
    if (!confirm('Remove this favorite? This cannot be undone.')) return;
    deleteFavorite.mutate(id, { onError: (err: Error) => alert(`Error: ${err.message}`) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-yellow-600/20 flex items-center justify-center">
          <Star className="w-5 h-5 text-yellow-500" />
        </div>
        <h1 className="text-2xl font-bold text-on-surface">Favorite Actors</h1>
        {favorites && <span className="text-sm text-on-surface-muted">({favorites.length})</span>}
      </div>

      <div className="space-y-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by actor name or user name..."
          isLoading={isFetching}
        />
        {search.length === 1 && (
          <p className="text-xs text-on-surface-subtle">Type at least 2 characters to search</p>
        )}
        {!isLoading && favorites && favorites.length > 0 && (
          <p className="text-xs text-on-surface-subtle">
            Showing {favorites.length} favorite{favorites.length !== 1 ? 's' : ''}
            {debouncedSearch ? ` matching "${debouncedSearch}"` : ''}
          </p>
        )}
      </div>

      {isError && (
        <div className="bg-red-600/10 border border-red-600/30 rounded-lg px-4 py-3 text-sm text-red-400">
          Error loading favorites: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-on-surface-subtle animate-spin" />
        </div>
      ) : !favorites?.length ? (
        <div className="text-center py-20 text-on-surface-subtle">No favorite actors found.</div>
      ) : (
        <div className="bg-surface-card border border-outline rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline">
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Actor
                </th>
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  User
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
              {favorites.map((fav) => (
                <tr
                  key={fav.id}
                  className="border-b border-outline-subtle hover:bg-surface-elevated transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="text-on-surface font-medium text-sm">
                      {fav.actor?.name ?? 'Unknown actor'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-muted">
                    {fav.profile?.display_name ?? fav.profile?.email ?? 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-muted">
                    {new Date(fav.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(fav.id)}
                      disabled={deleteFavorite.isPending}
                      className="p-2 text-on-surface-subtle hover:text-red-500 transition-colors disabled:opacity-50"
                      title="Remove favorite"
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
