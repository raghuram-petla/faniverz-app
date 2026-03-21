'use client';
import { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useLanguageContext } from '@/hooks/useLanguageContext';
import { useEffectiveUser } from '@/hooks/useImpersonation';

/**
 * @contract Language switcher dropdown for movie content language scoping.
 * Visible to root/super_admin (all languages + "All") and multi-language admin users.
 * Hidden for single-language admin, PH admin, and viewer roles.
 */
export function LanguageSwitcher() {
  const user = useEffectiveUser();
  const { selectedLanguageId, setSelectedLanguageId, showSwitcher, availableLanguages } =
    useLanguageContext();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isSuperAdmin = user?.role === 'root' || user?.role === 'super_admin';

  // @sideeffect Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!showSwitcher) return null;

  const selectedLang = availableLanguages.find((l) => l.id === selectedLanguageId);
  const label = selectedLang?.name ?? 'All';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-input hover:bg-outline text-sm font-medium text-on-surface transition-colors"
        aria-label="Switch content language"
      >
        <Globe className="w-4 h-4 text-on-surface-muted" />
        <span>{label}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-surface-card border border-outline rounded-xl shadow-xl z-50 py-1">
          {/* @edge "All" option only for root/super_admin */}
          {isSuperAdmin && (
            <button
              onClick={() => {
                setSelectedLanguageId(null);
                setOpen(false);
              }}
              className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                selectedLanguageId === null
                  ? 'bg-red-600/10 text-status-red font-medium'
                  : 'text-on-surface hover:bg-input'
              }`}
            >
              All Languages
            </button>
          )}
          {availableLanguages.map((lang) => (
            <button
              key={lang.id}
              onClick={() => {
                setSelectedLanguageId(lang.id);
                setOpen(false);
              }}
              className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                selectedLanguageId === lang.id
                  ? 'bg-red-600/10 text-status-red font-medium'
                  : 'text-on-surface hover:bg-input'
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
