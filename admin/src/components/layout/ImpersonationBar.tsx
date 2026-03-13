'use client';
import { useImpersonation } from '@/hooks/useImpersonation';
import { ADMIN_ROLE_LABELS } from '@/lib/types';
import { Eye, X } from 'lucide-react';

// @coupling useImpersonation — only renders when impersonation session is active
export function ImpersonationBar() {
  const { isImpersonating, effectiveUser, stopImpersonation } = useImpersonation();

  // @edge renders null when not impersonating — callers always mount this component
  if (!isImpersonating || !effectiveUser) return null;

  // @nullable display_name and email may both be absent; falls back to 'Unknown'
  const label = effectiveUser.display_name || effectiveUser.email || 'Unknown';
  const roleLabel = ADMIN_ROLE_LABELS[effectiveUser.role];

  return (
    <div className="bg-amber-600 text-white px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4" />
        <span>
          Impersonating: <strong>{label}</strong> <span className="opacity-80">({roleLabel})</span>
        </span>
      </div>
      <button
        onClick={stopImpersonation}
        className="flex items-center gap-1 bg-amber-700 hover:bg-amber-800 px-3 py-1 rounded text-xs font-medium transition-colors"
      >
        <X className="w-3 h-3" /> Stop
      </button>
    </div>
  );
}
