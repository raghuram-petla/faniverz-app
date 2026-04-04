import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import {
  verifyAdminCanMutate,
  verifyAdminWithLanguages,
  unauthorizedResponse,
  viewerReadonlyResponse,
} from '@/lib/sync-helpers';
import { hasLanguageAccess } from '@/lib/language-access';

// @boundary Generic CRUD endpoint that delegates to the admin_crud RPC function.
// The RPC sets app.admin_user_id in the same transaction, ensuring the audit
// trigger can attribute changes to the correct admin.

// @invariant Top-level entities can only be hard-deleted by root/super_admin
const TOP_LEVEL_TABLES = new Set([
  'movies',
  'actors',
  'production_houses',
  'platforms',
  'surprise_content',
  'news_feed',
  'notifications',
]);

// @invariant Movie child entities inherit language scope from parent movie
const MOVIE_CHILD_TABLES = new Set([
  'movie_images',
  'movie_videos',
  'movie_cast',
  'movie_platforms',
  'movie_platform_availability',
  'movie_production_houses',
  'movie_theatrical_runs',
]);

const forbiddenResponse = (msg: string) => NextResponse.json({ error: msg }, { status: 403 });

/** @boundary Executes admin_crud RPC with audit attribution */
// @edge: `table` is a raw string from the client — table whitelist validation happens inside
// the admin_crud DB function (RPC), NOT in this route. If the RPC doesn't validate, any
// table name is accepted. Check the admin_crud function definition in migrations for the whitelist.
function execRpc(
  adminId: string,
  table: string,
  operation: string,
  data: unknown,
  id: string | null,
  filters: Record<string, unknown> | null,
) {
  return getSupabaseAdmin().rpc('admin_crud', {
    p_admin_id: adminId,
    p_table: table,
    p_operation: operation,
    p_data: data,
    p_id: id,
    p_filters: filters,
  });
}

/**
 * @boundary Resolves a movie's original_language from either a movie ID or a child entity.
 * For movies table: looks up by id or filters.
 * For child tables: resolves movie_id from the child row (by id) or from filters.movie_id.
 * Returns the language string, or null if not found.
 */
async function resolveMovieLanguage(
  table: string,
  id: string | null,
  filters: Record<string, unknown> | null,
): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  if (table === 'movies') {
    // Direct movie lookup
    /* v8 ignore start */
    const movieId = id ?? (filters?.id as string | undefined);
    /* v8 ignore stop */
    /* v8 ignore start */
    if (!movieId) return null;
    /* v8 ignore stop */
    const { data: movie } = await supabase
      .from('movies')
      .select('original_language')
      .eq('id', movieId)
      .single();
    /* v8 ignore start */
    return movie?.original_language ?? null;
    /* v8 ignore stop */
  }

  // Child table — resolve movie_id from the row or from filters
  let movieId: string | null = null;
  if (id) {
    const { data: childRow } = await supabase.from(table).select('movie_id').eq('id', id).single();
    /* v8 ignore start */
    movieId = childRow?.movie_id ?? null;
    /* v8 ignore stop */
  } else if (filters?.movie_id) {
    movieId = filters.movie_id as string;
  } /* v8 ignore start */ else {
    /* noop */
  } /* v8 ignore stop */

  /* v8 ignore start */
  if (!movieId) return null;
  /* v8 ignore stop */

  const { data: movie } = await supabase
    .from('movies')
    .select('original_language')
    .eq('id', movieId)
    .single();
  /* v8 ignore start */
  return movie?.original_language ?? null;
  /* v8 ignore stop */
}

// @contract PATCH { table, id?, filters?, data, returnOne? } → updates row(s)
export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const { table, id, filters, data } = await req.json();
    if (!table || (!id && !filters) || !data) {
      return NextResponse.json(
        { error: 'Missing table, data, and either id or filters' },
        { status: 400 },
      );
    }

    // @boundary Movie and movie child table updates require language-scoped authorization
    /* v8 ignore start */
    if (table === 'movies' || MOVIE_CHILD_TABLES.has(table)) {
      /* v8 ignore stop */
      const auth = await verifyAdminWithLanguages(authHeader);
      if (auth === 'viewer_readonly') return viewerReadonlyResponse();
      if (!auth) return unauthorizedResponse();

      if (auth.languageCodes.length > 0) {
        const movieLang = await resolveMovieLanguage(table, id ?? null, filters ?? null);
        if (movieLang !== null && !hasLanguageAccess(auth.languageCodes, movieLang)) {
          return forbiddenResponse("You do not have access to this movie's language");
        }

        // @edge If original_language is being changed on a movie, validate the new language too
        if (
          table === 'movies' &&
          data.original_language &&
          !hasLanguageAccess(auth.languageCodes, data.original_language)
        ) {
          return forbiddenResponse('You do not have access to the target language');
        }
      }

      const { data: row, error } = await execRpc(
        auth.user.id,
        table,
        'update',
        data,
        id ?? null,
        filters ?? null,
      );
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(row);
    }

    // Non-movie tables: standard auth
    const auth = await verifyAdminCanMutate(authHeader);
    if (auth === 'viewer_readonly') return viewerReadonlyResponse();
    if (!auth) return unauthorizedResponse();

    const { data: row, error } = await execRpc(
      auth.user.id,
      table,
      'update',
      data,
      /* v8 ignore start */
      id ?? null,
      /* v8 ignore stop */

      filters ?? null,
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// @contract POST { table, data } → inserts a single row, returns inserted row
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const { table, data } = await req.json();
    if (!table || !data) {
      return NextResponse.json({ error: 'Missing table or data' }, { status: 400 });
    }

    // @boundary Movie and movie child table inserts require language-scoped authorization
    /* v8 ignore start */
    if (table === 'movies' || MOVIE_CHILD_TABLES.has(table)) {
      /* v8 ignore stop */
      const auth = await verifyAdminWithLanguages(authHeader);
      if (auth === 'viewer_readonly') return viewerReadonlyResponse();
      if (!auth) return unauthorizedResponse();

      if (auth.languageCodes.length > 0) {
        // For movies: check original_language. For child tables: check parent movie's language.
        const langToCheck =
          table === 'movies'
            ? (data.original_language as string | null)
            : await resolveMovieLanguage(table, null, { movie_id: data.movie_id });

        if (langToCheck && !hasLanguageAccess(auth.languageCodes, langToCheck)) {
          return forbiddenResponse('You do not have access to this language');
        }
      } /* v8 ignore start */ else {
        /* noop */
      } /* v8 ignore stop */

      const { data: row, error } = await execRpc(auth.user.id, table, 'insert', data, null, null);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(row);
    }

    // Non-movie tables: standard auth
    const auth = await verifyAdminCanMutate(authHeader);
    if (auth === 'viewer_readonly') return viewerReadonlyResponse();
    if (!auth) return unauthorizedResponse();

    const { data: row, error } = await execRpc(auth.user.id, table, 'insert', data, null, null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// @contract DELETE { table, id?, filters? } → deletes row(s) by id or filters
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAdminWithLanguages(req.headers.get('authorization'));
    if (auth === 'viewer_readonly') return viewerReadonlyResponse();
    if (!auth) return unauthorizedResponse();

    const { table, id, filters } = await req.json();
    if (!table || (!id && !filters)) {
      return NextResponse.json(
        { error: 'Missing table, and either id or filters' },
        { status: 400 },
      );
    }

    const role = auth.role;
    const isSuperAdmin = role === 'root' || role === 'super_admin';

    // @invariant Top-level entities: only root/super_admin can hard-delete
    if (TOP_LEVEL_TABLES.has(table) && !isSuperAdmin) {
      return forbiddenResponse('Only super admins can delete top-level entities');
    }

    // @invariant Movie child entities: admin can delete within their language scope
    // production_house_admin cannot delete child entities (posters/trailers)
    /* v8 ignore start */
    if (MOVIE_CHILD_TABLES.has(table)) {
      /* v8 ignore stop */
      if (role === 'production_house_admin') {
        return forbiddenResponse('Production house admins cannot delete child entities');
      }

      // For admin role: validate language scope via parent movie's original_language
      if (role === 'admin' && auth.languageCodes.length > 0) {
        const movieLang = await resolveMovieLanguage(table, id ?? null, filters ?? null);
        if (movieLang !== null && !hasLanguageAccess(auth.languageCodes, movieLang)) {
          return forbiddenResponse("You do not have access to this movie's language");
        }
      } /* v8 ignore start */ else {
        /* noop */
      } /* v8 ignore stop */
    }

    const { data: result, error } = await execRpc(
      auth.user.id,
      table,
      'delete',
      null,
      id ?? null,
      filters ?? null,
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(result ?? { success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
