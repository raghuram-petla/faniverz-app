'use client';

import { useRouter } from 'next/navigation';
import { useCreateNotification } from '@/hooks/useAdminNotifications';
import { useAllMovies } from '@/hooks/useAdminMovies';
import { Bell, ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { ComposeForm } from '@/components/notifications/ComposeForm';

export default function ComposeNotificationPage() {
  const router = useRouter();
  const { data: movies } = useAllMovies();
  const createNotification = useCreateNotification();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          href="/notifications"
          className="p-2 text-on-surface-subtle hover:text-on-surface transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="w-10 h-10 rounded-lg bg-yellow-600/20 flex items-center justify-center">
          <Bell className="w-5 h-5 text-status-yellow" />
        </div>
        <h1 className="text-2xl font-bold text-on-surface">Compose Notification</h1>
      </div>

      <div className="flex items-center gap-3 bg-blue-600/10 border border-blue-600/30 rounded-lg p-4">
        <AlertTriangle className="w-5 h-5 text-status-blue flex-shrink-0" />
        <p className="text-sm text-on-surface-muted">
          Push notifications are sent via the <strong>send-push</strong> edge function. Broadcast
          mode fans out to all registered devices. Users must have the app installed with push
          permissions enabled.
        </p>
      </div>

      <ComposeForm
        movies={movies}
        createNotification={createNotification}
        onSuccess={() => router.push('/notifications')}
      />
    </div>
  );
}
