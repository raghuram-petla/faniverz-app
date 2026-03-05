import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * POST /api/accept-invitation
 * Accepts a pending invitation for a user.
 * Verifies the caller's identity via the Supabase access token, then
 * uses the service role key to create admin_user_roles + admin_ph_assignments.
 */
export async function POST(req: NextRequest) {
  try {
    // Verify the caller's identity via their access token
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseAuth = createClient(supabaseUrl, anonKey);
    const {
      data: { user: authUser },
      error: authErr,
    } = await supabaseAuth.auth.getUser(token);
    if (authErr || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, userId } = await req.json();
    if (!email || !userId) {
      return NextResponse.json({ error: 'Missing email or userId' }, { status: 400 });
    }

    // Ensure the caller matches the claimed userId and email
    if (authUser.id !== userId || authUser.email?.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: 'Identity mismatch' }, { status: 403 });
    }

    // Find pending, non-expired invitation for this email
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
      .single();

    if (existingRole) {
      // Already has a role, mark invitation as accepted and return
      await supabaseAdmin
        .from('admin_invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);
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
    const phIds = invitation.production_house_ids as string[];
    if (phIds && phIds.length > 0) {
      const phRows = phIds.map((phId: string) => ({
        user_id: userId,
        production_house_id: phId,
        assigned_by: invitation.invited_by,
      }));
      await supabaseAdmin.from('admin_ph_assignments').insert(phRows);
    }

    // Mark invitation as accepted
    await supabaseAdmin
      .from('admin_invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);

    return NextResponse.json({ role: invitation.role_id });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
