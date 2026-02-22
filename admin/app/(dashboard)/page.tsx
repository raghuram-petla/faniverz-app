'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import Link from 'next/link';

interface DashboardStats {
  totalMovies: number;
  upcomingReleases: number;
  totalReviews: number;
  totalUsers: number;
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const [movies, upcoming, reviews, users] = await Promise.all([
    supabase.from('movies').select('id', { count: 'exact', head: true }),
    supabase
      .from('movies')
      .select('id', { count: 'exact', head: true })
      .gte('release_date', new Date().toISOString().split('T')[0])
      .neq('status', 'cancelled'),
    supabase.from('reviews').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
  ]);

  return {
    totalMovies: movies.count ?? 0,
    upcomingReleases: upcoming.count ?? 0,
    totalReviews: reviews.count ?? 0,
    totalUsers: users.count ?? 0,
  };
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  });

  const cards = [
    { label: 'Total Movies', value: stats?.totalMovies ?? 0 },
    { label: 'Upcoming Releases', value: stats?.upcomingReleases ?? 0 },
    { label: 'Total Reviews', value: stats?.totalReviews ?? 0 },
    { label: 'Total Users', value: stats?.totalUsers ?? 0 },
  ];

  return (
    <div data-testid="dashboard-page">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
          >
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {isLoading ? '...' : card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <Link
          href="/movies/new"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          Add Movie
        </Link>
        <Link
          href="/ott"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
        >
          Manage OTT Releases
        </Link>
        <Link
          href="/sync"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
        >
          Sync Logs
        </Link>
      </div>
    </div>
  );
}
