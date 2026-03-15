'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/** @contract maps route paths to [sectionLabel, pageLabel] for breadcrumb display */
const ROUTE_BREADCRUMB_MAP: Record<string, { section: string | null; page: string }> = {
  '/': { section: null, page: 'Dashboard' },
  '/movies': { section: 'Content', page: 'Movies' },
  '/theaters': { section: 'Content', page: 'In Theaters' },
  '/cast': { section: 'Content', page: 'Cast/Actors' },
  '/production-houses': { section: 'Content', page: 'Production Houses' },
  '/ott': { section: 'Content', page: 'OTT Releases' },
  '/platforms': { section: 'Content', page: 'Platforms' },
  '/surprise': { section: 'Content', page: 'Surprise Content' },
  '/feed': { section: 'Content', page: 'News Feed' },
  '/notifications': { section: 'Content', page: 'Notifications' },
  '/reviews': { section: 'Moderation', page: 'Reviews' },
  '/comments': { section: 'Moderation', page: 'Comments' },
  '/sync': { section: 'System', page: 'Sync' },
  '/audit': { section: 'System', page: 'Audit Log' },
  '/app-users': { section: 'System', page: 'App Users' },
  '/users': { section: 'System', page: 'Admin Management' },
  '/profile': { section: null, page: 'Profile' },
};

/** @assumes pathname always starts with '/' */
function findBreadcrumb(pathname: string) {
  // Exact match first, then prefix match for sub-routes (e.g. /movies/123)
  if (ROUTE_BREADCRUMB_MAP[pathname]) return ROUTE_BREADCRUMB_MAP[pathname];
  const match = Object.keys(ROUTE_BREADCRUMB_MAP).find(
    (route) => route !== '/' && pathname.startsWith(route),
  );
  return match ? ROUTE_BREADCRUMB_MAP[match] : null;
}

export function Breadcrumb() {
  const pathname = usePathname();
  const breadcrumb = findBreadcrumb(pathname);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm select-none">
      <Link
        href="/"
        className="font-semibold tracking-widest uppercase text-on-surface-subtle hover:text-on-surface transition-colors"
      >
        Admin
      </Link>
      {breadcrumb?.section && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-on-surface-muted" />
          <span className="font-semibold tracking-widest uppercase text-on-surface-muted">
            {breadcrumb.section}
          </span>
        </>
      )}
      {breadcrumb && breadcrumb.page !== 'Dashboard' && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-on-surface-muted" />
          <span className="font-semibold tracking-widest uppercase text-on-surface">
            {breadcrumb.page}
          </span>
        </>
      )}
    </nav>
  );
}
