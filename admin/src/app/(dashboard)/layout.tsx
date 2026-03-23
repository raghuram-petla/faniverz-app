'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ImpersonationBar } from '@/components/layout/ImpersonationBar';
import { AccessDenied } from '@/components/common/AccessDenied';
import { ReadOnlyBanner } from '@/components/common/ReadOnlyBanner';
import { ImpersonationProvider } from '@/hooks/useImpersonation';
import { LanguageProvider } from '@/hooks/useLanguageContext';
import { useRouter, usePathname } from 'next/navigation';
import React, { useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { SidebarContext, useSidebarProvider } from '@/hooks/useSidebarState';
import { Loader2 } from 'lucide-react';
import type { AdminPage } from '@/hooks/usePermissions';

// @coupling: every new admin page route MUST be added here, otherwise it's accessible
// to all admin roles regardless of permissions. Missing a route from this map means
// the page silently bypasses role-based access control — getPageForRoute returns null,
// and DashboardContent renders the page without checking canViewPage.
const ROUTE_PAGE_MAP: Record<string, AdminPage> = {
  '/movies': 'movies',
  '/theaters': 'theaters',
  '/cast': 'cast',
  '/production-houses': 'production-houses',
  '/platforms': 'platforms',
  '/surprise': 'surprise',
  '/feed': 'feed',
  '/notifications': 'notifications',
  '/sync': 'sync',
  '/audit': 'audit',
  '/app-users': 'app-users',
  '/validations': 'validations',
  '/users': 'users',
};

function getPageForRoute(pathname: string): AdminPage | null {
  for (const [prefix, page] of Object.entries(ROUTE_PAGE_MAP)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return page;
  }
  return null;
}

// @contract Last path segments that create new resources — blocked for read-only viewers
const CREATE_SEGMENTS = new Set(['new', 'compose', 'invite']);

/** @coupling Must be rendered inside ImpersonationProvider — usePermissions reads impersonated role from context.
 *  If rendered outside, permissions resolve to the real user's role, bypassing impersonation. */
function DashboardContent({ children }: { children: React.ReactNode }) {
  const { canViewPage, isReadOnly } = usePermissions();
  const pathname = usePathname();
  const requiredPage = getPageForRoute(pathname);

  if (requiredPage && !canViewPage(requiredPage)) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-on-surface mb-2">Page Not Accessible</h2>
        <p className="text-on-surface-muted">You don&apos;t have permission to access this page.</p>
      </div>
    );
  }

  // @contract Block viewers from create/compose/invite pages
  const lastSegment = pathname.split('/').pop() ?? '';
  if (isReadOnly && CREATE_SEGMENTS.has(lastSegment)) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-on-surface mb-2">Read-Only Access</h2>
        <p className="text-on-surface-muted">Viewer role cannot create or modify content.</p>
      </div>
    );
  }

  return <>{children}</>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const { user, isLoading, isAccessDenied } = useAuth();
  const router = useRouter();
  const sidebarState = useSidebarProvider();

  // @sideeffect: redirects to /login via router.replace (not push), so the dashboard
  // URL is removed from browser history. After login, AuthProvider redirects back to '/'
  // (dashboard root), not the originally requested page — deep links to specific admin
  // pages are lost on session expiry.
  useEffect(() => {
    if (!isLoading && !user && !isAccessDenied) {
      router.replace('/login');
    }
  }, [isLoading, user, isAccessDenied, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="w-8 h-8 text-status-red animate-spin" />
      </div>
    );
  }

  if (isAccessDenied) {
    return <AccessDenied />;
  }

  if (!user) return null;

  // @invariant Provider nesting order matters: ImpersonationProvider must wrap LanguageProvider
  // so that language scoping respects the impersonated user's permissions, and both must wrap
  // QueryClientProvider's children so queries use the correct context.
  return (
    <QueryClientProvider client={queryClient}>
      <ImpersonationProvider>
        <LanguageProvider>
          <SidebarContext.Provider value={sidebarState}>
            <div className="flex min-h-screen bg-surface">
              <Sidebar />
              <div className="flex-1 flex flex-col">
                <Header />
                <ImpersonationBar />
                <ReadOnlyBanner />
                <main className="flex-1 p-6">
                  <DashboardContent>{children}</DashboardContent>
                </main>
              </div>
            </div>
          </SidebarContext.Provider>
        </LanguageProvider>
      </ImpersonationProvider>
    </QueryClientProvider>
  );
}
