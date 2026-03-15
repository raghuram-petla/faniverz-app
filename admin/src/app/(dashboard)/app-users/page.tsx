'use client';

import { useState } from 'react';
import { useAdminEndUsers, useBanUser, useUpdateEndUserProfile } from '@/hooks/useAdminEndUsers';
import type { EndUserProfile } from '@/hooks/useAdminEndUsers';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { SearchInput } from '@/components/common/SearchInput';
import { PaginationControls } from '@/components/common/PaginationControls';
import { Loader2, Ban, Pencil, X, Check } from 'lucide-react';

const PAGE_SIZE = 50;

// @nullable Both url and name can be null — renders initials fallback or '?' placeholder
function UserAvatar({ url, name }: { url: string | null; name: string | null }) {
  const initials = (name ?? '?')[0]?.toUpperCase() ?? '?';

  if (url) {
    return (
      <img src={url} alt={name ?? 'User avatar'} className="w-8 h-8 rounded-full object-cover" />
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-red-600/20 flex items-center justify-center text-xs font-medium text-red-400">
      {initials}
    </div>
  );
}

// @contract Server-side pagination (not cursor-based) — page index sent to API
export default function AppUsersPage() {
  // @sync Page resets to 0 on search change via handleSearchChange
  const [page, setPage] = useState(0);
  const { search, setSearch, debouncedSearch } = useDebouncedSearch();
  // @invariant At most one user can be in edit mode at a time
  const [editingUser, setEditingUser] = useState<EndUserProfile | null>(null);
  const [editName, setEditName] = useState('');

  const { data, isLoading, isError, error, isFetching } = useAdminEndUsers({
    search: debouncedSearch,
    page,
    pageSize: PAGE_SIZE,
  });

  const banUser = useBanUser();
  const updateProfile = useUpdateEndUserProfile();

  const users = data?.users ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  // @sideeffect Banning sets a 10-year ban_duration via Supabase Auth admin API
  // @boundary Ban is irreversible from this page — no unban action exposed; requires API route /api/manage-user
  const handleBan = (user: EndUserProfile) => {
    const name = user.display_name ?? user.email ?? 'this user';
    if (!confirm(`Ban ${name}? They will not be able to log in.`)) return;
    banUser.mutate(user.id);
  };

  const startEdit = (user: EndUserProfile) => {
    setEditingUser(user);
    setEditName(user.display_name ?? '');
  };

  const saveEdit = () => {
    if (!editingUser) return;
    updateProfile.mutate(
      { userId: editingUser.id, fields: { display_name: editName } },
      { onSuccess: () => setEditingUser(null) },
    );
  };

  return (
    <div className="space-y-6">
      {data && (
        <p className="text-sm text-on-surface-muted">
          {totalCount} user{totalCount !== 1 ? 's' : ''}
        </p>
      )}

      <SearchInput
        value={search}
        onChange={handleSearchChange}
        placeholder="Search by name, username, or email..."
        isLoading={isFetching && !isLoading}
      />

      {isError && (
        <div className="bg-red-600/10 border border-red-600/30 rounded-lg px-4 py-3 text-sm text-red-400">
          Error loading users: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-on-surface-subtle animate-spin" />
        </div>
      ) : !users.length ? (
        <div className="text-center py-20 text-on-surface-subtle">
          {debouncedSearch ? 'No users match your search.' : 'No users found.'}
        </div>
      ) : (
        <>
          <UserTable
            users={users}
            editingUser={editingUser}
            editName={editName}
            onEditNameChange={setEditName}
            onStartEdit={startEdit}
            onSaveEdit={saveEdit}
            onCancelEdit={() => setEditingUser(null)}
            onBan={handleBan}
            isBanning={banUser.isPending}
            isSaving={updateProfile.isPending}
          />

          {totalPages > 1 && (
            <PaginationControls
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={PAGE_SIZE}
              onPrevious={() => setPage((p) => Math.max(0, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            />
          )}
        </>
      )}
    </div>
  );
}

// @contract UserTable is a presentation component — all mutations delegated via callbacks
interface UserTableProps {
  users: EndUserProfile[];
  editingUser: EndUserProfile | null;
  editName: string;
  onEditNameChange: (v: string) => void;
  onStartEdit: (u: EndUserProfile) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onBan: (u: EndUserProfile) => void;
  isBanning: boolean;
  isSaving: boolean;
}

function UserTable({
  users,
  editingUser,
  editName,
  onEditNameChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onBan,
  isBanning,
  isSaving,
}: UserTableProps) {
  return (
    <div className="bg-surface-card border border-outline rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-outline">
            <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">User</th>
            <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
              Username
            </th>
            <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">Email</th>
            <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
              Joined
            </th>
            <th className="text-right text-sm font-medium text-on-surface-muted px-6 py-4">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const isEditing = editingUser?.id === user.id;
            return (
              <tr
                key={user.id}
                className="border-b border-outline-subtle hover:bg-surface-elevated transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar url={user.avatar_url} name={user.display_name} />
                    {isEditing ? (
                      <input
                        value={editName}
                        onChange={(e) => onEditNameChange(e.target.value)}
                        className="bg-input rounded-lg px-2 py-1 text-sm text-on-surface outline-none focus:ring-2 focus:ring-red-600 w-40"
                      />
                    ) : (
                      <span className="text-on-surface font-medium text-sm">
                        {user.display_name ?? 'No name'}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-on-surface-muted">
                  {user.username ? `@${user.username}` : '--'}
                </td>
                <td className="px-6 py-4 text-sm text-on-surface-muted">{user.email ?? '--'}</td>
                <td className="px-6 py-4 text-sm text-on-surface-muted">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {isEditing ? (
                      <>
                        <button
                          onClick={onSaveEdit}
                          disabled={isSaving}
                          className="p-2 text-green-500 hover:text-green-400 transition-colors disabled:opacity-50"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={onCancelEdit}
                          className="p-2 text-on-surface-subtle hover:text-on-surface transition-colors"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => onStartEdit(user)}
                          className="p-2 text-on-surface-subtle hover:text-blue-500 transition-colors"
                          title="Edit profile"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onBan(user)}
                          disabled={isBanning}
                          className="p-2 text-on-surface-subtle hover:text-red-500 transition-colors disabled:opacity-50"
                          title="Ban user"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
