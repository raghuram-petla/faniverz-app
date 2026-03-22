import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { useAdminAuditLog } from '@/hooks/useAdminAudit';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

/** Build a chainable mock — every method returns self, await resolves with data */
function buildChain(data: unknown[] = []) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const result = { data, error: null };

  const self = new Proxy(chain, {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => resolve(result);
      }
      if (prop === 'catch') return () => self;
      if (!target[prop as string]) {
        target[prop as string] = vi.fn().mockReturnValue(self);
      }
      return target[prop as string];
    },
  });

  return { self, chain };
}

describe('useAdminAuditLog', () => {
  it('queries audit_log_view and returns paginated data', async () => {
    const entries = [{ id: '1', action: 'create', entity_type: 'movie', admin_email: 'a@b.com' }];
    const { self } = buildChain(entries);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminAuditLog(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('audit_log_view');
    expect(result.current.data?.pages.flat()).toEqual(entries);
  });

  it('applies action filter via eq', async () => {
    const { self, chain } = buildChain();
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminAuditLog({ action: 'delete' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(chain.eq).toHaveBeenCalledWith('action', 'delete');
  });

  it('applies entity type filter via eq', async () => {
    const { self, chain } = buildChain();
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminAuditLog({ entityType: 'movie' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(chain.eq).toHaveBeenCalledWith('entity_type', 'movie');
  });

  it('applies date range filters via gte and lte', async () => {
    const { self, chain } = buildChain();
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(
      () => useAdminAuditLog({ dateFrom: '2026-01-01', dateTo: '2026-03-01' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(chain.gte).toHaveBeenCalledWith('created_at', '2026-01-01T00:00:00');
    expect(chain.lte).toHaveBeenCalledWith('created_at', '2026-03-01T23:59:59');
  });

  it('applies search filter via or across admin_email, entity_type, entity_id', async () => {
    const { self, chain } = buildChain();
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminAuditLog({ search: 'test' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(chain.or).toHaveBeenCalledWith(
      'admin_email.ilike.%test%,entity_type.ilike.%test%,entity_id.ilike.%test%',
    );
  });

  it('sanitizes search term by stripping special characters but preserving dots', async () => {
    const { self, chain } = buildChain();
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminAuditLog({ search: 'test,value.(bad)' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // @edge: dots preserved for email search compatibility
    expect(chain.or).toHaveBeenCalledWith(
      'admin_email.ilike.%testvalue.bad%,entity_type.ilike.%testvalue.bad%,entity_id.ilike.%testvalue.bad%',
    );
  });

  it('applies adminUserId filter via eq', async () => {
    const { self, chain } = buildChain();
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminAuditLog({ adminUserId: 'user-123' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(chain.eq).toHaveBeenCalledWith('admin_user_id', 'user-123');
  });

  it('skips search filter when sanitized term is empty', async () => {
    const { self, chain } = buildChain();
    // Pre-create the or spy so we can assert it wasn't called
    chain.or = vi.fn().mockReturnValue(self);
    mockFrom.mockReturnValue(self);

    // All characters are stripped by sanitizeSearchTerm
    const { result } = renderHook(() => useAdminAuditLog({ search: ',()"\'\\' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // or() should NOT have been called since sanitized term is empty
    expect(chain.or).not.toHaveBeenCalled();
  });

  it('applies all filters simultaneously', async () => {
    const { self, chain } = buildChain();
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(
      () =>
        useAdminAuditLog({
          action: 'create',
          entityType: 'actor',
          dateFrom: '2026-01-01',
          dateTo: '2026-12-31',
          search: 'test',
          adminUserId: 'admin-1',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(chain.eq).toHaveBeenCalledWith('admin_user_id', 'admin-1');
    expect(chain.eq).toHaveBeenCalledWith('action', 'create');
    expect(chain.eq).toHaveBeenCalledWith('entity_type', 'actor');
    expect(chain.gte).toHaveBeenCalledWith('created_at', '2026-01-01T00:00:00');
    expect(chain.lte).toHaveBeenCalledWith('created_at', '2026-12-31T23:59:59');
    expect(chain.or).toHaveBeenCalled();
  });

  it('returns no next page when results are fewer than PAGE_SIZE', async () => {
    const entries = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }));
    const { self } = buildChain(entries);
    mockFrom.mockReturnValue(self);

    const { result } = renderHook(() => useAdminAuditLog(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.hasNextPage).toBe(false);
  });
});
