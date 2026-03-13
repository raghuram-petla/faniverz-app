'use client';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useImpersonation } from '@/hooks/useImpersonation';
import { useTheme } from 'next-themes';
import { LogOut, User, Sun, Moon, Monitor, Eye } from 'lucide-react';
import Link from 'next/link';
import { ADMIN_ROLE_LABELS } from '@/lib/types';
import { ImpersonateModal } from '@/components/users/ImpersonateModal';
import { getImageUrl } from '@shared/imageUrl';

const THEME_OPTIONS = [
  { key: 'system', icon: Monitor, label: 'System' },
  { key: 'light', icon: Sun, label: 'Light' },
  { key: 'dark', icon: Moon, label: 'Dark' },
] as const;

export function Header() {
  const { user, signOut } = useAuth();
  const { isImpersonating } = useImpersonation();
  const { theme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [imgError, setImgError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = user?.role === 'super_admin';
  const currentTheme = theme ?? 'system';

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <>
      <header className="h-16 bg-surface-card border-b border-outline flex items-center justify-between px-6">
        <h2 className="text-lg font-semibold text-on-surface-subtle tracking-widest uppercase select-none">
          Admin
        </h2>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-9 h-9 rounded-full bg-input flex items-center justify-center hover:ring-2 hover:ring-outline transition-all"
            aria-label="User menu"
          >
            {user?.avatar_url && !imgError ? (
              <img
                src={getImageUrl(user.avatar_url, 'sm') ?? user.avatar_url}
                alt="Avatar"
                className="w-9 h-9 rounded-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <User className="w-4 h-4 text-on-surface-muted" />
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-surface-card border border-outline rounded-xl shadow-xl z-50 py-1">
              <div className="px-4 py-3">
                <p className="text-sm text-on-surface font-medium truncate">
                  {user?.email ?? 'Admin'}
                </p>
                {user?.role && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-600/10 text-red-500 font-medium inline-block mt-1">
                    {ADMIN_ROLE_LABELS[user.role]}
                  </span>
                )}
              </div>
              <div className="border-t border-outline my-1" />
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-on-surface hover:bg-input transition-colors"
              >
                <User className="w-4 h-4" />
                Profile
              </Link>
              <div className="border-t border-outline my-1" />
              <div className="px-4 py-2.5">
                <p className="text-xs text-on-surface-muted mb-2">Theme</p>
                <div className="flex rounded-lg bg-input p-0.5 gap-0.5">
                  {THEME_OPTIONS.map(({ key, icon: Icon, label }) => (
                    <button
                      key={key}
                      onClick={() => setTheme(key)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        currentTheme === key
                          ? 'bg-surface-card text-on-surface shadow-sm'
                          : 'text-on-surface-muted hover:text-on-surface'
                      }`}
                      aria-label={`${label} theme`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {isSuperAdmin && !isImpersonating && (
                <button
                  onClick={() => {
                    setShowModal(true);
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-amber-500 hover:bg-input transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Impersonate
                </button>
              )}
              <div className="border-t border-outline my-1" />
              <button
                onClick={() => {
                  signOut();
                  setMenuOpen(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-input transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>
      {showModal && <ImpersonateModal targetUser={null} onClose={() => setShowModal(false)} />}
    </>
  );
}
