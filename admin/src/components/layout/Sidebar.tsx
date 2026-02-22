'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/movies', label: 'Movies', icon: '🎬' },
  { href: '/ott', label: 'OTT Releases', icon: '📺' },
  { href: '/platforms', label: 'Platforms', icon: '🏢' },
  { href: '/cast', label: 'Cast & Crew', icon: '👥' },
  { href: '/notifications', label: 'Notifications', icon: '🔔' },
  { href: '/sync', label: 'Sync Logs', icon: '🔄' },
  { href: '/audit', label: 'Audit Log', icon: '📋' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside data-testid="sidebar" className="w-64 bg-gray-900 text-white min-h-screen p-4">
      <div className="mb-8">
        <h2 className="text-xl font-bold">Faniverz Admin</h2>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-800'
              )}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
