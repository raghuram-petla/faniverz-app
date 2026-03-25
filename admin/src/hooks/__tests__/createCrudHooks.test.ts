import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockFrom = vi.fn();
const mockCrudFetch = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock('@/lib/admin-crud-client', () => ({
  crudFetch: (...args: unknown[]) => mockCrudFetch(...args),
}));

import { createCrudHooks } from '@/hooks/createCrudHooks';

type TestEntity = { id: string; name: string };

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, Wrapper };
}

function makeListChain(data: unknown[], error: unknown = null) {
  const resolveValue = { data, error };
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'order', 'ilike', 'eq', 'in', 'not']) {
    chain[m] = vi.fn(() => chain);
  }
  chain.range = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  // Make thenable so `await query` resolves
  chain.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
    Promise.resolve(resolveValue).then(resolve, reject);
  return chain;
}

describe('createCrudHooks', () => {
  let crud: ReturnType<typeof createCrudHooks<TestEntity>>;

  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    crud = createCrudHooks<TestEntity>({
      table: 'test_table',
      queryKeyBase: 'tests',
      singleKeyBase: 'test',
      orderBy: 'name',
      orderAscending: true,
      searchField: 'name',
    });
  });

  describe('useList (paginated)', () => {
    it('fetches paginated list', async () => {
      const chain = makeListChain([{ id: '1', name: 'A' }]);
      mockFrom.mockReturnValue(chain);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => crud.useList(), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('applies search when provided', async () => {
      const chain = makeListChain([]);
      mockFrom.mockReturnValue(chain);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => crud.useList('test'), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(chain.ilike).toHaveBeenCalledWith('name', '%test%');
    });

    it('returns hasNextPage when page is full', async () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: String(i), name: `Item ${i}` }));
      const chain = makeListChain(items);
      mockFrom.mockReturnValue(chain);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => crud.useList(), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect((result.current as { hasNextPage: boolean }).hasNextPage).toBe(true);
    });

    it('returns no next page when page is not full', async () => {
      const chain = makeListChain([{ id: '1', name: 'A' }]);
      mockFrom.mockReturnValue(chain);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => crud.useList(), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect((result.current as { hasNextPage: boolean }).hasNextPage).toBe(false);
    });

    it('throws when query errors', async () => {
      const chain = makeListChain([], new Error('DB error'));
      mockFrom.mockReturnValue(chain);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => crud.useList(), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useList (non-paginated)', () => {
    let simpleCrud: ReturnType<typeof createCrudHooks<TestEntity>>;

    beforeEach(() => {
      simpleCrud = createCrudHooks<TestEntity>({
        table: 'test_table',
        queryKeyBase: 'tests',
        orderBy: 'name',
        paginated: false,
      });
    });

    it('fetches simple list without pagination', async () => {
      const chain = makeListChain([{ id: '1', name: 'A' }]);
      mockFrom.mockReturnValue(chain);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => simpleCrud.useList(), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(chain.limit).toHaveBeenCalledWith(5000);
    });
  });

  describe('useSingle', () => {
    it('fetches single item by ID', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1', name: 'A' }, error: null }),
      };
      mockFrom.mockReturnValue(chain);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => crud.useSingle('1'), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual({ id: '1', name: 'A' });
    });

    it('is disabled when id is empty', () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockFrom.mockReturnValue(chain);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => crud.useSingle(''), { wrapper: Wrapper });

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useCreate', () => {
    it('creates entity via crudFetch', async () => {
      mockCrudFetch.mockResolvedValue({ id: 'new-1', name: 'New' });
      const chain = makeListChain([]);
      mockFrom.mockReturnValue(chain);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => crud.useCreate(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync({ name: 'New' } as Partial<TestEntity>);
      });

      expect(mockCrudFetch).toHaveBeenCalledWith('POST', {
        table: 'test_table',
        data: { name: 'New' },
      });
    });

    it('alerts on error', async () => {
      mockCrudFetch.mockRejectedValue(new Error('Create failed'));

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => crud.useCreate(), { wrapper: Wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({ name: 'New' } as Partial<TestEntity>);
        } catch {
          // expected
        }
      });

      await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Create failed'));
    });

    it('shows "Operation failed" when error message is empty', async () => {
      mockCrudFetch.mockRejectedValue(new Error(''));

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => crud.useCreate(), { wrapper: Wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({ name: 'New' } as Partial<TestEntity>);
        } catch {
          // expected
        }
      });

      await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Operation failed'));
    });
  });

  describe('useUpdate', () => {
    it('updates entity via crudFetch', async () => {
      mockCrudFetch.mockResolvedValue({ id: '1', name: 'Updated' });
      const chain = makeListChain([]);
      mockFrom.mockReturnValue(chain);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => crud.useUpdate(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync({ id: '1', name: 'Updated' });
      });

      expect(mockCrudFetch).toHaveBeenCalledWith('PATCH', {
        table: 'test_table',
        id: '1',
        data: { name: 'Updated' },
      });
    });

    it('alerts on error', async () => {
      mockCrudFetch.mockRejectedValue(new Error('Update failed'));

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => crud.useUpdate(), { wrapper: Wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({ id: '1', name: 'Updated' });
        } catch {
          // expected
        }
      });

      await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Update failed'));
    });
  });

  describe('useDelete', () => {
    it('deletes entity via crudFetch', async () => {
      mockCrudFetch.mockResolvedValue({ success: true });
      const chain = makeListChain([]);
      mockFrom.mockReturnValue(chain);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => crud.useDelete(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync('1');
      });

      expect(mockCrudFetch).toHaveBeenCalledWith('DELETE', {
        table: 'test_table',
        id: '1',
      });
    });

    it('alerts on error', async () => {
      mockCrudFetch.mockRejectedValue(new Error('Delete failed'));

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => crud.useDelete(), { wrapper: Wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync('1');
        } catch {
          // expected
        }
      });

      await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Delete failed'));
    });
  });

  describe('enabledFn', () => {
    it('uses enabledFn to control query enabled state', () => {
      const crudWithEnabledFn = createCrudHooks<TestEntity>({
        table: 'test_table',
        queryKeyBase: 'tests',
        orderBy: 'name',
        enabledFn: (s: string) => s.length >= 2,
      });

      const chain = makeListChain([]);
      mockFrom.mockReturnValue(chain);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => crudWithEnabledFn.useList('a'), { wrapper: Wrapper });

      // Should be disabled (search length < 2)
      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useSingle error', () => {
    it('throws when single query errors', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
      };
      mockFrom.mockReturnValue(chain);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => crud.useSingle('1'), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useUpdate "Operation failed" fallback', () => {
    it('shows "Operation failed" when update error message is empty', async () => {
      mockCrudFetch.mockRejectedValue(new Error(''));

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => crud.useUpdate(), { wrapper: Wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({ id: '1', name: 'Updated' });
        } catch {
          // expected
        }
      });

      await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Operation failed'));
    });
  });

  describe('useDelete "Operation failed" fallback', () => {
    it('shows "Operation failed" when delete error message is empty', async () => {
      mockCrudFetch.mockRejectedValue(new Error(''));

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => crud.useDelete(), { wrapper: Wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync('1');
        } catch {
          // expected
        }
      });

      await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Operation failed'));
    });
  });

  describe('non-paginated list error', () => {
    it('throws when non-paginated list query errors', async () => {
      const simpleCrud = createCrudHooks<TestEntity>({
        table: 'test_table',
        queryKeyBase: 'tests_err',
        orderBy: 'name',
        paginated: false,
      });

      const chain = makeListChain([], new Error('DB error'));
      mockFrom.mockReturnValue(chain);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => simpleCrud.useList(), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('paginated list does not search without searchField', () => {
    it('does not call ilike when searchField is not configured', async () => {
      const noSearchCrud = createCrudHooks<TestEntity>({
        table: 'test_table',
        queryKeyBase: 'tests_nosearch',
        orderBy: 'name',
      });

      const chain = makeListChain([]);
      mockFrom.mockReturnValue(chain);

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => noSearchCrud.useList('test'), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(chain.ilike).not.toHaveBeenCalled();
    });
  });

  describe('extraInvalidateKeys', () => {
    it('invalidates extra keys on create', async () => {
      const crudWithExtra = createCrudHooks<TestEntity>({
        table: 'test_table',
        queryKeyBase: 'tests',
        orderBy: 'name',
        extraInvalidateKeys: [['admin', 'dashboard']],
      });

      mockCrudFetch.mockResolvedValue({ id: 'new-1', name: 'New' });
      const chain = makeListChain([]);
      mockFrom.mockReturnValue(chain);

      const { qc, Wrapper } = makeWrapper();
      const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
      const { result } = renderHook(() => crudWithExtra.useCreate(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync({ name: 'New' } as Partial<TestEntity>);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'dashboard'] });
    });
  });
});
