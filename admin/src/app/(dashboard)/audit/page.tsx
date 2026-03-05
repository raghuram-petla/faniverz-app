'use client';

import { Fragment, useState, useEffect } from 'react';
import { useAdminAuditLog, type AuditFilters } from '@/hooks/useAdminAudit';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/components/providers/AuthProvider';
import { AUDIT_ENTITY_TYPES } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { Shield, ChevronDown, ChevronRight, Loader2, Search } from 'lucide-react';

/** For updates, compute only the fields that changed between old and new */
function getChangedFields(details: Record<string, unknown>): Record<string, unknown> | null {
  const old = details.old as Record<string, unknown> | undefined;
  const newVal = details.new as Record<string, unknown> | undefined;
  if (!old || !newVal) return null;

  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(newVal)) {
    if (JSON.stringify(old[key]) !== JSON.stringify(newVal[key])) {
      changes[key] = { from: old[key], to: newVal[key] };
    }
  }
  return Object.keys(changes).length > 0 ? changes : null;
}

/** Format details for display — show diff for updates, relevant data for create/delete */
function formatDetails(action: string, details: Record<string, unknown>): string {
  if (action === 'update') {
    const diff = getChangedFields(details);
    if (diff) return JSON.stringify(diff, null, 2);
  }
  if (action === 'create' && details.new) {
    return JSON.stringify(details.new, null, 2);
  }
  if (action === 'delete' && details.old) {
    return JSON.stringify(details.old, null, 2);
  }
  return JSON.stringify(details, null, 2);
}

const actionStyles: Record<string, { bg: string; text: string }> = {
  create: { bg: 'bg-green-600/20', text: 'text-green-400' },
  update: { bg: 'bg-blue-600/20', text: 'text-blue-400' },
  delete: { bg: 'bg-red-600/20', text: 'text-red-400' },
  sync: { bg: 'bg-purple-600/20', text: 'text-purple-400' },
};

export default function AuditLogPage() {
  const { user } = useAuth();
  const { isSuperAdmin } = usePermissions();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  const filters: AuditFilters = {};
  if (actionFilter) filters.action = actionFilter;
  if (entityTypeFilter) filters.entityType = entityTypeFilter;
  if (debouncedSearch.length >= 2) filters.search = debouncedSearch;
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;
  // Non-super admins only see their own audit entries
  if (!isSuperAdmin && user?.id) filters.adminUserId = user.id;

  const { data, isLoading, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useAdminAuditLog(Object.keys(filters).length ? filters : undefined);
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
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-purple-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Audit Log</h1>
          {!isSuperAdmin && (
            <p className="text-sm text-on-surface-muted mt-0.5">Showing your activity only</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          {isSuperAdmin && (
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-subtle" />
              <input
                type="text"
                placeholder="Search by admin email, entity type, entity ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-input rounded-lg pl-10 pr-10 py-2 text-sm text-on-surface placeholder:text-on-surface-subtle outline-none focus:ring-2 focus:ring-red-600"
              />
              {isFetching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-subtle animate-spin" />
              )}
            </div>
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

        {search.length === 1 && (
          <p className="text-xs text-on-surface-subtle">Type at least 2 characters to search</p>
        )}
        {!isLoading && entries.length > 0 && (
          <p className="text-xs text-on-surface-subtle">
            Showing {entries.length} entr{entries.length !== 1 ? 'ies' : 'y'}
            {debouncedSearch ? ` matching "${debouncedSearch}"` : ''}
          </p>
        )}
      </div>

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
                  Entity ID
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
                        <span className="text-on-surface-muted text-sm font-mono">
                          {entry.entity_id ? `${entry.entity_id.slice(0, 8)}...` : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-on-surface-muted text-sm">
                        {formatDateTime(entry.created_at)}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${entry.id}-details`} className="border-b border-outline-subtle">
                        <td colSpan={6} className="px-6 py-4 bg-surface">
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-on-surface-subtle uppercase tracking-wider">
                              {entry.action === 'update' ? 'Changes' : 'Details'}
                            </p>
                            <div className="overflow-x-auto max-h-60 rounded-lg">
                              <pre className="text-sm text-on-surface-muted bg-surface-elevated p-4 font-mono whitespace-pre w-max min-w-full">
                                {formatDetails(entry.action, entry.details)}
                              </pre>
                            </div>
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
