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
  Clapperboard,
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useSidebarState } from '@/hooks/useSidebarState';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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
      { href: '/theaters', label: 'In Theaters', icon: Clapperboard, page: 'theaters' },
      { href: '/cast', label: 'Artists', icon: Users, page: 'cast' },
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
      { href: '/users', label: 'Admin Management', icon: Shield, page: 'users' },
    ],
  },
];

// @boundary filters nav items by role-based permissions; unauthorized pages never render
export function Sidebar() {
  const pathname = usePathname();
  const { canViewPage } = usePermissions();
  const { collapsed, toggle } = useSidebarState();

  // @coupling usePermissions — empty sections are pruned so they don't show headers with no links
  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canViewPage(item.page)),
    }))
    .filter((section) => section.items.length > 0);

  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <aside
      className={`${collapsed ? 'w-[68px]' : 'w-64'} bg-surface-card border-r border-outline min-h-screen p-4 flex flex-col transition-[width] duration-200`}
    >
      {/* @contract logo swaps between full image and compact icon based on collapsed state */}
      {/* @invariant fixed h-[79px] keeps nav items at same vertical position in both states */}
      <div className="flex justify-center items-start mb-0 h-[79px]">
        {collapsed ? (
          <Image
            src="/logo-header.png"
            alt="Faniverz"
            width={36}
            height={36}
            className="object-contain"
          />
        ) : (
          <Image
            src="/logo-full.png"
            alt="Faniverz"
            width={220}
            height={79}
            className="object-contain"
          />
        )}
      </div>

      <button
        onClick={toggle}
        className={`mb-2 flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-on-surface-muted hover:bg-surface-elevated hover:text-on-surface transition-colors w-full`}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ToggleIcon className="w-5 h-5 shrink-0" />
        {!collapsed && <span className="text-sm font-medium">Collapse</span>}
      </button>

      <nav className="space-y-4 flex-1">
        {visibleSections.map((section, idx) => (
          <div key={section.label ?? idx}>
            {section.label && (
              <div className="mt-5 mb-3">
                <div className="border-t border-outline" />
                <p className="px-3 mt-3 text-xs font-extrabold uppercase tracking-[0.2em] text-on-surface-muted">
                  {collapsed ? section.label?.[0] : section.label}
                </p>
              </div>
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
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-red-600 text-white'
                        : 'text-on-surface-muted hover:bg-surface-elevated hover:text-on-surface'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {!collapsed && item.label}
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
