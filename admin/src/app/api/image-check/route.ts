import { NextRequest, NextResponse } from 'next/server';

const MAX_URLS = 10;

export async function POST(request: NextRequest) {
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
