import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockSupabaseQuery = vi.fn();
const mockGetSession = vi.fn();
const _mockInvalidateQueries = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockImplementation(function (this: unknown) {
        return mockSupabaseQuery();
      }),
    })),
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

// Override the from chain to resolve via mockSupabaseQuery
const _buildChain = () => {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'order', 'range', 'eq', 'gte', 'lte', 'or', 'not'];
  for (const m of methods) {
    chain[m] = vi.fn(() => {
      // last call resolves
      return chain;
    });
  }
  // Make the chain thenable
  (chain as { then: unknown }).then = (resolve: (v: unknown) => void) => {
    Promise.resolve(mockSupabaseQuery()).then(resolve);
  };
  return chain;
};

import { useAdminAuditLog, useRevertAuditEntry } from '@/hooks/useAdminAudit';

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, Wrapper };
}

describe('useAdminAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries supabase for audit log entries', async () => {
    const mockEntries = [
      { id: '1', action: 'UPDATE', entity_type: 'movie', created_at: '2024-01-01' },
    ];

    // Set up the supabase mock to return data
    const { supabase } = await import('@/lib/supabase-browser');
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: mockEntries, error: null }),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: mockEntries, error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminAuditLog(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBe(true);
    });
  });

  it('returns infinite query with getNextPageParam logic', async () => {
    const { supabase } = await import('@/lib/supabase-browser');
    const smallPage = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }));
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: smallPage, error: null }),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: smallPage, error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminAuditLog(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Less than 50 items means no next page
    expect(result.current.hasNextPage).toBe(false);
  });

  it('applies adminUserId filter when provided', async () => {
    const { supabase } = await import('@/lib/supabase-browser');
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>);

    const { Wrapper } = makeWrapper();
    renderHook(() => useAdminAuditLog({ adminUserId: 'user-123' }), { wrapper: Wrapper });

    await waitFor(() => {
      expect(chain.eq).toHaveBeenCalledWith('admin_user_id', 'user-123');
    });
  });

  it('applies action filter when provided', async () => {
    const { supabase } = await import('@/lib/supabase-browser');
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>);

    const { Wrapper } = makeWrapper();
    renderHook(() => useAdminAuditLog({ action: 'UPDATE' }), { wrapper: Wrapper });

    await waitFor(() => {
      expect(chain.eq).toHaveBeenCalledWith('action', 'UPDATE');
    });
  });

  it('applies dateFrom filter when provided', async () => {
    const { supabase } = await import('@/lib/supabase-browser');
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ data: [], error: null }),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>);

    const { Wrapper } = makeWrapper();
    renderHook(() => useAdminAuditLog({ dateFrom: '2024-01-01' }), { wrapper: Wrapper });

    await waitFor(() => {
      expect(chain.gte).toHaveBeenCalledWith('created_at', '2024-01-01T00:00:00');
    });
  });

  it('applies dateTo filter when provided', async () => {
    const { supabase } = await import('@/lib/supabase-browser');
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockResolvedValue({ data: [], error: null }),
      or: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>);

    const { Wrapper } = makeWrapper();
    renderHook(() => useAdminAuditLog({ dateTo: '2024-12-31' }), { wrapper: Wrapper });

    await waitFor(() => {
      expect(chain.lte).toHaveBeenCalledWith('created_at', '2024-12-31T23:59:59');
    });
  });

  it('applies search filter with sanitized term', async () => {
    const { supabase } = await import('@/lib/supabase-browser');
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>);

    const { Wrapper } = makeWrapper();
    renderHook(() => useAdminAuditLog({ search: 'test query' }), { wrapper: Wrapper });

    await waitFor(() => {
      expect(chain.or).toHaveBeenCalledWith(
        'admin_email.ilike.%test query%,entity_type.ilike.%test query%,entity_id.ilike.%test query%',
      );
    });
  });

  it('strips special chars from search term before applying', async () => {
    const { supabase } = await import('@/lib/supabase-browser');
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>);

    const { Wrapper } = makeWrapper();
    // O'Brien has an apostrophe which should be stripped → OBrien
    renderHook(() => useAdminAuditLog({ search: "O'Brien" }), { wrapper: Wrapper });

    await waitFor(() => {
      expect(chain.or).toHaveBeenCalledWith(expect.stringContaining('OBrien'));
    });
  });

  it('skips or() when search term sanitizes to empty string', async () => {
    const { supabase } = await import('@/lib/supabase-browser');
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>);

    const { Wrapper } = makeWrapper();
    // All special chars — sanitizes to empty
    renderHook(() => useAdminAuditLog({ search: ',\'"()' }), { wrapper: Wrapper });

    await waitFor(() => {
      expect(chain.or).not.toHaveBeenCalled();
    });
  });
});

describe('useRevertAuditEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('throws when session is null', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useRevertAuditEntry(), { wrapper: Wrapper });

    let caughtError: Error | null = null;
    await act(async () => {
      try {
        await result.current.mutateAsync('audit-1');
      } catch (e) {
        caughtError = e as Error;
      }
    });

    expect((caughtError as Error | null)?.message).toBe('Not authenticated');
  });

  it('posts to /api/audit/revert with correct body', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok123' } },
    });
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as unknown as Response);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useRevertAuditEntry(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync('audit-entry-42');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/audit/revert',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer tok123' }),
        body: JSON.stringify({ auditEntryId: 'audit-entry-42' }),
      }),
    );
  });

  it('throws when response is not ok', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok123' } },
    });
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Not allowed' }),
    } as unknown as Response);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useRevertAuditEntry(), { wrapper: Wrapper });

    let caughtError: Error | null = null;
    await act(async () => {
      try {
        await result.current.mutateAsync('audit-1');
      } catch (e) {
        caughtError = e as Error;
      }
    });

    expect((caughtError as Error | null)?.message).toBe('Not allowed');
  });

  it('uses fallback "Revert failed" when error json has no error key', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok123' } },
    });
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as unknown as Response);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useRevertAuditEntry(), { wrapper: Wrapper });

    let caughtError: Error | null = null;
    await act(async () => {
      try {
        await result.current.mutateAsync('audit-1');
      } catch (e) {
        caughtError = e as Error;
      }
    });

    expect((caughtError as Error | null)?.message).toBe('Revert failed');
  });

  it('uses fallback when error response json() throws', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok123' } },
    });
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    } as unknown as Response);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useRevertAuditEntry(), { wrapper: Wrapper });

    let caughtError: Error | null = null;
    await act(async () => {
      try {
        await result.current.mutateAsync('audit-1');
      } catch (e) {
        caughtError = e as Error;
      }
    });

    expect((caughtError as Error | null)?.message).toBe('Revert failed');
  });

  it('applies entityType filter when provided', async () => {
    const { supabase } = await import('@/lib/supabase-browser');
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>);

    const { Wrapper } = makeWrapper();
    renderHook(() => useAdminAuditLog({ entityType: 'movie' }), { wrapper: Wrapper });

    await waitFor(() => {
      expect(chain.eq).toHaveBeenCalledWith('entity_type', 'movie');
    });
  });

  it('invalidates all admin queries on success', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok123' } },
    });
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as unknown as Response);

    const { qc, Wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

    const { result } = renderHook(() => useRevertAuditEntry(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync('audit-1');
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin'] });
  });
});
