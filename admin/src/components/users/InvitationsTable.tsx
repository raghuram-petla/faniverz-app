'use client';
import { ADMIN_ROLE_LABELS } from '@/lib/types';
import type { AdminRoleId } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { Loader2, Clock, CheckCircle, XCircle } from 'lucide-react';

export interface InvitationsTableProps {
  invitations:
    | { id: string; email: string; role_id: AdminRoleId; status: string; created_at: string }[]
    | undefined;
  isLoading: boolean;
  onRevoke: (id: string) => void;
  isRevokePending: boolean;
}

export function InvitationsTable({
  invitations,
  isLoading,
  onRevoke,
  isRevokePending,
}: InvitationsTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-on-surface-subtle" />
      </div>
    );
  }

  return (
    <div className="bg-surface-card border border-outline rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-outline">
            {['Email', 'Role', 'Status', 'Invited'].map((h) => (
              <th key={h} className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                {h}
              </th>
            ))}
            <th className="text-right text-sm font-medium text-on-surface-muted px-6 py-4">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {invitations?.map((inv) => (
            <tr key={inv.id} className="border-b border-outline-subtle hover:bg-surface-elevated">
              <td className="px-6 py-4 text-sm text-on-surface">{inv.email}</td>
              <td className="px-6 py-4">
                <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-red-600/10 text-red-500">
                  {ADMIN_ROLE_LABELS[inv.role_id]}
                </span>
              </td>
              <td className="px-6 py-4">
                {inv.status === 'pending' && (
                  <span className="inline-flex items-center gap-1 text-yellow-400 text-xs font-medium">
                    <Clock className="w-3 h-3" /> Pending
                  </span>
                )}
                {inv.status === 'accepted' && (
                  <span className="inline-flex items-center gap-1 text-green-400 text-xs font-medium">
                    <CheckCircle className="w-3 h-3" /> Accepted
                  </span>
                )}
                {inv.status === 'revoked' && (
                  <span className="inline-flex items-center gap-1 text-red-400 text-xs font-medium">
                    <XCircle className="w-3 h-3" /> Revoked
                  </span>
                )}
              </td>
              <td className="px-6 py-4 text-sm text-on-surface-muted">
                {formatDateTime(inv.created_at)}
              </td>
              <td className="px-6 py-4 text-right">
                {inv.status === 'pending' && (
                  <button
                    onClick={() => onRevoke(inv.id)}
                    disabled={isRevokePending}
                    className="p-2 text-on-surface-subtle hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
          {(!invitations || invitations.length === 0) && (
            <tr>
              <td colSpan={5} className="text-center py-10 text-on-surface-subtle">
                No invitations yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
