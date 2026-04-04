import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { verifyAdmin, unauthorizedResponse, badRequest } from '@/lib/sync-helpers';

// @invariant: whitelist-only — PATCH accepts only these two fields, all others are silently dropped
const ALLOWED_FIELDS = ['avatar_url', 'display_name'] as const;

// @contract: returns { google_avatar_url: string | null } — the avatar from Google OAuth metadata
export async function GET(req: NextRequest) {
  try {
    const user = await verifyAdmin(req.headers.get('authorization'));
    if (!user) {
      return unauthorizedResponse();
    }

    // @nullable: avatar_url and picture may both be absent depending on OAuth provider
    // @coupling: field names come from Google OAuth user_metadata shape — 'avatar_url' (Supabase) or 'picture' (raw OIDC)
    const googleAvatarUrl =
      (user.user_metadata?.avatar_url as string) ?? (user.user_metadata?.picture as string) ?? null;

    return NextResponse.json({ google_avatar_url: googleAvatarUrl });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// @boundary: admin-only route — caller updates their own profile only (user.id derived from JWT, not from request body)
// @sideeffect: writes to profiles table via service role (bypasses RLS); auto-sets updated_at timestamp
export async function PATCH(req: NextRequest) {
  try {
    const user = await verifyAdmin(req.headers.get('authorization'));
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return badRequest('No valid fields to update');
    }

    updates.updated_at = new Date().toISOString();

    const supabaseAdmin = getSupabaseAdmin();
    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
