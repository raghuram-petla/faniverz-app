'use client';

import { useAdminSyncLogs, useTriggerSync } from '@/hooks/useAdminSync';
import { formatDateTime } from '@/lib/utils';

export default function SyncPage() {
  const { data: logs = [], isLoading } = useAdminSyncLogs();
  const triggerSync = useTriggerSync();

  const statusColor: Record<string, string> = {
    running: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };

  return (
    <div data-testid="sync-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sync Logs</h1>
        <div className="flex gap-2">
          <button
            onClick={() => triggerSync.mutate('sync-tmdb-movies')}
            disabled={triggerSync.isPending}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {triggerSync.isPending ? 'Syncing...' : 'Sync TMDB Movies'}
          </button>
          <button
            onClick={() => triggerSync.mutate('sync-ott-providers')}
            disabled={triggerSync.isPending}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
          >
            Sync OTT Providers
          </button>
        </div>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table data-testid="sync-table" className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Function</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Added</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Updated</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Started</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Completed</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Errors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log: Record<string, unknown>) => {
                const status = log.status as string;
                const errors = log.errors as Record<string, unknown>[] | null;
                return (
                  <tr key={log.id as number} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{log.function_name as string}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${statusColor[status] ?? 'bg-gray-100'}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{(log.movies_added as number) ?? 0}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {(log.movies_updated as number) ?? 0}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {log.started_at ? formatDateTime(log.started_at as string) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {log.completed_at ? formatDateTime(log.completed_at as string) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {errors && errors.length > 0 ? (
                        <span className="text-red-600">{errors.length} errors</span>
                      ) : (
                        '—'
                      )}
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
