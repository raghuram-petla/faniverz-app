'use client';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Film,
  Plus,
  UserPlus,
  Newspaper,
  RefreshCw,
  Users,
  Star,
  MessageSquare,
  MessageCircle,
  Clapperboard,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  // @coupling usePermissions determines both stat scoping and quick-action visibility
  const { isPHAdmin, productionHouseIds, canViewPage } = usePermissions();
  // @boundary PH admins see only their production house stats; others see global counts
  const { data: stats, isLoading } = useDashboardStats(isPHAdmin ? productionHouseIds : undefined);

  const quickActions = [
    {
      label: 'Add Movie',
      href: '/movies/new',
      icon: Plus,
      color: 'text-status-red',
      bgColor: 'bg-red-600/20',
      show: true,
    },
    {
      label: 'In Theaters',
      href: '/theaters',
      icon: Clapperboard,
      color: 'text-status-orange',
      bgColor: 'bg-orange-600/20',
      show: canViewPage('theaters'),
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
      color: 'text-status-amber',
      bgColor: 'bg-amber-600/20',
      show: !isPHAdmin, // @invariant PH admins cannot create feed posts
    },
    {
      label: 'Trigger Sync',
      href: '/sync',
      icon: RefreshCw,
      color: 'text-status-blue',
      bgColor: 'bg-blue-600/20',
      show: canViewPage('sync'), // @invariant Sync restricted by role-based page access
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          {
            label: isPHAdmin ? 'My Movies' : 'Movies',
            value: stats?.totalMovies,
            icon: Film,
            color: 'text-status-red',
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
            color: 'text-status-blue',
            bg: 'bg-blue-600/20',
          },
          {
            label: 'Reviews',
            value: stats?.totalReviews,
            icon: Star,
            color: 'text-status-yellow',
            bg: 'bg-yellow-600/20',
          },
          {
            label: 'Feed Items',
            value: stats?.totalFeedItems,
            icon: MessageSquare,
            color: 'text-status-purple',
            bg: 'bg-purple-600/20',
          },
          {
            label: 'Comments',
            value: stats?.totalComments,
            icon: MessageCircle,
            color: 'text-cyan-500',
            bg: 'bg-cyan-600/20',
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
              {/* @edge Defaults to 0 when stats haven't loaded yet */}
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
