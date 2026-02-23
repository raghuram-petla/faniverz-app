'use client';

import { useAdminSyncLogs, useTriggerSync } from '@/hooks/useAdminSync';
import { formatDateTime } from '@/lib/utils';
import { RefreshCw, Play, Loader2 } from 'lucide-react';

const statusStyles: Record<string, { bg: string; text: string }> = {
  running: { bg: 'bg-blue-600/20', text: 'text-blue-400' },
  success: { bg: 'bg-green-600/20', text: 'text-green-400' },
  failed: { bg: 'bg-red-600/20', text: 'text-red-400' },
};

export default function SyncPage() {
  const { data: logs, isLoading } = useAdminSyncLogs();
  const triggerSync = useTriggerSync();

  const handleSync = (functionName: string) => {
    if (!confirm(`Run "${functionName}" sync now?`)) return;
    triggerSync.mutate(functionName);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Sync Management</h1>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => handleSync('sync-tmdb')}
          disabled={triggerSync.isPending}
          className="flex items-center gap-2 bg-zinc-900 border border-white/10 hover:bg-white/10 text-white px-5 py-3 rounded-xl transition-colors font-medium disabled:opacity-50"
        >
          {triggerSync.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Play className="w-5 h-5 text-blue-400" />
          )}
          Run TMDB Sync
        </button>

        <button
          onClick={() => handleSync('sync-ott-providers')}
          disabled={triggerSync.isPending}
          className="flex items-center gap-2 bg-zinc-900 border border-white/10 hover:bg-white/10 text-white px-5 py-3 rounded-xl transition-colors font-medium disabled:opacity-50"
        >
          {triggerSync.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Play className="w-5 h-5 text-purple-400" />
          )}
          Sync OTT Providers
        </button>
      </div>

      {triggerSync.isError && (
        <div className="bg-red-600/10 border border-red-600/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          {triggerSync.error instanceof Error ? triggerSync.error.message : 'Sync failed to start'}
        </div>
      )}

      {triggerSync.isSuccess && (
        <div className="bg-green-600/10 border border-green-600/30 rounded-lg px-4 py-3 text-green-400 text-sm">
          Sync triggered successfully. Refresh to see updated logs.
        </div>
      )}

      {/* Sync Logs Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
        </div>
      ) : !logs?.length ? (
        <div className="text-center py-20 text-white/40">
          No sync logs found. Run a sync to get started.
        </div>
      ) : (
        <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-sm font-medium text-white/60 px-6 py-4">Function</th>
                <th className="text-left text-sm font-medium text-white/60 px-6 py-4">Status</th>
                <th className="text-right text-sm font-medium text-white/60 px-6 py-4">Added</th>
                <th className="text-right text-sm font-medium text-white/60 px-6 py-4">Updated</th>
                <th className="text-left text-sm font-medium text-white/60 px-6 py-4">Started</th>
                <th className="text-left text-sm font-medium text-white/60 px-6 py-4">Completed</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const status = statusStyles[log.status] ?? statusStyles.failed;
                return (
                  <tr
                    key={log.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="text-white font-medium font-mono text-sm">
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
                    <td className="px-6 py-4 text-right text-white/60 text-sm">
                      {log.movies_added}
                    </td>
                    <td className="px-6 py-4 text-right text-white/60 text-sm">
                      {log.movies_updated}
                    </td>
                    <td className="px-6 py-4 text-white/60 text-sm">
                      {formatDateTime(log.started_at)}
                    </td>
                    <td className="px-6 py-4 text-white/60 text-sm">
                      {log.completed_at ? formatDateTime(log.completed_at) : '--'}
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
