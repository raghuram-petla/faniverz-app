'use client';

import { useState } from 'react';
import { useAdminAuditLog } from '@/hooks/useAdminAudit';
import { formatDateTime } from '@/lib/utils';

export default function AuditPage() {
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const { data: logs = [], isLoading } = useAdminAuditLog({
    action: actionFilter || undefined,
    entityType: entityFilter || undefined,
  });

  const actionColor: Record<string, string> = {
    create: 'bg-green-100 text-green-800',
    update: 'bg-blue-100 text-blue-800',
    delete: 'bg-red-100 text-red-800',
    sync: 'bg-purple-100 text-purple-800',
    status_change: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div data-testid="audit-page">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Audit Log</h1>

      <div className="flex gap-4 mb-4">
        <select
          data-testid="action-filter"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="sync">Sync</option>
          <option value="status_change">Status Change</option>
        </select>
        <select
          data-testid="entity-filter"
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Entities</option>
          <option value="movie">Movie</option>
          <option value="ott_release">OTT Release</option>
          <option value="platform">Platform</option>
          <option value="cast">Cast</option>
          <option value="notification">Notification</option>
        </select>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table data-testid="audit-table" className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Admin</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Action</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Entity</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Entity ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Changes</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log: Record<string, unknown>) => {
                const profile = log.profiles as Record<string, unknown> | null;
                const action = log.action as string;
                const changes = log.changes as Record<string, unknown> | null;
                return (
                  <tr key={log.id as number} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{profile?.display_name as string}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${actionColor[action] ?? 'bg-gray-100'}`}
                      >
                        {action}
                      </span>
                    </td>
                    <td className="px-4 py-3">{log.entity_type as string}</td>
                    <td className="px-4 py-3 text-gray-600">{log.entity_id as number}</td>
                    <td className="px-4 py-3">
                      {changes ? (
                        <details className="cursor-pointer">
                          <summary className="text-indigo-600 text-xs font-medium">
                            View changes
                          </summary>
                          <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-auto max-w-xs">
                            {JSON.stringify(changes, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {log.created_at ? formatDateTime(log.created_at as string) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
