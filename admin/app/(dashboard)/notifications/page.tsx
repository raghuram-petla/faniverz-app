'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  useAdminNotifications,
  useNotificationStats,
  useCancelNotification,
  useRetryNotification,
  useBulkRetryFailed,
  useBulkCancelPending,
} from '@/hooks/useAdminNotifications';
import { formatDateTime } from '@/lib/utils';

export default function NotificationsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const { data: notifications = [], isLoading } = useAdminNotifications({
    status: statusFilter || undefined,
    type: typeFilter || undefined,
  });
  const { data: stats } = useNotificationStats();
  const cancelNotification = useCancelNotification();
  const retryNotification = useRetryNotification();
  const bulkRetry = useBulkRetryFailed();
  const bulkCancel = useBulkCancelPending();

  const handleBulkRetry = () => {
    if (confirm('Retry all failed notifications?')) {
      bulkRetry.mutate();
    }
  };

  const handleBulkCancel = () => {
    if (confirm('Cancel all pending notifications?')) {
      bulkCancel.mutate();
    }
  };

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    sent: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };

  return (
    <div data-testid="notifications-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <Link
          href="/notifications/compose"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          Compose Notification
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats?.pending ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Sent Today</p>
          <p className="text-2xl font-bold text-green-600">{stats?.sentToday ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Failed Today</p>
          <p className="text-2xl font-bold text-red-600">{stats?.failedToday ?? 0}</p>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <select
          data-testid="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          data-testid="type-filter"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          <option value="watchlist_reminder">Watchlist Reminder</option>
          <option value="release_day">Release Day</option>
          <option value="ott_available">OTT Available</option>
          <option value="weekly_digest">Weekly Digest</option>
        </select>
        <button
          onClick={handleBulkRetry}
          disabled={bulkRetry.isPending}
          className="px-3 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-200 disabled:opacity-50"
        >
          Retry All Failed
        </button>
        <button
          onClick={handleBulkCancel}
          disabled={bulkCancel.isPending}
          className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 disabled:opacity-50"
        >
          Cancel All Pending
        </button>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table data-testid="notifications-table" className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Scheduled</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {notifications.map((notif: Record<string, unknown>) => {
                const profile = notif.profiles as Record<string, unknown> | null;
                const status = notif.status as string;
                return (
                  <tr key={notif.id as number} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{profile?.display_name as string}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100">
                        {notif.type as string}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{notif.title as string}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${statusColor[status] ?? 'bg-gray-100'}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {notif.scheduled_for ? formatDateTime(notif.scheduled_for as string) : '—'}
                    </td>
                    <td className="px-4 py-3 space-x-2">
                      {status === 'pending' && (
                        <button
                          onClick={() => cancelNotification.mutate(notif.id as number)}
                          className="text-red-600 hover:text-red-800 text-xs font-medium"
                        >
                          Cancel
                        </button>
                      )}
                      {status === 'failed' && (
                        <button
                          onClick={() => retryNotification.mutate(notif.id as number)}
                          className="text-orange-600 hover:text-orange-800 text-xs font-medium"
                        >
                          Retry
                        </button>
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
