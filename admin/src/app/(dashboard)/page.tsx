'use client';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { Film, Users, MessageSquare, Bell, Plus, Tv, RefreshCw } from 'lucide-react';
import Link from 'next/link';

const statCards = [
  { label: 'Total Movies', icon: Film, color: 'text-red-500', bgColor: 'bg-red-600/20' },
  { label: 'Total Users', icon: Users, color: 'text-blue-500', bgColor: 'bg-blue-600/20' },
  {
    label: 'Reviews Today',
    icon: MessageSquare,
    color: 'text-green-500',
    bgColor: 'bg-green-600/20',
  },
  {
    label: 'Active Notifications',
    icon: Bell,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-600/20',
  },
];

export default function DashboardPage() {
  const { data: stats } = useDashboardStats();
  const values = [
    stats?.totalMovies ?? 0,
    stats?.totalUsers ?? 0,
    stats?.reviewsToday ?? 0,
    stats?.activeNotifications ?? 0,
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-zinc-900 border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-lg ${card.bgColor} flex items-center justify-center`}
                >
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <span className="text-sm text-white/60">{card.label}</span>
              </div>
              <p className="text-3xl font-bold text-white">{values[i]}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/movies/new"
          className="flex items-center gap-3 bg-zinc-900 border border-white/10 rounded-xl p-4 hover:bg-white/5 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center">
            <Plus className="w-5 h-5 text-red-500" />
          </div>
          <span className="font-medium text-white">Add Movie</span>
        </Link>
        <Link
          href="/ott/new"
          className="flex items-center gap-3 bg-zinc-900 border border-white/10 rounded-xl p-4 hover:bg-white/5 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
            <Tv className="w-5 h-5 text-purple-500" />
          </div>
          <span className="font-medium text-white">Add OTT Release</span>
        </Link>
        <Link
          href="/sync"
          className="flex items-center gap-3 bg-zinc-900 border border-white/10 rounded-xl p-4 hover:bg-white/5 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-blue-500" />
          </div>
          <span className="font-medium text-white">Trigger Sync</span>
        </Link>
      </div>
    </div>
  );
}
