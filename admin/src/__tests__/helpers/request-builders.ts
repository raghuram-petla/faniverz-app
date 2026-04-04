import { NextRequest } from 'next/server';

// @contract Creates a real NextRequest for API route handler tests that use direct auth.
// @assumes URL must be a full localhost URL; body is JSON-serializable.
export function makeNextRequest(
  url: string,
  body: Record<string, unknown>,
  opts: { authHeader?: string } = {},
): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      Authorization: opts.authHeader ?? 'Bearer tok',
    },
  });
}

// @contract Creates a route-wrapper context object for withSyncAdmin/withMutationAdmin handlers.
// @assumes supabase is a pre-configured mock; apiKey defaults to 'tmdb-key'.
export function makeRouteWrapperCtx(
  url: string,
  body: Record<string, unknown>,
  supabase: { from: (...args: unknown[]) => unknown },
  opts: {
    userId?: string;
    role?: string;
    apiKey?: string;
    includeApiKey?: boolean;
  } = {},
) {
  const { userId = 'admin-1', role = 'admin', apiKey = 'tmdb-key', includeApiKey = true } = opts;

  const ctx: Record<string, unknown> = {
    req: new NextRequest(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),
    supabase,
    auth: { user: { id: userId } as never, role },
  };

  if (includeApiKey) {
    ctx.apiKey = apiKey;
  }

  return ctx;
}
