'use client';
import { ShieldX } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';

export function AccessDenied() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="text-center max-w-md mx-auto px-6">
        <ShieldX className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-on-surface mb-2">Access Denied</h1>
        <p className="text-on-surface-muted mb-6">
          You don&apos;t have access to Faniverz Admin. If you believe this is an error, please
          contact your administrator.
        </p>
        <button
          onClick={signOut}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
