import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const mockVerifyAdmin = vi.fn();
const mockEnsureTmdbApiKey = vi.fn();
const mockSearchMovies = vi.fn();
const mockSearchPersons = vi.fn();
const mockSelectIn = vi.fn();

vi.mock('@/lib/sync-helpers', () => ({
  verifyAdmin: (...args: unknown[]) => mockVerifyAdmin(...args),
  ensureTmdbApiKey: () => mockEnsureTmdbApiKey(),
  errorResponse: (label: string, err: unknown) => ({
    body: { error: err instanceof Error ? err.message : `${label} failed` },
    status: 500,
    async json() {
      return this.body;
    },
  }),
}));

const mockIsNull = vi.fn();
vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        in: mockSelectIn,
        is: () => ({ in: mockIsNull }),
      }),
    }),
  }),
}));

vi.mock('@/lib/tmdb', () => ({
  searchMovies: (...args: unknown[]) => mockSearchMovies(...args),
  searchPersons: (...args: unknown[]) => mockSearchPersons(...args),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
      async json() {
        return body;
      },
    }),
  },
}));

import { POST } from '@/app/api/sync/search/route';

function makeRequest(body: unknown, authHeader = 'Bearer valid-token') {
  return {
    json: async () => body,
    headers: {
      get: (name: string) => (name === 'authorization' ? authHeader : null),
    },
  } as unknown as NextRequest;
}

describe('POST /api/sync/search', () => {
  beforeEach(() => {
    mockVerifyAdmin.mockReset();
    mockEnsureTmdbApiKey.mockReset();
    mockSearchMovies.mockReset();
    mockSearchPersons.mockReset();
    mockSelectIn.mockReset();
    mockIsNull.mockReset();
    mockIsNull.mockResolvedValue({ data: [] });

    mockVerifyAdmin.mockResolvedValue({ id: 'user-1', email: 'admin@test.com' });
    mockEnsureTmdbApiKey.mockReturnValue({ ok: true, apiKey: 'test-tmdb-key' });
  });

  it('returns 401 when not authorized', async () => {
    mockVerifyAdmin.mockResolvedValueOnce(null);
    const res = await POST(makeRequest({ query: 'test' }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when query is less than 2 characters', async () => {
    const res = await POST(makeRequest({ query: 'a' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('at least 2 characters');
  });

  it('returns combined movies and actors response', async () => {
    mockSearchMovies.mockResolvedValue([
      { id: 100, title: 'Movie A' },
      { id: 200, title: 'Movie B' },
    ]);
    mockSearchPersons.mockResolvedValue([
      { id: 10, name: 'Actor A' },
      { id: 20, name: 'Actor B' },
    ]);
    mockSelectIn
      .mockResolvedValueOnce({ data: [{ tmdb_id: 100 }] })
      .mockResolvedValueOnce({ data: [{ tmdb_person_id: 10 }] });

    const res = await POST(makeRequest({ query: 'Search Term' }));
    expect(res.status).toBe(200);
    const data = await res.json();

    // Response has both movies and actors keys
    expect(data).toHaveProperty('movies');
    expect(data).toHaveProperty('actors');

    // Movies section
    expect(data.movies.results).toHaveLength(2);
    expect(data.movies.existingTmdbIds).toEqual([100]);
    expect(data.movies.duplicateSuspects).toEqual({});

    // Actors section
    expect(data.actors.results).toHaveLength(2);
    expect(data.actors.existingTmdbPersonIds).toEqual([10]);
  });

  it('returns empty arrays when no results found', async () => {
    mockSearchMovies.mockResolvedValue([]);
    mockSearchPersons.mockResolvedValue([]);

    const res = await POST(makeRequest({ query: 'nonexistent' }));
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.movies.results).toHaveLength(0);
    expect(data.movies.existingTmdbIds).toEqual([]);
    expect(data.actors.results).toHaveLength(0);
    expect(data.actors.existingTmdbPersonIds).toEqual([]);
  });

  it('does not require a type parameter', async () => {
    mockSearchMovies.mockResolvedValue([]);
    mockSearchPersons.mockResolvedValue([]);

    // No type in body — should still work
    const res = await POST(makeRequest({ query: 'test query' }));
    expect(res.status).toBe(200);
  });
});
