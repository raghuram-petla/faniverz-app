import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Copy } from 'lucide-react';
import { ADMIN_ROLE_LABELS, type AdminRoleId } from '@/lib/types';

// @contract: props interface for InviteSuccessCard — displayed after a successful admin invitation
export interface InviteSuccessCardProps {
  email: string;
  roleId: AdminRoleId;
  inviteLink: string;
  copied: boolean;
  onCopy: () => void;
}

/**
 * @contract: renders the post-invite success view with invite link and copy button
 * @assumes: inviteLink is a fully-formed URL ready for clipboard copy
 */
export function InviteSuccessCard({
  email,
  roleId,
  inviteLink,
  copied,
  onCopy,
}: InviteSuccessCardProps) {
  const router = useRouter();

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link
        href="/users"
        className="flex items-center gap-2 text-on-surface-muted hover:text-on-surface text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Admin Management
      </Link>

      <div className="bg-surface-card border border-outline rounded-xl p-6 space-y-4">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-green-600/20 flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6 text-status-green" />
          </div>
          <h2 className="text-lg font-bold text-on-surface">Invitation Created</h2>
          <p className="text-sm text-on-surface-muted mt-1">
            Share this link with <strong>{email}</strong> to grant them access.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={inviteLink}
            className="flex-1 bg-input rounded-lg px-4 py-2 text-sm text-on-surface font-mono"
          />
          <button
            onClick={onCopy}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <p className="text-xs text-on-surface-subtle">
          This link expires in 7 days. The invitee signs in with their Google account and will
          automatically receive the <strong>{ADMIN_ROLE_LABELS[roleId]}</strong> role.
        </p>

        <button
          onClick={() => router.push('/users')}
          className="w-full bg-input hover:bg-input-hover text-on-surface px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Back to Admin Management
        </button>
      </div>
    </div>
  );
}
