'use client';
import { useState } from 'react';
import { Ban, X } from 'lucide-react';
import type { AdminUserWithDetails } from '@/lib/types';
import { Button } from '@/components/common/Button';

/** @sideeffect onConfirm triggers admin_user_roles status update to 'blocked' with reason */
export interface BlockAdminModalProps {
  target: AdminUserWithDetails;
  /** @contract reason string is required (button disabled when empty) */
  onConfirm: (reason: string) => void;
  onClose: () => void;
  isPending: boolean;
}

export function BlockAdminModal({ target, onConfirm, onClose, isPending }: BlockAdminModalProps) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-surface-card rounded-xl p-6 w-full max-w-md border border-outline shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-status-red" />
            <h2 className="text-lg font-semibold text-on-surface">Block Admin</h2>
          </div>
          <button onClick={onClose} className="text-on-surface-subtle hover:text-on-surface">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-on-surface-muted mb-4">
          {/** @edge display_name may be null for users who haven't set a profile name */}
          Block <strong className="text-on-surface">{target.display_name || target.email}</strong>?
          They will immediately lose access to the admin panel. This can be reversed later.
        </p>

        <label className="block text-sm font-medium text-on-surface mb-1">
          Reason <span className="text-status-red">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this admin being blocked?"
          rows={3}
          className="w-full bg-input rounded-lg px-4 py-2 text-sm text-on-surface placeholder-on-surface-subtle outline-none focus:ring-2 focus:ring-red-600 resize-none mb-4"
        />

        <div className="flex gap-3 justify-end">
          {/* @contract ghost md = text-on-surface-muted hover:text-on-surface px-4 py-2 text-sm */}
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          {/* @contract primary md = bg-red-600 text-white px-4 py-2 text-sm rounded-lg */}
          <Button
            variant="primary"
            size="md"
            icon={<Ban className="w-4 h-4" />}
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim() || isPending}
          >
            {isPending ? 'Blocking…' : 'Block Admin'}
          </Button>
        </div>
      </div>
    </div>
  );
}
