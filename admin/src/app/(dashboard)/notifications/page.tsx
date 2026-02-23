'use client';

import { useState } from 'react';
import {
  useAdminNotifications,
  useCancelNotification,
  useRetryNotification,
  useBulkRetryFailed,
  useBulkCancelPending,
} from '@/hooks/useAdminNotifications';
import { formatDateTime } from '@/lib/utils';
import { Bell, RotateCcw, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

const statusStyles: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-600/20', text: 'text-yellow-400' },
  sent: { bg: 'bg-green-600/20', text: 'text-green-400' },
  failed: { bg: 'bg-red-600/20', text: 'text-red-400' },
  cancelled: { bg: 'bg-white/10', text: 'text-white/40' },
};

const typeStyles: Record<string, { bg: string; text: string }> = {
  release: { bg: 'bg-purple-600/20', text: 'text-purple-400' },
  watchlist: { bg: 'bg-blue-600/20', text: 'text-blue-400' },
  trending: { bg: 'bg-orange-600/20', text: 'text-orange-400' },
  reminder: { bg: 'bg-green-600/20', text: 'text-green-400' },
};

export default function NotificationsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const filters: { status?: string; type?: string } = {};
  if (statusFilter) filters.status = statusFilter;
  if (typeFilter) filters.type = typeFilter;

  const { data: notifications, isLoading } = useAdminNotifications(
    Object.keys(filters).length ? filters : undefined,
  );
  const cancelNotification = useCancelNotification();
  const retryNotification = useRetryNotification();
  const bulkRetry = useBulkRetryFailed();
  const bulkCancel = useBulkCancelPending();

  const handleCancel = (id: string) => {
    if (!confirm('Cancel this notification?')) return;
    cancelNotification.mutate(id);
  };

  const handleRetry = (id: string) => {
    retryNotification.mutate(id);
  };

  const handleBulkRetry = () => {
    if (!confirm('Retry all failed notifications? This will set them back to pending.')) return;
    bulkRetry.mutate();
  };

  const handleBulkCancel = () => {
    if (!confirm('Cancel all pending notifications? This cannot be undone.')) return;
    bulkCancel.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-600/20 flex items-center justify-center">
            <Bell className="w-5 h-5 text-yellow-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
        </div>
        <Link
          href="/notifications/compose"
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
        >
          <Bell className="w-4 h-4" />
          Compose
        </Link>
      </div>

      {/* Filters and Bulk Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
        >
          <option value="">All Types</option>
          <option value="release">Release</option>
          <option value="watchlist">Watchlist</option>
          <option value="trending">Trending</option>
          <option value="reminder">Reminder</option>
        </select>

        <div className="flex-1" />

        <button
          onClick={handleBulkRetry}
          disabled={bulkRetry.isPending}
          className="flex items-center gap-2 bg-zinc-800 border border-white/10 hover:bg-white/10 text-white/80 px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {bulkRetry.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RotateCcw className="w-4 h-4" />
          )}
          Retry All Failed
        </button>

        <button
          onClick={handleBulkCancel}
          disabled={bulkCancel.isPending}
          className="flex items-center gap-2 bg-zinc-800 border border-white/10 hover:bg-white/10 text-white/80 px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {bulkCancel.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          Cancel All Pending
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
        </div>
      ) : !notifications?.length ? (
        <div className="text-center py-20 text-white/40">No notifications found.</div>
      ) : (
        <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-sm font-medium text-white/60 px-6 py-4">Type</th>
                <th className="text-left text-sm font-medium text-white/60 px-6 py-4">Title</th>
                <th className="text-left text-sm font-medium text-white/60 px-6 py-4">Status</th>
                <th className="text-left text-sm font-medium text-white/60 px-6 py-4">
                  Scheduled For
                </th>
                <th className="text-right text-sm font-medium text-white/60 px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((notification) => {
                const status = statusStyles[notification.status] ?? statusStyles.cancelled;
                const type = typeStyles[notification.type] ?? typeStyles.release;
                return (
                  <tr
                    key={notification.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${type.bg} ${type.text}`}
                      >
                        {notification.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white font-medium">{notification.title}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}
                      >
                        {notification.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white/60 text-sm">
                      {formatDateTime(notification.scheduled_for)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {notification.status === 'pending' && (
                          <button
                            onClick={() => handleCancel(notification.id)}
                            disabled={cancelNotification.isPending}
                            className="p-2 text-white/40 hover:text-red-500 transition-colors disabled:opacity-50"
                            title="Cancel"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        {notification.status === 'failed' && (
                          <button
                            onClick={() => handleRetry(notification.id)}
                            disabled={retryNotification.isPending}
                            className="p-2 text-white/40 hover:text-green-400 transition-colors disabled:opacity-50"
                            title="Retry"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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
