import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createSimpleMutation } from '@/hooks/createSimpleMutation';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

describe('createSimpleMutation', () => {
  it('creates a hook that calls mutationFn with the payload', async () => {
    const mutationFn = vi.fn().mockResolvedValue(undefined);
    const useTestMutation = createSimpleMutation({
      mutationFn,
      invalidateKeys: [['test']],
    });

    const { result } = renderHook(() => useTestMutation(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ id: '1' });
    });

    expect(mutationFn.mock.calls[0][0]).toEqual({ id: '1' });
  });

  it('invalidates specified query keys on success', async () => {
    const mutationFn = vi.fn().mockResolvedValue(undefined);
    const useTestMutation = createSimpleMutation({
      mutationFn,
      invalidateKeys: [
        ['admin', 'items'],
        ['admin', 'dashboard'],
      ],
    });

    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children);

    const { result } = renderHook(() => useTestMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('test');
    });

    expect(spy).toHaveBeenCalledWith({ queryKey: ['admin', 'items'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['admin', 'dashboard'] });
  });

  it('shows window.alert with error message on failure', async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error('Network error'));
    const useTestMutation = createSimpleMutation({
      mutationFn,
      invalidateKeys: [['test']],
    });

    const { result } = renderHook(() => useTestMutation(), { wrapper: createWrapper() });

    await act(async () => {
      try {
        await result.current.mutateAsync('x');
      } catch {
        // expected
      }
    });

    expect(window.alert).toHaveBeenCalledWith('Network error');
  });

  it('uses custom errorMessage when error.message is empty', async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error(''));
    const useTestMutation = createSimpleMutation({
      mutationFn,
      invalidateKeys: [['test']],
      errorMessage: 'Custom failure',
    });

    const { result } = renderHook(() => useTestMutation(), { wrapper: createWrapper() });

    await act(async () => {
      try {
        await result.current.mutateAsync('x');
      } catch {
        // expected
      }
    });

    expect(window.alert).toHaveBeenCalledWith('Custom failure');
  });

  it('falls back to "Operation failed" when no errorMessage provided', async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error(''));
    const useTestMutation = createSimpleMutation({
      mutationFn,
      invalidateKeys: [],
    });

    const { result } = renderHook(() => useTestMutation(), { wrapper: createWrapper() });

    await act(async () => {
      try {
        await result.current.mutateAsync('x');
      } catch {
        // expected
      }
    });

    expect(window.alert).toHaveBeenCalledWith('Operation failed');
  });
});
