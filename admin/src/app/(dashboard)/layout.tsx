'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ImpersonationBar } from '@/components/layout/ImpersonationBar';
import { AccessDenied } from '@/components/common/AccessDenied';
import { ImpersonationProvider } from '@/hooks/useImpersonation';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Loader2 } from 'lucide-react';
import type { AdminPage } from '@/hooks/usePermissions';

/** Map route prefixes to AdminPage for route-level permission checks */
const ROUTE_PAGE_MAP: Record<string, AdminPage> = {
  '/movies': 'movies',
  '/cast': 'cast',
  '/production-houses': 'production-houses',
  '/ott': 'ott',
  '/platforms': 'platforms',
  '/surprise': 'surprise',
  '/feed': 'feed',
  '/notifications': 'notifications',
  '/sync': 'sync',
  '/audit': 'audit',
  '/app-users': 'app-users',
  '/users': 'users',
};

function getPageForRoute(pathname: string): AdminPage | null {
  for (const [prefix, page] of Object.entries(ROUTE_PAGE_MAP)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return page;
  }
  return null;
}

/** Inner layout that uses usePermissions (must be inside ImpersonationProvider) */
function DashboardContent({ children }: { children: React.ReactNode }) {
  const { canViewPage } = usePermissions();
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

  return <>{children}</>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const { user, isLoading, isAccessDenied } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user && !isAccessDenied) {
      router.replace('/login');
    }
  }, [isLoading, user, isAccessDenied, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );
  }

  if (isAccessDenied) {
    return <AccessDenied />;
  }

  if (!user) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ImpersonationProvider>
        <div className="flex min-h-screen bg-surface">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Header />
            <ImpersonationBar />
            <main className="flex-1 p-6">
              <DashboardContent>{children}</DashboardContent>
            </main>
          </div>
        </div>
      </ImpersonationProvider>
    </QueryClientProvider>
  );
}
