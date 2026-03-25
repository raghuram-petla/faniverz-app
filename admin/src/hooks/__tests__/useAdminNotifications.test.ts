import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockFrom = vi.fn();
const mockInvoke = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}));

import {
  useAdminNotifications,
  useCreateNotification,
  useCancelNotification,
  useRetryNotification,
  useBulkRetryFailed,
  useBulkCancelPending,
} from '@/hooks/useAdminNotifications';

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, Wrapper };
}

function makeQueryChain(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
      Promise.resolve({ data, error: null }).then(resolve, reject),
  };
}

describe('useAdminNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches notifications without filters', async () => {
    const notifs = [{ id: '1', type: 'push', status: 'sent' }];
    const chain = makeQueryChain(notifs);
    mockFrom.mockReturnValue(chain);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminNotifications(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(notifs);
  });

  it('applies status filter', async () => {
    const chain = makeQueryChain([]);
    mockFrom.mockReturnValue(chain);

    const { Wrapper } = makeWrapper();
    renderHook(() => useAdminNotifications({ status: 'pending' }), { wrapper: Wrapper });

    await waitFor(() => expect(chain.eq).toHaveBeenCalledWith('status', 'pending'));
  });

  it('applies type filter', async () => {
    const chain = makeQueryChain([]);
    mockFrom.mockReturnValue(chain);

    const { Wrapper } = makeWrapper();
    renderHook(() => useAdminNotifications({ type: 'push' }), { wrapper: Wrapper });

    await waitFor(() => expect(chain.eq).toHaveBeenCalledWith('type', 'push'));
  });

  it('throws when query errors', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
        Promise.resolve({ data: null, error: new Error('Query error') }).then(resolve, reject),
    };
    mockFrom.mockReturnValue(chain);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useAdminNotifications(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useCreateNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
  });

  it('creates notification and triggers push for immediate', async () => {
    const insertChain = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'n1' }, error: null }),
    };
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue(insertChain),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    mockInvoke.mockResolvedValue({ error: null });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateNotification(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ title: 'Test', scheduled_for: undefined });
    });

    expect(mockInvoke).toHaveBeenCalledWith('send-push', { body: { notification_id: 'n1' } });
  });

  it('alerts when push delivery fails with pushError', async () => {
    const insertChain = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'n1' }, error: null }),
    };
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue(insertChain),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    mockInvoke.mockResolvedValue({ error: { message: 'Push failed' } });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateNotification(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ title: 'Test' });
    });

    expect(window.alert).toHaveBeenCalledWith(
      expect.stringContaining('push delivery failed: Push failed'),
    );
  });

  it('alerts when push delivery throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const insertChain = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'n1' }, error: null }),
    };
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue(insertChain),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    mockInvoke.mockRejectedValue(new Error('Network error'));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateNotification(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ title: 'Test' });
    });

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('push delivery failed'));
  });

  it('skips push for scheduled notifications (>60s in future)', async () => {
    const futureDate = new Date(Date.now() + 120_000).toISOString();
    const insertChain = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'n1' }, error: null }),
    };
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue(insertChain),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateNotification(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ title: 'Test', scheduled_for: futureDate });
    });

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('treats immediate as within 60s of now', async () => {
    const soonDate = new Date(Date.now() + 30_000).toISOString();
    const insertChain = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'n1' }, error: null }),
    };
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue(insertChain),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    mockInvoke.mockResolvedValue({ error: null });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateNotification(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ title: 'Test', scheduled_for: soonDate });
    });

    expect(mockInvoke).toHaveBeenCalled();
  });

  it('calls onError alert when insert fails', async () => {
    const insertChain = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('Insert failed') }),
    };
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue(insertChain),
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateNotification(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ title: 'Test' });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Insert failed'));
  });

  it('shows "Operation failed" when error message is empty', async () => {
    const insertChain = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: '' } }),
    };
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue(insertChain),
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateNotification(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ title: 'Test' });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Operation failed'));
  });

  it('handles pushError without message field', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const insertChain = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'n1' }, error: null }),
    };
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue(insertChain),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    mockInvoke.mockResolvedValue({ error: {} });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateNotification(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ title: 'Test' });
    });

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Unknown error'));
  });
});

describe('simple mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
  });

  it('useCancelNotification updates status to cancelled', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({ eq: eqFn }),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useCancelNotification(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync('notif-1');
    });

    expect(eqFn).toHaveBeenCalledWith('id', 'notif-1');
  });

  it('useRetryNotification updates status to pending', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({ eq: eqFn }),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useRetryNotification(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync('notif-1');
    });

    expect(eqFn).toHaveBeenCalledWith('id', 'notif-1');
  });

  it('useBulkRetryFailed updates all failed to pending', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({ eq: eqFn }),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useBulkRetryFailed(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(eqFn).toHaveBeenCalledWith('status', 'failed');
  });

  it('useBulkCancelPending updates all pending to cancelled', async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({ eq: eqFn }),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useBulkCancelPending(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(eqFn).toHaveBeenCalledWith('status', 'pending');
  });
});
