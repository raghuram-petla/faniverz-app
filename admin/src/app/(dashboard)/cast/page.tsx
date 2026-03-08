'use client';
import { useState, useEffect } from 'react';
import { useAdminActors, useCreateActor, useDeleteActor } from '@/hooks/useAdminCast';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/components/providers/AuthProvider';
import { AddActorForm } from '@/components/cast/AddActorForm';
import { Plus, Trash2, Search, Loader2, Users, Pencil } from 'lucide-react';
import Link from 'next/link';
import { getImageUrl } from '@shared/imageUrl';

export default function CastPage() {
  const { user } = useAuth();
  const { isPHAdmin, canDelete } = usePermissions();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { data, isLoading, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useAdminActors(debouncedSearch);
  const actors = data?.pages.flat() ?? [];
  const createActor = useCreateActor();
  const deleteActor = useDeleteActor();
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  async function handleAdd(formData: {
    name: string;
    photo_url: string | null;
    birth_date: string | null;
    person_type: 'actor' | 'technician';
    height_cm: number | null;
  }) {
    await createActor.mutateAsync({
      ...formData,
      ...(user?.id ? { created_by: user.id } : {}),
    });
    setShowAdd(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Cast / Actors</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700"
        >
          <Plus className="w-4 h-4" /> Add Actor
        </button>
      </div>

      {showAdd && (
        <AddActorForm
          onSubmit={handleAdd}
          isPending={createActor.isPending}
          onCancel={() => setShowAdd(false)}
        />
      )}

      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-subtle" />
          <input
            type="text"
            placeholder="Search actors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-input rounded-lg pl-10 pr-4 py-2 text-sm text-on-surface placeholder:text-on-surface-subtle outline-none focus:ring-2 focus:ring-red-600"
          />
          {isFetching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-subtle animate-spin" />
          )}
        </div>
        {search.length === 1 && (
          <p className="text-xs text-on-surface-subtle">Type at least 2 characters to search</p>
        )}
        {!isLoading && actors.length > 0 && (
          <p className="text-xs text-on-surface-subtle">
            Showing {actors.length} actor{actors.length !== 1 ? 's' : ''}
            {debouncedSearch ? ` matching "${debouncedSearch}"` : ''}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actors.map((actor) => (
            <div
              key={actor.id}
              className="bg-surface-card border border-outline rounded-xl p-4 flex items-center gap-4"
            >
              <Link href={'/cast/' + actor.id} className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-14 h-14 rounded-full bg-input flex items-center justify-center overflow-hidden shrink-0">
                  {actor.photo_url ? (
                    <img
                      src={getImageUrl(actor.photo_url, 'sm')!}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users className="w-6 h-6 text-on-surface-subtle" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-on-surface truncate">{actor.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-on-surface-subtle capitalize">
                      {actor.person_type}
                    </span>
                  </div>
                </div>
              </Link>
              {(!isPHAdmin || actor.created_by === user?.id) && (
                <Link
                  href={'/cast/' + actor.id}
                  className="p-2 rounded-lg text-on-surface-subtle hover:text-on-surface hover:bg-input"
                >
                  <Pencil className="w-4 h-4" />
                </Link>
              )}
              {canDelete('actor', actor.created_by) && (
                <button
                  onClick={() => {
                    if (confirm('Delete this actor?')) deleteActor.mutate(actor.id);
                  }}
                  className="p-2 rounded-lg text-on-surface-subtle hover:text-red-500 hover:bg-red-600/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {actors.length === 0 && (
            <p className="text-on-surface-subtle col-span-full text-center py-10">
              No actors found
            </p>
          )}
        </div>
      )}
      {hasNextPage && (
        <div className="flex justify-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="flex items-center gap-2 bg-input hover:bg-input-hover text-on-surface px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
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
