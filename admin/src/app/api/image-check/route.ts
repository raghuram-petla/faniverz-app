import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, unauthorizedResponse } from '@/lib/sync-helpers';

const MAX_URLS = 10;

// @invariant: only CDN/storage domains allowed — prevents SSRF by restricting outbound HEAD requests
// @edge: in local dev, Supabase storage serves from localhost/LAN IPs — must be allowed
// @coupling: image.tmdb.org allowed because DB stores TMDB CDN URLs as fallback when R2 is unavailable
const ALLOWED_URL_PATTERNS = ['faniverz.com', 'image.tmdb.org'];

function isLocalDev(): boolean {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost') === true ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('127.0.0.1') === true
  );
}

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (ALLOWED_URL_PATTERNS.some((pattern) => parsed.hostname.includes(pattern))) return true;
    // @edge: allow local/LAN IPs in dev (Supabase storage / MinIO on local network)
    if (
      isLocalDev() &&
      (parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(parsed.hostname))
    )
      return true;
    return false;
  } catch {
    return false;
  }
}

// @boundary: admin-only route — verifies admin role before processing
// @contract: accepts { urls: string[] }; returns { results: Array<{ url, status: 'ok'|'missing'|'error' }> }
export async function POST(request: NextRequest) {
  // @edge: auth is outside the body try-catch so auth errors return 401/500, not misleading 400
  let user;
  try {
    user = await verifyAdmin(request.headers.get('authorization'));
  } catch (e) {
    console.error('[image-check] verifyAdmin threw:', e);
    return NextResponse.json({ error: 'Auth verification failed' }, { status: 500 });
  }

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const { urls } = body;

    if (
      !Array.isArray(urls) ||
      urls.length === 0 ||
      urls.some((u: unknown) => typeof u !== 'string')
    ) {
      return NextResponse.json(
        { error: 'urls must be a non-empty array of strings' },
        { status: 400 },
      );
    }

    if (urls.length > MAX_URLS) {
      return NextResponse.json({ error: `Maximum ${MAX_URLS} URLs per request` }, { status: 400 });
    }

    // Validate all URLs are from allowed domains
    const disallowedUrls = urls.filter((url: string) => !isAllowedUrl(url));
    if (disallowedUrls.length > 0) {
      console.error('[image-check] Disallowed URLs:', disallowedUrls);
      return NextResponse.json(
        { error: 'URLs must be from allowed CDN domains (faniverz.com)', disallowedUrls },
        { status: 400 },
      );
    }

    // @sideeffect: makes outbound HEAD requests to external CDN URLs
    // @edge: individual fetch failures are caught per-URL — one broken URL doesn't fail the batch
    const results = await Promise.all(
      urls.map(async (url: string) => {
        try {
          const res = await fetch(url, { method: 'HEAD' });
          return { url, status: res.ok ? ('ok' as const) : ('missing' as const) };
        } catch {
          return { url, status: 'error' as const };
        }
      }),
    );

    return NextResponse.json({ results });
  } catch (e) {
    console.error('[image-check] Request parsing error:', e);
    return NextResponse.json(
      { error: 'Invalid request body', detail: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }
}
