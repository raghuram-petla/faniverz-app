'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useInviteAdmin } from '@/hooks/useAdminUsers';
import { useAdminProductionHouses } from '@/hooks/useAdminProductionHouses';
import { useAuth } from '@/components/providers/AuthProvider';
import { ADMIN_ROLE_LABELS, type AdminRoleId } from '@/lib/types';
import { usePermissions } from '@/hooks/usePermissions';
import { ArrowLeft, Send, Copy, Check } from 'lucide-react';
import Link from 'next/link';

// @contract: INVITABLE_ROLES must be a subset of admin_roles.id values in the database
// @invariant: displayed options are further filtered by canManageAdmin — users can only invite roles below their own
const INVITABLE_ROLES: { value: AdminRoleId; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin — Full access + user management' },
  { value: 'admin', label: 'Admin — Full content access' },
  { value: 'production_house_admin', label: 'PH Admin — Scoped to production house(s)' },
];

export default function InviteAdminPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { canManageAdmin } = usePermissions();
  const inviteAdmin = useInviteAdmin();
  const { data: phData } = useAdminProductionHouses('');
  const availableRoles = INVITABLE_ROLES.filter((r) => canManageAdmin(r.value));
  const allHouses = phData?.pages.flat() ?? [];

  const [email, setEmail] = useState('');
  // @edge: defaults to 'admin' but if current user is admin (not super_admin), availableRoles may not include it
  const [roleId, setRoleId] = useState<AdminRoleId>('admin');
  // @sync: selectedPHIds is cleared when role changes away from production_house_admin
  const [selectedPHIds, setSelectedPHIds] = useState<string[]>([]);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const isPHRole = roleId === 'production_house_admin';

  // @sideeffect: creates an admin_invitations row with a token (expires in 7 days), then displays the invite link
  // @boundary: invite link points to /login?invite=<token> — AuthProvider auto-calls /api/accept-invitation on OAuth callback
  // @edge: PH admin role requires at least one production house selected; form validates client-side before submit
  // @assumes: user.id is always available (page is behind auth guard)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !user?.id) return;
    if (isPHRole && selectedPHIds.length === 0) {
      alert('Please select at least one production house.');
      return;
    }

    try {
      const result = await inviteAdmin.mutateAsync({
        email: email.trim(),
        role_id: roleId,
        production_house_ids: isPHRole ? selectedPHIds : [],
        invited_by: user.id,
      });
      // Generate invite link (the user signs in via Google OAuth, invitation is auto-accepted)
      setInviteLink(`${window.location.origin}/login?invite=${result.token}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create invitation');
    }
  }

  // @sideeffect: writes to system clipboard; "Copied" feedback auto-resets after 2 seconds
  function handleCopy() {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  }

  function togglePH(phId: string) {
    setSelectedPHIds((prev) =>
      prev.includes(phId) ? prev.filter((id) => id !== phId) : [...prev, phId],
    );
  }

  if (inviteLink) {
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
              <Check className="w-6 h-6 text-green-500" />
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
              onClick={handleCopy}
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

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link
        href="/users"
        className="flex items-center gap-2 text-on-surface-muted hover:text-on-surface text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Admin Management
      </Link>

      <div className="bg-surface-card border border-outline rounded-xl p-6">
        <h2 className="text-lg font-bold text-on-surface mb-4">Invite New Admin</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-input rounded-lg px-4 py-2 text-on-surface outline-none focus:ring-2 focus:ring-red-600 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Role</label>
            <select
              value={roleId}
              onChange={(e) => {
                setRoleId(e.target.value as AdminRoleId);
                if (e.target.value !== 'production_house_admin') setSelectedPHIds([]);
              }}
              className="w-full bg-input rounded-lg px-3 py-2 text-on-surface outline-none focus:ring-2 focus:ring-red-600 text-sm"
            >
              {availableRoles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {isPHRole && (
            <div>
              <label className="block text-sm font-medium text-on-surface mb-2">
                Assign Production Houses
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-outline rounded-lg p-3">
                {allHouses.length === 0 && (
                  <p className="text-sm text-on-surface-subtle">No production houses available</p>
                )}
                {allHouses.map((ph) => (
                  <label
                    key={ph.id}
                    className="flex items-center gap-3 cursor-pointer hover:bg-surface-elevated rounded-lg px-2 py-1.5"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPHIds.includes(ph.id)}
                      onChange={() => togglePH(ph.id)}
                      className="rounded border-outline accent-red-600"
                    />
                    <span className="text-sm text-on-surface">{ph.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={inviteAdmin.isPending || !email.trim()}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {inviteAdmin.isPending ? 'Creating...' : 'Create Invitation'}
          </button>
        </form>
      </div>
    </div>
  );
}
