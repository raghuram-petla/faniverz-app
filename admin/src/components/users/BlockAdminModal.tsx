'use client';
import { useState } from 'react';
import { Ban, X } from 'lucide-react';
import type { AdminUserWithDetails } from '@/lib/types';

export interface BlockAdminModalProps {
  target: AdminUserWithDetails;
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
            <Ban className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-on-surface">Block Admin</h2>
          </div>
          <button onClick={onClose} className="text-on-surface-subtle hover:text-on-surface">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-on-surface-muted mb-4">
          Block <strong className="text-on-surface">{target.display_name || target.email}</strong>?
          They will immediately lose access to the admin panel. This can be reversed later.
        </p>

        <label className="block text-sm font-medium text-on-surface mb-1">
          Reason <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this admin being blocked?"
          rows={3}
          className="w-full bg-input rounded-lg px-4 py-2 text-sm text-on-surface placeholder-on-surface-subtle outline-none focus:ring-2 focus:ring-red-600 resize-none mb-4"
        />

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-on-surface-muted hover:text-on-surface transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim() || isPending}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Ban className="w-4 h-4" />
            {isPending ? 'Blocking…' : 'Block Admin'}
          </button>
        </div>
      </div>
    </div>
  );
}
