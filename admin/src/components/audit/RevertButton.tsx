'use client';

import { useState } from 'react';
import { Undo2, Check } from 'lucide-react';
import { useRevertAuditEntry } from '@/hooks/useAdminAudit';
import { getRevertDescription } from '@/components/audit/auditUtils';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/common/Button';

export interface RevertButtonProps {
  entryId: string;
  action: string;
  revertedAt: string | null;
  revertedByName: string | null;
}

// @contract Shows revert status if already reverted, otherwise shows revert button with confirm flow
// @sideeffect revert mutation calls /api/audit/revert which undoes the DB change recorded in audit_log
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
        {/* @contract primary sm = bg-red-600 text-white px-3 py-1 text-xs rounded */}
        <Button
          variant="primary"
          size="sm"
          disabled={revertMutation.isPending}
          onClick={(e) => {
            e.stopPropagation();
            revertMutation.mutate(entryId, {
              onSettled: () => setConfirming(false),
            });
          }}
        >
          {revertMutation.isPending ? 'Reverting...' : 'Confirm'}
        </Button>
        {/* @contract secondary sm = bg-surface-elevated text-on-surface-muted px-3 py-1 text-xs rounded */}
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setConfirming(false);
          }}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* @contract secondary sm with amber hover — uses Button base + override class */}
      <Button
        variant="secondary"
        size="sm"
        icon={<Undo2 className="w-3.5 h-3.5" />}
        className="hover:text-status-amber"
        onClick={(e) => {
          e.stopPropagation();
          setConfirming(true);
        }}
      >
        Revert
      </Button>
      {revertMutation.isError && (
        <span className="text-xs text-status-red">{revertMutation.error.message}</span>
      )}
    </div>
  );
}
