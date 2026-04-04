'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useInviteAdmin } from '@/hooks/useAdminUsers';
import { useAdminProductionHouses } from '@/hooks/useAdminProductionHouses';
import { useAuth } from '@/components/providers/AuthProvider';
import { type AdminRoleId } from '@/lib/types';
import { usePermissions } from '@/hooks/usePermissions';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { useLanguageContext } from '@/hooks/useLanguageContext';
import {
  CheckboxListField,
  type CheckboxListFieldItem,
} from '@/components/users/CheckboxListField';
import { InviteSuccessCard } from '@/components/users/InviteSuccessCard';
import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';

// @contract: INVITABLE_ROLES must be a subset of admin_roles.id values in the database
// @invariant: displayed options are further filtered by canManageAdmin — users can only invite roles below their own
const INVITABLE_ROLES: { value: AdminRoleId; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin — Full access + user management' },
  { value: 'admin', label: 'Faniverz Admin — Full content access' },
  { value: 'production_house_admin', label: 'Production Admin — Scoped to production house(s)' },
  { value: 'viewer', label: 'Viewer — Read-only access to all data' },
];

export default function InviteAdminPage() {
  const { user } = useAuth();
  const { canManageAdmin } = usePermissions();
  const inviteAdmin = useInviteAdmin();
  const { languages } = useLanguageContext();

  // @invariant: memoized so availableRoles ref is stable across renders
  const availableRoles = useMemo(
    () => INVITABLE_ROLES.filter((r) => canManageAdmin(r.value)),
    [canManageAdmin],
  );

  const [email, setEmail] = useState('');
  // @sync: default to first available role — 'admin' may not be in availableRoles for non-super-admin users
  const [roleId, setRoleId] = useState<AdminRoleId>(
    /* v8 ignore start */
    (availableRoles[0]?.value as AdminRoleId) ?? 'viewer',
    /* v8 ignore stop */
  );

  // @contract: server-side search for production houses — phSearch drives the query
  const [phSearch, setPhSearch] = useState('');
  const { data: phData, isFetching: phLoading } = useAdminProductionHouses(
    phSearch,
    undefined,
    roleId === 'production_house_admin',
  );
  /* v8 ignore start */
  const phItems = useMemo(
    () =>
      (phData?.pages.flat() ?? []).map((ph) => ({
        id: ph.id,
        name: ph.name,
        imageUrl: ph.logo_url,
      })),
    [phData],
  );
  /* v8 ignore stop */
  const [selectedPHIds, setSelectedPHIds] = useState<string[]>([]);
  // @contract: tracks selected PH item data so they remain visible during server-side search
  const [selectedPHItems, setSelectedPHItems] = useState<CheckboxListFieldItem[]>([]);
  // @sync: selectedLanguageIds is cleared when role changes away from admin
  const [selectedLanguageIds, setSelectedLanguageIds] = useState<string[]>([]);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // @sync: sync roleId to first available role when auth context loads
  // @edge: roleId excluded from deps — only reacts to availableRoles changing
  const [defaultRole, setDefaultRole] = useState<AdminRoleId>(
    /* v8 ignore start */
    (availableRoles[0]?.value as AdminRoleId) ?? 'viewer',
    /* v8 ignore stop */
  );
  useEffect(() => {
    /* v8 ignore start */
    if (availableRoles.length > 0 && !availableRoles.some((r) => r.value === roleId)) {
      const firstRole = availableRoles[0].value as AdminRoleId;
      setRoleId(firstRole);
      setDefaultRole(firstRole);
    }
    /* v8 ignore stop */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableRoles]);

  const isDirty = useMemo(
    () =>
      !!(
        email.trim() ||
        selectedPHIds.length > 0 ||
        selectedLanguageIds.length > 0 ||
        roleId !== defaultRole
      ),
    [email, selectedPHIds, selectedLanguageIds, roleId, defaultRole],
  );
  useUnsavedChangesWarning(isDirty);

  const isPHRole = roleId === 'production_house_admin';
  const isAdminRole = roleId === 'admin';

  // @sideeffect: creates admin_invitations row with 7-day token, then displays invite link
  // @coupling: invite link format `?invite=<token>` must match login page's token detection.
  // The token is auto-accepted on Google OAuth sign-in via accept-invitation route.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !user?.id) return;
    if (isPHRole && selectedPHIds.length === 0) {
      alert('Please select at least one production house.');
      return;
    }
    if (isAdminRole && selectedLanguageIds.length === 0) {
      alert('Please select at least one language.');
      return;
    }

    try {
      const result = await inviteAdmin.mutateAsync({
        email: email.trim(),
        role_id: roleId,
        production_house_ids: isPHRole ? selectedPHIds : [],
        language_ids: isAdminRole ? selectedLanguageIds : [],
        invited_by: user.id,
      });
      // Generate invite link (the user signs in via Google OAuth, invitation is auto-accepted)
      setInviteLink(`${window.location.origin}/login?invite=${result.token}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create invitation');
    }
  }

  // @sideeffect: writes to system clipboard; "Copied" feedback auto-resets after 2 seconds
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteLink);
    } catch {
      // @edge: clipboard API may fail on non-HTTPS or without focus — ignore silently
    }
    setCopied(true);
    /* v8 ignore start */
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    /* v8 ignore stop */
  }

  function togglePH(phId: string) {
    setSelectedPHIds((prev) =>
      prev.includes(phId) ? prev.filter((id) => id !== phId) : [...prev, phId],
    );
    setSelectedPHItems((prev) => {
      if (prev.some((p) => p.id === phId)) return prev.filter((p) => p.id !== phId);
      const item = phItems.find((p) => p.id === phId);
      /* v8 ignore start -- fallback when toggled PH not in current phItems (race condition) */
      return item ? [...prev, item] : prev;
      /* v8 ignore stop */
    });
  }

  function toggleLanguage(langId: string) {
    setSelectedLanguageIds((prev) =>
      prev.includes(langId) ? prev.filter((id) => id !== langId) : [...prev, langId],
    );
  }

  if (inviteLink) {
    return (
      <InviteSuccessCard
        email={email}
        roleId={roleId}
        inviteLink={inviteLink}
        copied={copied}
        onCopy={handleCopy}
      />
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
                if (e.target.value !== 'production_house_admin') {
                  setSelectedPHIds([]);
                  setSelectedPHItems([]);
                  setPhSearch('');
                }
                if (e.target.value !== 'admin') setSelectedLanguageIds([]);
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
            <CheckboxListField
              label="Assign Production Houses"
              items={phItems}
              selectedIds={selectedPHIds}
              selectedItems={selectedPHItems}
              onToggle={togglePH}
              onSearch={setPhSearch}
              isLoading={phLoading}
              emptyMessage="No production houses available"
            />
          )}

          {isAdminRole && (
            <CheckboxListField
              label="Assign Languages"
              hint="(at least one required)"
              items={languages}
              selectedIds={selectedLanguageIds}
              onToggle={toggleLanguage}
              emptyMessage="No languages available"
            />
          )}

          <button
            type="submit"
            disabled={inviteAdmin.isPending || !email.trim()}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {/* v8 ignore start */}
            {inviteAdmin.isPending ? 'Creating...' : 'Create Invitation'}
            {/* v8 ignore stop */}
          </button>
        </form>
      </div>
    </div>
  );
}
