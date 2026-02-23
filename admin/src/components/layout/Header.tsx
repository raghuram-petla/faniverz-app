'use client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { LogOut, User } from 'lucide-react';

export function Header() {
  const { user, signOut } = useAdminAuth();

  return (
    <header className="h-16 bg-zinc-900 border-b border-white/10 flex items-center justify-between px-6">
      <h2 className="text-lg font-semibold text-white">Admin Panel</h2>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <User className="w-4 h-4 text-white/60" />
          </div>
          <span className="text-sm text-white/60">{user?.email ?? 'Admin'}</span>
        </div>
        <button
          onClick={signOut}
          className="p-2 rounded-lg text-white/40 hover:text-red-500 hover:bg-white/5 transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
