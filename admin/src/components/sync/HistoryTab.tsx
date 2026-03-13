'use client';

import { Fragment, useState, useMemo, useCallback } from 'react';
import { useAdminSyncLogs } from '@/hooks/useAdminSync';
import { formatDateTime } from '@/lib/utils';
import { formatDuration, statusStyles } from './syncHelpers';
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react';

/** @contract displays sync_logs table with status/function filters and expandable error details */
export function HistoryTab() {
  /** @coupling useAdminSyncLogs auto-refeshes when any log has status 'running' */
  const { data: logs, isLoading } = useAdminSyncLogs();
  const [statusFilter, setStatusFilter] = useState('');
  const [functionFilter, setFunctionFilter] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const hasRunning = logs?.some((l) => l.status === 'running');

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter((log) => {
      if (statusFilter && log.status !== statusFilter) return false;
      if (functionFilter && log.function_name !== functionFilter) return false;
      return true;
    });
  }, [logs, statusFilter, functionFilter]);

  /** @edge derives unique function names from loaded logs — changes if log history grows */
  const functionNames = useMemo(() => {
    if (!logs) return [];
    return [...new Set(logs.map((l) => l.function_name))].sort();
  }, [logs]);

  const toggleRow = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-input rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-red-600"
        >
          <option value="">All Statuses</option>
          <option value="running">Running</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={functionFilter}
          onChange={(e) => setFunctionFilter(e.target.value)}
          className="bg-input rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-red-600"
        >
          <option value="">All Functions</option>
          {functionNames.map((fn) => (
            <option key={fn} value={fn}>
              {fn}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        {hasRunning && (
          <span className="flex items-center gap-1.5 text-xs text-blue-400">
            <Loader2 className="w-3 h-3 animate-spin" /> Auto-refreshing
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-on-surface-subtle animate-spin" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-20 text-on-surface-subtle">No sync logs found.</div>
      ) : (
        <div className="bg-surface-card border border-outline rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline">
                <th className="w-10 px-3 py-4" />
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Function
                </th>
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Status
                </th>
                <th className="text-right text-sm font-medium text-on-surface-muted px-6 py-4">
                  Added
                </th>
                <th className="text-right text-sm font-medium text-on-surface-muted px-6 py-4">
                  Updated
                </th>
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Started
                </th>
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const status = statusStyles[log.status] ?? statusStyles.failed;
                const isExpanded = expandedRows.has(log.id);
                /** @edge log.errors can be array or object (JSONB column) — must handle both shapes */
                const hasErrors =
                  log.errors &&
                  typeof log.errors === 'object' &&
                  (Array.isArray(log.errors)
                    ? log.errors.length > 0
                    : Object.keys(log.errors).length > 0);

                return (
                  <Fragment key={log.id}>
                    <tr
                      className={`border-b border-outline-subtle hover:bg-surface-elevated transition-colors ${hasErrors ? 'cursor-pointer' : ''}`}
                      onClick={() => hasErrors && toggleRow(log.id)}
                    >
                      <td className="px-3 py-4 text-on-surface-disabled">
                        {hasErrors &&
                          (isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          ))}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-on-surface font-medium font-mono text-sm">
                          {log.function_name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}
                        >
                          {log.status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-on-surface-muted text-sm">
                        {log.movies_added}
                      </td>
                      <td className="px-6 py-4 text-right text-on-surface-muted text-sm">
                        {log.movies_updated}
                      </td>
                      <td className="px-6 py-4 text-on-surface-muted text-sm">
                        {formatDateTime(log.started_at)}
                      </td>
                      <td className="px-6 py-4 text-on-surface-muted text-sm">
                        {formatDuration(log.started_at, log.completed_at)}
                      </td>
                    </tr>
                    {isExpanded && hasErrors && (
                      <tr className="border-b border-outline-subtle">
                        <td colSpan={7} className="px-6 py-4 bg-surface">
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-on-surface-subtle uppercase tracking-wider">
                              Error Details
                            </p>
                            <pre className="text-sm text-on-surface-muted bg-surface-elevated rounded-lg p-4 overflow-x-auto max-h-60 font-mono">
                              {JSON.stringify(log.errors, null, 2)}
                            </pre>
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
    </div>
  );
}
