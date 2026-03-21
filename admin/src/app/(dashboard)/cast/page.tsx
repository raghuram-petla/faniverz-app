'use client';
import { useState } from 'react';
import { useAdminActors, useCreateActor, useDeleteActor } from '@/hooks/useAdminCast';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/components/providers/AuthProvider';
import { AddActorForm } from '@/components/cast/AddActorForm';
import { Plus, Trash2, Loader2, Users, Pencil } from 'lucide-react';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { SearchInput } from '@/components/common/SearchInput';
import { LoadMoreButton } from '@/components/common/LoadMoreButton';
import Link from 'next/link';
import { getImageUrl } from '@shared/imageUrl';

export default function CastPage() {
  const { user } = useAuth();
  // @coupling isPHAdmin restricts edit visibility; canDelete gates deletion by ownership
  const { isPHAdmin, canDeleteTopLevel, isReadOnly } = usePermissions();
  const { search, setSearch, debouncedSearch } = useDebouncedSearch();
  const { data, isLoading, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useAdminActors(debouncedSearch);
  const actors = data?.pages.flat() ?? [];
  const createActor = useCreateActor();
  const deleteActor = useDeleteActor();
  const [showAdd, setShowAdd] = useState(false);

  // @sideeffect Creates actor with created_by stamped for ownership tracking
  // @nullable user?.id may be absent if auth context hasn't loaded (defensive spread)
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
      {showAdd && (
        <AddActorForm
          onSubmit={handleAdd}
          isPending={createActor.isPending}
          onCancel={() => setShowAdd(false)}
        />
      )}

      <div className="space-y-2">
        <div className="flex gap-3 items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search actors..."
            isLoading={isFetching}
          />
          {!isReadOnly && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 ml-auto shrink-0"
            >
              <Plus className="w-4 h-4" /> Add Actor
            </button>
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
          <Loader2 className="w-8 h-8 text-status-red animate-spin" />
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
                      src={getImageUrl(actor.photo_url, 'sm', 'ACTORS') ?? actor.photo_url}
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
              {/* @invariant PH admins can only edit actors they created; non-PH admins edit all */}
              {(!isPHAdmin || actor.created_by === user?.id) && (
                <Link
                  href={'/cast/' + actor.id}
                  className="p-2 rounded-lg text-on-surface-subtle hover:text-on-surface hover:bg-input"
                >
                  <Pencil className="w-4 h-4" />
                </Link>
              )}
              {/* @invariant Top-level delete: only root/super_admin */}
              {canDeleteTopLevel() && (
                <button
                  onClick={() => {
                    if (confirm('Delete this actor?'))
                      deleteActor.mutate(actor.id, {
                        onError: (err: Error) => alert(`Error: ${err.message}`),
                      });
                  }}
                  className="p-2 rounded-lg text-on-surface-subtle hover:text-status-red hover:bg-red-600/10"
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
      <LoadMoreButton
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </div>
  );
}
