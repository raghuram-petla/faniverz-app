'use client';
import { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useImpersonation } from '@/hooks/useImpersonation';
import { useTheme } from 'next-themes';
import { LogOut, User, Sun, Moon, Monitor, Eye } from 'lucide-react';
import { ADMIN_ROLE_LABELS } from '@/lib/types';
import { ImpersonateModal } from '@/components/users/ImpersonateModal';

const THEME_CYCLE = ['system', 'light', 'dark'] as const;
const THEME_ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

export function Header() {
  const { user, signOut } = useAuth();
  const { isImpersonating } = useImpersonation();
  const { theme, setTheme } = useTheme();
  const [showModal, setShowModal] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';
  const currentTheme = (theme ?? 'system') as (typeof THEME_CYCLE)[number];
  const Icon = THEME_ICONS[currentTheme] ?? Monitor;
  const nextTheme = THEME_CYCLE[(THEME_CYCLE.indexOf(currentTheme) + 1) % THEME_CYCLE.length];

  return (
    <>
      <header className="h-16 bg-surface-card border-b border-outline flex items-center justify-between px-6">
        <h2 className="text-lg font-semibold text-on-surface-subtle tracking-widest uppercase select-none">
          Admin
        </h2>
        <div className="flex items-center gap-4">
          {isSuperAdmin && !isImpersonating && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-amber-500 hover:bg-amber-600/10 transition-colors"
              title="Impersonate a role or user"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Impersonate</span>
            </button>
          )}
          <button
            onClick={() => setTheme(nextTheme)}
            className="p-2 rounded-lg text-on-surface-subtle hover:text-on-surface hover:bg-surface-elevated transition-colors"
            title={`Theme: ${currentTheme}`}
          >
            <Icon className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-input flex items-center justify-center">
              <User className="w-4 h-4 text-on-surface-muted" />
            </div>
            <span className="text-sm text-on-surface-muted">{user?.email ?? 'Admin'}</span>
            {user?.role && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-600/10 text-red-500 font-medium">
                {ADMIN_ROLE_LABELS[user.role]}
              </span>
            )}
          </div>
          <button
            onClick={signOut}
            className="p-2 rounded-lg text-on-surface-subtle hover:text-red-500 hover:bg-surface-elevated transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>
      {showModal && <ImpersonateModal targetUser={null} onClose={() => setShowModal(false)} />}
    </>
  );
}
