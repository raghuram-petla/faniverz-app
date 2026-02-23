'use client';

import { useState } from 'react';
import { useAdminAuditLog } from '@/hooks/useAdminAudit';
import { formatDateTime } from '@/lib/utils';
import { Shield, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

const actionStyles: Record<string, { bg: string; text: string }> = {
  create: { bg: 'bg-green-600/20', text: 'text-green-400' },
  update: { bg: 'bg-blue-600/20', text: 'text-blue-400' },
  delete: { bg: 'bg-red-600/20', text: 'text-red-400' },
  sync: { bg: 'bg-purple-600/20', text: 'text-purple-400' },
};

export default function AuditLogPage() {
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const filters: { action?: string; entityType?: string } = {};
  if (actionFilter) filters.action = actionFilter;
  if (entityTypeFilter) filters.entityType = entityTypeFilter;

  const { data: entries, isLoading } = useAdminAuditLog(
    Object.keys(filters).length ? filters : undefined,
  );

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

  // Derive unique entity types from the data for the filter dropdown
  const entityTypes = entries ? [...new Set(entries.map((e) => e.entity_type))].sort() : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-purple-500" />
        </div>
        <h1 className="text-2xl font-bold text-white">Audit Log</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
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
          className="bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
        >
          <option value="">All Entity Types</option>
          {entityTypes.map((et) => (
            <option key={et} value={et}>
              {et}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
        </div>
      ) : !entries?.length ? (
        <div className="text-center py-20 text-white/40">No audit log entries found.</div>
      ) : (
        <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="w-10 px-3 py-4" />
                <th className="text-left text-sm font-medium text-white/60 px-6 py-4">Admin</th>
                <th className="text-left text-sm font-medium text-white/60 px-6 py-4">Action</th>
                <th className="text-left text-sm font-medium text-white/60 px-6 py-4">
                  Entity Type
                </th>
                <th className="text-left text-sm font-medium text-white/60 px-6 py-4">Entity ID</th>
                <th className="text-left text-sm font-medium text-white/60 px-6 py-4">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const action = actionStyles[entry.action] ?? actionStyles.update;
                const isExpanded = expandedRows.has(entry.id);
                return (
                  <>
                    <tr
                      key={entry.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => toggleRow(entry.id)}
                    >
                      <td className="px-3 py-4 text-white/30">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white text-sm font-mono">
                          {entry.admin_user_id.slice(0, 8)}...
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${action.bg} ${action.text}`}
                        >
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white/60 text-sm">{entry.entity_type}</td>
                      <td className="px-6 py-4">
                        <span className="text-white/60 text-sm font-mono">
                          {entry.entity_id.slice(0, 8)}...
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white/60 text-sm">
                        {formatDateTime(entry.created_at)}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${entry.id}-details`} className="border-b border-white/5">
                        <td colSpan={6} className="px-6 py-4 bg-zinc-950">
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
                              Details
                            </p>
                            <pre className="text-sm text-white/70 bg-zinc-800 rounded-lg p-4 overflow-x-auto max-h-60 font-mono">
                              {JSON.stringify(entry.details, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
