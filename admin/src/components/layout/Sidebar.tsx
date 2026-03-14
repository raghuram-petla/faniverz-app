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
  Newspaper,
  Bell,
  Star,
  MessageSquare,
  RefreshCw,
  FileText,
  Shield,
  UsersRound,
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

interface NavSection {
  label: string | null;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: null,
    items: [{ href: '/', label: 'Dashboard', icon: LayoutDashboard, page: 'dashboard' }],
  },
  {
    label: 'Content',
    items: [
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
      { href: '/feed', label: 'News Feed', icon: Newspaper, page: 'feed' },
      { href: '/notifications', label: 'Notifications', icon: Bell, page: 'notifications' },
    ],
  },
  {
    label: 'Moderation',
    items: [
      { href: '/reviews', label: 'Reviews', icon: Star, page: 'reviews' },
      { href: '/comments', label: 'Comments', icon: MessageSquare, page: 'comments' },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/sync', label: 'Sync', icon: RefreshCw, page: 'sync' },
      { href: '/audit', label: 'Audit Log', icon: FileText, page: 'audit' },
      { href: '/app-users', label: 'App Users', icon: UsersRound, page: 'app-users' },
      { href: '/users', label: 'User Management', icon: Shield, page: 'users' },
    ],
  },
];

// @boundary filters nav items by role-based permissions; unauthorized pages never render
export function Sidebar() {
  const pathname = usePathname();
  const { canViewPage } = usePermissions();

  // @coupling usePermissions — empty sections are pruned so they don't show headers with no links
  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canViewPage(item.page)),
    }))
    .filter((section) => section.items.length > 0);

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

      <nav className="space-y-4">
        {visibleSections.map((section, idx) => (
          <div key={section.label ?? idx}>
            {section.label && (
              <p className="px-3 py-1.5 mt-4 mb-2 text-[11px] font-bold uppercase tracking-widest text-on-surface bg-red-600/10 border-l-2 border-red-600 rounded-r-md">
                {section.label}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                // @edge dashboard ('/') only matches exact path; other routes match prefixes
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
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
