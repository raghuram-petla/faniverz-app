'use client';

import { Fragment, useState } from 'react';
import { useAdminAuditLog, type AuditFilters } from '@/hooks/useAdminAudit';
import { usePermissions } from '@/hooks/usePermissions';
import { useEffectiveUser } from '@/hooks/useImpersonation';
import { AUDIT_ENTITY_TYPES, ADMIN_ROLE_LABELS } from '@/lib/types';
import type { AdminRoleId } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import {
  actionStyles,
  formatDetails,
  getEntityDisplayName,
  canRevert,
} from '@/components/audit/auditUtils';
import { RevertButton } from '@/components/audit/RevertButton';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { SearchInput } from '@/components/common/SearchInput';
import { LoadMoreButton } from '@/components/common/LoadMoreButton';

export default function AuditLogPage() {
  // @coupling useEffectiveUser returns impersonated user if active, real user otherwise
  const user = useEffectiveUser();
  // @boundary Audit visibility scoped: super_admins see all, others see only their entries
  const { isSuperAdmin, isReadOnly } = usePermissions();
  const { search, setSearch, debouncedSearch } = useDebouncedSearch();
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // @contract Empty filters object means "no filtering" — hook receives undefined when no keys set
  const filters: AuditFilters = {};
  if (actionFilter) filters.action = actionFilter;
  if (entityTypeFilter) filters.entityType = entityTypeFilter;
  // @edge Search requires >= 2 chars to avoid overly broad queries
  {
    /* v8 ignore start */
  }
  if (debouncedSearch.length >= 2) filters.search = debouncedSearch;
  {
    /* v8 ignore stop */
  }
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;
  // @invariant Non-super admins only see their own audit entries — enforced client-side.
  // @boundary Server also enforces this via RLS policy on admin_audit_log, so removing this
  // client filter would still show only own entries for non-super-admins.
  if (!isSuperAdmin && user?.id) filters.adminUserId = user.id;

  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useAdminAuditLog(Object.keys(filters).length ? filters : undefined); // @contract Passes undefined when no filters → hook fetches unfiltered
  const entries = data?.pages.flat() ?? [];

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {!isSuperAdmin && <p className="text-sm text-on-surface-muted">Showing your activity only</p>}

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          {isSuperAdmin && (
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by admin email, entity type, entity name..."
              isLoading={isFetching}
              className="flex-1 min-w-[200px]"
            />
          )}

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-input rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-red-600"
          >
            <option value="">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="sync">Sync</option>
          </select>

          <select
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
            className="bg-input rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-red-600"
          >
            <option value="">All Entity Types</option>
            {AUDIT_ENTITY_TYPES.map((et) => (
              <option key={et} value={et}>
                {et}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-input rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-red-600"
            />
            <span className="text-on-surface-subtle text-sm">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-input rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
        </div>

        {/* v8 ignore start */}
        {search.length === 1 && (
          <p className="text-xs text-on-surface-subtle">Type at least 2 characters to search</p>
        )}
        {/* v8 ignore stop */}
        {!isLoading && entries.length > 0 && (
          <p className="text-xs text-on-surface-subtle">
            Showing {entries.length} entr{entries.length !== 1 ? 'ies' : 'y'}
            {/* v8 ignore start */}
            {debouncedSearch ? ` matching "${debouncedSearch}"` : ''}
            {/* v8 ignore stop */}
          </p>
        )}
      </div>

      {isError && (
        <div className="bg-red-600/10 border border-red-600/30 rounded-lg px-4 py-3 text-sm text-status-red">
          {/* v8 ignore start */}
          Error loading audit log: {error instanceof Error ? error.message : 'Unknown error'}
          {/* v8 ignore stop */}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-on-surface-subtle animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20 text-on-surface-subtle">No audit log entries found.</div>
      ) : (
        <div className="bg-surface-card border border-outline rounded-xl overflow-hidden">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-outline">
                <th className="w-10 px-3 py-4" />
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Admin
                </th>
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Action
                </th>
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Entity Type
                </th>
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Entity
                </th>
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const action = actionStyles[entry.action] ?? actionStyles.update;
                const isExpanded = expandedRows.has(entry.id);
                return (
                  <Fragment key={entry.id}>
                    <tr
                      className="border-b border-outline-subtle hover:bg-surface-elevated transition-colors cursor-pointer"
                      onClick={() => toggleRow(entry.id)}
                    >
                      <td className="px-3 py-4 text-on-surface-disabled">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <span className="text-on-surface">
                            {entry.admin_display_name || entry.admin_email || 'Unknown'}
                          </span>
                          {entry.admin_display_name && entry.admin_email && (
                            <p className="text-on-surface-subtle text-xs">{entry.admin_email}</p>
                          )}
                          {/* @edge Impersonation trail: shows who the admin was acting as */}
                          {entry.impersonating_role && (
                            <p className="text-status-amber text-xs mt-0.5">
                              as{' '}
                              {entry.impersonating_display_name ||
                                entry.impersonating_email ||
                                ADMIN_ROLE_LABELS[entry.impersonating_role as AdminRoleId] ||
                                entry.impersonating_role}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${action.bg} ${action.text}`}
                        >
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-on-surface-muted text-sm">
                        {entry.entity_type}
                      </td>
                      <td className="px-6 py-4">
                        {/* @edge Shows human-readable name from details or DB-resolved display name; falls back to truncated ID */}
                        <span className="text-on-surface text-sm">
                          {entry.entity_display_name ??
                            getEntityDisplayName(entry.entity_type, entry.details) ??
                            (entry.entity_id ? `${entry.entity_id.slice(0, 8)}...` : '—')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-on-surface-muted text-sm">
                        {formatDateTime(entry.created_at)}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${entry.id}-details`} className="border-b border-outline-subtle">
                        <td colSpan={6} className="px-6 py-4 bg-surface">
                          <div className="space-y-3">
                            <p className="text-xs font-medium text-on-surface-subtle uppercase tracking-wider">
                              {entry.action === 'update' ? 'Changes' : 'Details'}
                            </p>
                            <div className="overflow-x-auto max-h-60 rounded-lg">
                              <pre className="text-sm text-on-surface-muted bg-surface-elevated p-4 font-mono whitespace-pre w-max min-w-full">
                                {formatDetails(entry.action, entry.details)}
                              </pre>
                            </div>
                            {!isReadOnly && canRevert(entry.action, entry.details) && (
                              <RevertButton
                                entryId={entry.id}
                                action={entry.action}
                                revertedAt={entry.reverted_at}
                                revertedByName={
                                  entry.reverted_by_display_name ?? entry.reverted_by_email
                                }
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
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
