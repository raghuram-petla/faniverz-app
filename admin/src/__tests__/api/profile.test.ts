import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const mockGetUser = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateEq = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      update: (...args: unknown[]) => {
        mockUpdate(...args);
        return { eq: mockUpdateEq };
      },
    }),
  }),
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

import { GET, PATCH } from '@/app/api/profile/route';

function makeRequest(body: Record<string, unknown>, authHeader?: string) {
  return {
    json: async () => body,
    headers: {
      get: (name: string) =>
        name === 'authorization' ? (authHeader ?? 'Bearer valid-token') : null,
    },
  } as unknown as NextRequest;
}

function makeGetRequest(authHeader?: string) {
  return {
    headers: {
      get: (name: string) =>
        name === 'authorization' ? (authHeader ?? 'Bearer valid-token') : null,
    },
  } as unknown as NextRequest;
}

beforeEach(() => {
  mockGetUser.mockReset();
  mockUpdate.mockReset();
  mockUpdateEq.mockReset();

  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-1', email: 'admin@test.com' } },
    error: null,
  });
  mockUpdateEq.mockResolvedValue({ error: null });
});

describe('PATCH /api/profile', () => {
  it('returns 401 when authorization header is missing', async () => {
    const res = await PATCH(makeRequest({ avatar_url: 'https://cdn.example.com/a.jpg' }, ''));
    expect(res.status).toBe(401);
  });

  it('returns 401 when token is invalid', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    const res = await PATCH(makeRequest({ avatar_url: 'https://cdn.example.com/a.jpg' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when no valid fields provided', async () => {
    const res = await PATCH(makeRequest({ unknown_field: 'value' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('No valid fields');
  });

  it('updates avatar_url successfully', async () => {
    const res = await PATCH(makeRequest({ avatar_url: 'https://cdn.example.com/avatar.jpg' }));
    expect(res.status).toBe(200);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        avatar_url: 'https://cdn.example.com/avatar.jpg',
        updated_at: expect.any(String),
      }),
    );
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'user-1');
  });

  it('allows setting avatar_url to null', async () => {
    const res = await PATCH(makeRequest({ avatar_url: null }));
    expect(res.status).toBe(200);

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ avatar_url: null }));
  });

  it('only updates whitelisted fields', async () => {
    const res = await PATCH(
      makeRequest({ avatar_url: 'url', email: 'hack@evil.com', is_admin: true }),
    );
    expect(res.status).toBe(200);

    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg).toHaveProperty('avatar_url', 'url');
    expect(updateArg).not.toHaveProperty('email');
    expect(updateArg).not.toHaveProperty('is_admin');
  });

  it('returns 500 when database update fails', async () => {
    mockUpdateEq.mockResolvedValueOnce({ error: { message: 'DB error' } });

    const res = await PATCH(makeRequest({ avatar_url: 'url' }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain('Failed to update profile');
  });
});

describe('GET /api/profile', () => {
  it('returns 401 when authorization header is missing', async () => {
    const res = await GET(makeGetRequest(''));
    expect(res.status).toBe(401);
  });

  it('returns google_avatar_url from user metadata', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: {
          id: 'user-1',
          email: 'admin@test.com',
          user_metadata: { avatar_url: 'https://lh3.google.com/photo.jpg' },
        },
      },
      error: null,
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.google_avatar_url).toBe('https://lh3.google.com/photo.jpg');
  });

  it('falls back to picture field in metadata', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: {
          id: 'user-1',
          email: 'admin@test.com',
          user_metadata: { picture: 'https://lh3.google.com/pic.jpg' },
        },
      },
      error: null,
    });

    const res = await GET(makeGetRequest());
    const data = await res.json();
    expect(data.google_avatar_url).toBe('https://lh3.google.com/pic.jpg');
  });

  it('returns null when no avatar in metadata', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: { id: 'user-1', email: 'admin@test.com', user_metadata: {} },
      },
      error: null,
    });

    const res = await GET(makeGetRequest());
    const data = await res.json();
    expect(data.google_avatar_url).toBeNull();
  });
});
