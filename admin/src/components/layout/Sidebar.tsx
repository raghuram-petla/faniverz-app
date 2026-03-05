'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Film,
  Users,
  Building2,
  Tv,
  Layers,
  Sparkles,
  Bell,
  RefreshCw,
  FileText,
  Shield,
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import type { AdminPage } from '@/hooks/usePermissions';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  page: AdminPage;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, page: 'dashboard' },
  { href: '/movies', label: 'Movies', icon: Film, page: 'movies' },
  { href: '/cast', label: 'Cast/Actors', icon: Users, page: 'cast' },
  {
    href: '/production-houses',
    label: 'Production Houses',
    icon: Building2,
    page: 'production-houses',
  },
  { href: '/ott', label: 'OTT Releases', icon: Tv, page: 'ott' },
  { href: '/platforms', label: 'Platforms', icon: Layers, page: 'platforms' },
  { href: '/surprise', label: 'Surprise Content', icon: Sparkles, page: 'surprise' },
  { href: '/notifications', label: 'Notifications', icon: Bell, page: 'notifications' },
  { href: '/sync', label: 'Sync', icon: RefreshCw, page: 'sync' },
  { href: '/audit', label: 'Audit Log', icon: FileText, page: 'audit' },
  { href: '/users', label: 'User Management', icon: Shield, page: 'users' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { canViewPage } = usePermissions();

  const visibleItems = navItems.filter((item) => canViewPage(item.page));

  return (
    <aside className="w-64 bg-surface-card border-r border-outline min-h-screen p-4">
      <div className="flex justify-center mb-8">
        <Image
          src="/logo-full.png"
          alt="Faniverz"
          width={220}
          height={79}
          className="object-contain"
        />
      </div>

      <nav className="space-y-1">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-red-600 text-white'
                  : 'text-on-surface-muted hover:bg-surface-elevated hover:text-on-surface'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
