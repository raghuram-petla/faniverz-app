import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { verifyBearer, unauthorizedResponse } from '@/lib/sync-helpers';

/**
 * POST /api/accept-invitation
 * Accepts a pending invitation for a user.
 * Verifies the caller's identity via the Supabase access token, then
 * uses the service role key to create admin_user_roles + admin_ph_assignments.
 */
// @boundary: public-facing route — caller authenticates via Supabase access token, not admin role
// @contract: returns { role: string } on success; role is the role_id or 'existing'
// @sideeffect: inserts into admin_user_roles, admin_ph_assignments; updates admin_invitations status
// @edge: not transactional — if role insert succeeds but PH assignment fails, user has role but no PH scope
export async function POST(req: NextRequest) {
  try {
    // Verify the caller's identity via their access token
    // @coupling: verifyBearer uses Supabase anon client (not admin) — intentional for self-service flow
    const authUser = await verifyBearer(req.headers.get('authorization'));
    if (!authUser) {
      return unauthorizedResponse();
    }

    const { email, userId } = await req.json();
    if (!email || !userId) {
      return NextResponse.json({ error: 'Missing email or userId' }, { status: 400 });
    }

    // Ensure the caller matches the claimed userId and email
    // @invariant: caller can only accept invitations addressed to their own email
    if (authUser.id !== userId || authUser.email?.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: 'Identity mismatch' }, { status: 403 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Find pending, non-expired invitation for this email
    // @assumes: admin_invitations.email is stored lowercase; caller email is normalized above
    // @edge: multiple pending invitations for same email — takes most recent via order+limit
    const { data: invitation, error: inviteErr } = await supabaseAdmin
      .from('admin_invitations')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (inviteErr || !invitation) {
      return NextResponse.json({ error: 'No valid invitation found' }, { status: 404 });
    }

    // Check if user already has a role (shouldn't happen, but guard against duplicates)
    const { data: existingRole } = await supabaseAdmin
      .from('admin_user_roles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingRole) {
      // Already has a role, mark invitation as accepted and return
      const { error: updateErr } = await supabaseAdmin
        .from('admin_invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);
      if (updateErr) {
        return NextResponse.json({ error: 'Failed to update invitation' }, { status: 500 });
      }
      return NextResponse.json({ role: 'existing' });
    }

    // Create admin role assignment
    const { error: roleErr } = await supabaseAdmin.from('admin_user_roles').insert({
      user_id: userId,
      role_id: invitation.role_id,
      assigned_by: invitation.invited_by,
    });

    if (roleErr) {
      return NextResponse.json({ error: 'Failed to assign role' }, { status: 500 });
    }

    // Create PH assignments if applicable
    // @nullable: production_house_ids may be null/empty for roles that don't need PH scoping
    const phIds = invitation.production_house_ids as string[];
    if (phIds && phIds.length > 0) {
      const phRows = phIds.map((phId: string) => ({
        user_id: userId,
        production_house_id: phId,
        assigned_by: invitation.invited_by,
      }));
      const { error: phErr } = await supabaseAdmin.from('admin_ph_assignments').insert(phRows);
      if (phErr) {
        return NextResponse.json({ error: 'Failed to assign production houses' }, { status: 500 });
      }
    }

    // Mark invitation as accepted
    // @edge: if role insert succeeded but this update fails, user has role but invitation stays pending
    const { error: acceptErr } = await supabaseAdmin
      .from('admin_invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);
    if (acceptErr) {
      return NextResponse.json({ error: 'Failed to mark invitation accepted' }, { status: 500 });
    }

    return NextResponse.json({ role: invitation.role_id });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
