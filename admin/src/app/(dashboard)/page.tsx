'use client';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Film,
  Plus,
  UserPlus,
  Newspaper,
  Tv,
  RefreshCw,
  Users,
  Star,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { isPHAdmin, productionHouseIds, canViewPage } = usePermissions();
  const { data: stats, isLoading } = useDashboardStats(isPHAdmin ? productionHouseIds : undefined);

  const quickActions = [
    {
      label: 'Add Movie',
      href: '/movies/new',
      icon: Plus,
      color: 'text-red-500',
      bgColor: 'bg-red-600/20',
      show: true,
    },
    {
      label: 'Add Actor',
      href: '/cast',
      icon: UserPlus,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-600/20',
      show: true,
    },
    {
      label: 'Add Feed Post',
      href: '/feed/new',
      icon: Newspaper,
      color: 'text-amber-500',
      bgColor: 'bg-amber-600/20',
      show: !isPHAdmin,
    },
    {
      label: 'Add OTT Release',
      href: '/ott/new',
      icon: Tv,
      color: 'text-purple-500',
      bgColor: 'bg-purple-600/20',
      show: canViewPage('ott') && !isPHAdmin,
    },
    {
      label: 'Trigger Sync',
      href: '/sync',
      icon: RefreshCw,
      color: 'text-blue-500',
      bgColor: 'bg-blue-600/20',
      show: canViewPage('sync'),
    },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-on-surface">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          {
            label: isPHAdmin ? 'My Movies' : 'Movies',
            value: stats?.totalMovies,
            icon: Film,
            color: 'text-red-500',
            bg: 'bg-red-600/20',
          },
          {
            label: 'Actors',
            value: stats?.totalActors,
            icon: Users,
            color: 'text-emerald-500',
            bg: 'bg-emerald-600/20',
          },
          {
            label: 'Users',
            value: stats?.totalUsers,
            icon: UserPlus,
            color: 'text-blue-500',
            bg: 'bg-blue-600/20',
          },
          {
            label: 'Reviews',
            value: stats?.totalReviews,
            icon: Star,
            color: 'text-yellow-500',
            bg: 'bg-yellow-600/20',
          },
          {
            label: 'Feed Items',
            value: stats?.totalFeedItems,
            icon: MessageSquare,
            color: 'text-purple-500',
            bg: 'bg-purple-600/20',
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-surface-card border border-outline rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <span className="text-sm text-on-surface-muted">{card.label}</span>
              </div>
              {isLoading ? (
                <div className="h-9 w-16 bg-outline/30 rounded animate-pulse" />
              ) : (
                <p className="text-3xl font-bold text-on-surface">{card.value ?? 0}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickActions
          .filter((a) => a.show)
          .map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 bg-surface-card border border-outline rounded-xl p-4 hover:bg-surface-elevated transition-colors"
              >
                <div
                  className={`w-10 h-10 rounded-lg ${action.bgColor} flex items-center justify-center`}
                >
                  <Icon className={`w-5 h-5 ${action.color}`} />
                </div>
                <span className="font-medium text-on-surface">{action.label}</span>
              </Link>
            );
          })}
      </div>
    </div>
  );
}
