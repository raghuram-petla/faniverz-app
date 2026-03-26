import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import { getAuditableSupabaseAdmin } from '@/lib/supabase-admin';
import {
  ensureAdminMutateAuth,
  verifyAdminCanMutate,
  errorResponse,
  viewerReadonlyResponse,
  unauthorizedResponse,
} from '@/lib/sync-helpers';

// @contract: shared context provided to every admin mutation route handler.
// The supabase client has the x-admin-user-id header set so the audit trigger
// attributes all DB changes to the authenticated admin.
export interface AdminRouteContext {
  req: NextRequest;
  supabase: SupabaseClient;
  auth: { user: User; role: string };
}

// @contract: extended context for sync routes that also need the TMDB API key.
export interface SyncRouteContext extends AdminRouteContext {
  apiKey: string;
}

// @boundary: wraps a sync mutation route with auth + TMDB key + auditable client.
// Handles ensureAdminMutateAuth boilerplate, creates the auditable Supabase client,
// and catches unhandled errors with a labeled errorResponse.
// @coupling: uses ensureAdminMutateAuth which rejects viewers and validates TMDB key.
export function withSyncAdmin(
  label: string,
  handler: (ctx: SyncRouteContext) => Promise<NextResponse>,
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    try {
      const guard = await ensureAdminMutateAuth(req.headers.get('authorization'));
      if (!guard.ok) return guard.response;

      const supabase = getAuditableSupabaseAdmin(guard.auth.user.id);

      return await handler({
        req,
        supabase,
        auth: guard.auth,
        apiKey: guard.apiKey,
      });
    } catch (err) {
      return errorResponse(label, err);
    }
  };
}

// @boundary: wraps a non-sync mutation route with auth + auditable client.
// Handles verifyAdminCanMutate boilerplate (viewer rejection, 401),
// creates the auditable Supabase client, and catches unhandled errors.
// @coupling: uses verifyAdminCanMutate which rejects viewers but does NOT
// validate TMDB key — use withSyncAdmin for routes that need it.
export function withMutationAdmin(
  label: string,
  handler: (ctx: AdminRouteContext) => Promise<NextResponse>,
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    try {
      const authResult = await verifyAdminCanMutate(req.headers.get('authorization'));
      if (authResult === 'viewer_readonly') return viewerReadonlyResponse();
      if (!authResult) return unauthorizedResponse();

      const supabase = getAuditableSupabaseAdmin(authResult.user.id);

      return await handler({
        req,
        supabase,
        auth: authResult,
      });
    } catch (err) {
      return errorResponse(label, err);
    }
  };
}
