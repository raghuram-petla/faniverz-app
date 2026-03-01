'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Film,
  Users,
  Tv,
  Layers,
  Sparkles,
  Bell,
  RefreshCw,
  FileText,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/movies', label: 'Movies', icon: Film },
  { href: '/cast', label: 'Cast/Actors', icon: Users },
  { href: '/ott', label: 'OTT Releases', icon: Tv },
  { href: '/platforms', label: 'Platforms', icon: Layers },
  { href: '/surprise', label: 'Surprise Content', icon: Sparkles },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/sync', label: 'Sync', icon: RefreshCw },
  { href: '/audit', label: 'Audit Log', icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-zinc-900 border-r border-white/10 min-h-screen p-4">
      <div className="flex items-center gap-1 px-2 mb-8">
        <Image src="/logo-header.png" alt="Faniverz" width={40} height={40} />
        <span
          className="text-xl text-white tracking-wide"
          style={{ fontFamily: 'var(--font-exo2)' }}
        >
          Faniverz
        </span>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
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
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
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
