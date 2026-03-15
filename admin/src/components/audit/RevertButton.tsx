'use client';

import { useState } from 'react';
import { Undo2, Check } from 'lucide-react';
import { useRevertAuditEntry } from '@/hooks/useAdminAudit';
import { getRevertDescription } from '@/components/audit/auditUtils';
import { formatDateTime } from '@/lib/utils';

export interface RevertButtonProps {
  entryId: string;
  action: string;
  revertedAt: string | null;
  revertedByName: string | null;
}

// @contract Shows revert status if already reverted, otherwise shows revert button with confirm flow
export function RevertButton({ entryId, action, revertedAt, revertedByName }: RevertButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const revertMutation = useRevertAuditEntry();

  // @edge Already reverted — show status, not button
  if (revertedAt) {
    return (
      <div className="flex items-center gap-2 text-xs text-on-surface-subtle">
        <Check className="w-3.5 h-3.5 text-status-green" />
        <span>
          Reverted{revertedByName ? ` by ${revertedByName}` : ''} on {formatDateTime(revertedAt)}
        </span>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs text-status-amber">{getRevertDescription(action)}?</span>
        <button
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          disabled={revertMutation.isPending}
          onClick={(e) => {
            e.stopPropagation();
            revertMutation.mutate(entryId, {
              onSettled: () => setConfirming(false),
            });
          }}
        >
          {revertMutation.isPending ? 'Reverting...' : 'Confirm'}
        </button>
        <button
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-elevated text-on-surface-muted hover:text-on-surface"
          onClick={(e) => {
            e.stopPropagation();
            setConfirming(false);
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-elevated text-on-surface-muted hover:text-status-amber transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          setConfirming(true);
        }}
      >
        <Undo2 className="w-3.5 h-3.5" />
        Revert
      </button>
      {revertMutation.isError && (
        <span className="text-xs text-status-red">{revertMutation.error.message}</span>
      )}
    </div>
  );
}
