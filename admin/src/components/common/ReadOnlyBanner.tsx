'use client';
import { Eye } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

// @contract Renders only when the effective user has viewer (read-only) role.
// Displayed below the header in the dashboard layout to make read-only state obvious.
export function ReadOnlyBanner() {
  const { isReadOnly } = usePermissions();

  if (!isReadOnly) return null;

  return (
    <div className="flex items-center gap-2 bg-amber-600/20 px-4 py-2 text-sm text-amber-400">
      <Eye className="h-4 w-4 shrink-0" />
      <span>You are in read-only mode. Changes are disabled.</span>
    </div>
  );
}
