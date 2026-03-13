import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/sync-helpers';

const MAX_URLS = 10;

// @invariant: only CDN domains allowed — prevents SSRF by restricting outbound HEAD requests
const ALLOWED_URL_PATTERNS = ['r2.cloudflarestorage.com', 'image.tmdb.org', 'pub-'];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_URL_PATTERNS.some((pattern) => parsed.hostname.includes(pattern));
  } catch {
    return false;
  }
}

// @boundary: admin-only route — verifies admin role before processing
// @contract: accepts { urls: string[] }; returns { results: Array<{ url, status: 'ok'|'missing'|'error' }> }
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdmin(request.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      return NextResponse.json(
        {
          error:
            'URLs must be from allowed CDN domains (r2.cloudflarestorage.com, image.tmdb.org, or app CDN)',
        },
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
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
