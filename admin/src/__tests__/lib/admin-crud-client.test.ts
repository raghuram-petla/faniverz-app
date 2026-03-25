/**
 * Tests for admin-crud-client.ts — authenticated CRUD fetch helper.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSignOut = vi.fn();
const mockGetSession = vi.fn();

vi.mock('../../lib/supabase-browser', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  },
}));

import { crudFetch } from '../../lib/admin-crud-client';

describe('crudFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: valid session
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token-123' } },
    });
    // Default: successful response
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ data: 'result' }),
      }),
    );
  });

  it('sends authenticated request with correct headers', async () => {
    await crudFetch('POST', { table: 'movies', action: 'list' });

    expect(fetch).toHaveBeenCalledWith('/api/admin-crud', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token-123',
      },
      body: JSON.stringify({ table: 'movies', action: 'list' }),
    });
  });

  it('returns parsed JSON response on success', async () => {
    const result = await crudFetch<{ data: string }>('POST', { table: 'movies' });
    expect(result).toEqual({ data: 'result' });
  });

  it('throws and signs out when no session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    await expect(crudFetch('POST', { table: 'movies' })).rejects.toThrow(
      'Session expired — please sign in again.',
    );
    expect(mockSignOut).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('throws and signs out on 401 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({ error: 'Unauthorized' }),
      }),
    );

    await expect(crudFetch('POST', { table: 'movies' })).rejects.toThrow(
      'Session expired — please sign in again.',
    );
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('throws with error message from non-2xx response body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({ error: 'Invalid table name' }),
      }),
    );

    await expect(crudFetch('POST', { table: 'bad' })).rejects.toThrow('Invalid table name');
  });

  it('throws with status code fallback when response body parse fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new Error('not json')),
      }),
    );

    await expect(crudFetch('POST', { table: 'movies' })).rejects.toThrow('Request failed');
  });

  it('uses provided HTTP method', async () => {
    await crudFetch('PATCH', { table: 'movies', id: '1' });

    expect(fetch).toHaveBeenCalledWith(
      '/api/admin-crud',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('falls back to status code message when error key is missing from response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: vi.fn().mockResolvedValue({}),
      }),
    );

    await expect(crudFetch('POST', { table: 'movies' })).rejects.toThrow('Request failed (403)');
  });
});
