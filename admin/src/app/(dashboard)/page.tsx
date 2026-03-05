'use client';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { usePermissions } from '@/hooks/usePermissions';
import { Film, Users, MessageSquare, Bell, Plus, Tv, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { isPHAdmin, productionHouseIds, canViewPage } = usePermissions();
  const { data: stats } = useDashboardStats(isPHAdmin ? productionHouseIds : undefined);

  const statCards = [
    {
      label: isPHAdmin ? 'My Movies' : 'Total Movies',
      icon: Film,
      color: 'text-red-500',
      bgColor: 'bg-red-600/20',
      value: stats?.totalMovies ?? 0,
    },
    ...(!isPHAdmin
      ? [
          {
            label: 'Total Users',
            icon: Users,
            color: 'text-blue-500',
            bgColor: 'bg-blue-600/20',
            value: stats?.totalUsers ?? 0,
          },
        ]
      : []),
    {
      label: 'Reviews Today',
      icon: MessageSquare,
      color: 'text-green-500',
      bgColor: 'bg-green-600/20',
      value: stats?.reviewsToday ?? 0,
    },
    ...(!isPHAdmin
      ? [
          {
            label: 'Active Notifications',
            icon: Bell,
            color: 'text-yellow-500',
            bgColor: 'bg-yellow-600/20',
            value: stats?.activeNotifications ?? 0,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-on-surface">Dashboard</h1>

      <div className={`grid grid-cols-1 md:grid-cols-2 ${isPHAdmin ? '' : 'lg:grid-cols-4'} gap-4`}>
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-surface-card border border-outline rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-lg ${card.bgColor} flex items-center justify-center`}
                >
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <span className="text-sm text-on-surface-muted">{card.label}</span>
              </div>
              <p className="text-3xl font-bold text-on-surface">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className={`grid grid-cols-1 ${isPHAdmin ? '' : 'md:grid-cols-3'} gap-4`}>
        <Link
          href="/movies/new"
          className="flex items-center gap-3 bg-surface-card border border-outline rounded-xl p-4 hover:bg-surface-elevated transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center">
            <Plus className="w-5 h-5 text-red-500" />
          </div>
          <span className="font-medium text-on-surface">Add Movie</span>
        </Link>
        {canViewPage('ott') && !isPHAdmin && (
          <Link
            href="/ott/new"
            className="flex items-center gap-3 bg-surface-card border border-outline rounded-xl p-4 hover:bg-surface-elevated transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
              <Tv className="w-5 h-5 text-purple-500" />
            </div>
            <span className="font-medium text-on-surface">Add OTT Release</span>
          </Link>
        )}
        {canViewPage('sync') && (
          <Link
            href="/sync"
            className="flex items-center gap-3 bg-surface-card border border-outline rounded-xl p-4 hover:bg-surface-elevated transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-blue-500" />
            </div>
            <span className="font-medium text-on-surface">Trigger Sync</span>
          </Link>
        )}
      </div>
    </div>
  );
}
