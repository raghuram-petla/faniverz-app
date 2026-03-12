'use client';

import { useState } from 'react';
import { useAdminEndUsers } from '@/hooks/useAdminEndUsers';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { SearchInput } from '@/components/common/SearchInput';
import { Users, Loader2, ChevronLeft, ChevronRight, Ban } from 'lucide-react';

const PAGE_SIZE = 50;

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

export default function AppUsersPage() {
  const [page, setPage] = useState(0);
  const { search, setSearch, debouncedSearch } = useDebouncedSearch();

  const { data, isLoading, isError, error, isFetching } = useAdminEndUsers({
    search: debouncedSearch,
    page,
    pageSize: PAGE_SIZE,
  });

  const users = data?.users ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Reset to page 0 when search changes
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const handleBan = () => {
    alert('Banning users is not yet supported. This feature is coming soon.');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
          <Users className="w-5 h-5 text-blue-500" />
        </div>
        <h1 className="text-2xl font-bold text-on-surface">App Users</h1>
        {data && <span className="text-sm text-on-surface-muted">({totalCount})</span>}
      </div>

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
          <div className="bg-surface-card border border-outline rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline">
                  <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                    User
                  </th>
                  <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                    Username
                  </th>
                  <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                    Email
                  </th>
                  <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                    Joined
                  </th>
                  <th className="text-right text-sm font-medium text-on-surface-muted px-6 py-4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-outline-subtle hover:bg-surface-elevated transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar url={user.avatar_url} name={user.display_name} />
                        <span className="text-on-surface font-medium text-sm">
                          {user.display_name ?? 'No name'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-muted">
                      {user.username ? `@${user.username}` : '--'}
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-muted">
                      {user.email ?? '--'}
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-muted">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={handleBan}
                        className="p-2 text-on-surface-subtle hover:text-red-500 transition-colors"
                        title="Ban user"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPrevious: () => void;
  onNext: () => void;
}

function PaginationControls({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPrevious,
  onNext,
}: PaginationControlsProps) {
  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, totalCount);

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-on-surface-muted">
        Showing {from}--{to} of {totalCount}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrevious}
          disabled={page === 0}
          className="p-2 rounded-lg bg-surface-card border border-outline text-on-surface-muted hover:bg-surface-elevated disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm text-on-surface-muted px-2">
          Page {page + 1} of {totalPages}
        </span>
        <button
          onClick={onNext}
          disabled={page >= totalPages - 1}
          className="p-2 rounded-lg bg-surface-card border border-outline text-on-surface-muted hover:bg-surface-elevated disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
