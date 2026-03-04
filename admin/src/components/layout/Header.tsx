'use client';
import { useAuth } from '@/components/providers/AuthProvider';
import { useTheme } from 'next-themes';
import { LogOut, User, Sun, Moon, Monitor } from 'lucide-react';

const THEME_CYCLE = ['system', 'light', 'dark'] as const;
const THEME_ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

export function Header() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const currentTheme = (theme ?? 'system') as (typeof THEME_CYCLE)[number];
  const Icon = THEME_ICONS[currentTheme] ?? Monitor;
  const nextTheme = THEME_CYCLE[(THEME_CYCLE.indexOf(currentTheme) + 1) % THEME_CYCLE.length];

  return (
    <header className="h-16 bg-surface-card border-b border-outline flex items-center justify-between px-6">
      <h2 className="text-lg font-semibold text-on-surface-subtle tracking-widest uppercase select-none">
        Admin
      </h2>
      <div className="flex items-center gap-4">
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
  );
}
