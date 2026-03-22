import { describe, it, expect } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { makeQueryClient, getQueryClient } from '@/lib/query-client';

describe('makeQueryClient', () => {
  it('returns a QueryClient instance', () => {
    const client = makeQueryClient();
    expect(client).toBeInstanceOf(QueryClient);
  });

  it('returns a new instance on each call', () => {
    const a = makeQueryClient();
    const b = makeQueryClient();
    expect(a).not.toBe(b);
  });
});

describe('getQueryClient', () => {
  it('returns the same instance on repeated calls in the browser', () => {
    // In jsdom environment, window is defined, so this should return a singleton
    const first = getQueryClient();
    const second = getQueryClient();
    expect(first).toBe(second);
    expect(first).toBeInstanceOf(QueryClient);
  });
});

describe('makeQueryClient — default options', () => {
  it('sets staleTime to 5 minutes', () => {
    const client = makeQueryClient();
    const defaultOpts = client.getDefaultOptions();
    expect(defaultOpts.queries?.staleTime).toBe(5 * 60 * 1000);
  });

  it('sets gcTime to 10 minutes', () => {
    const client = makeQueryClient();
    const defaultOpts = client.getDefaultOptions();
    expect(defaultOpts.queries?.gcTime).toBe(10 * 60 * 1000);
  });

  it('disables refetchOnWindowFocus', () => {
    const client = makeQueryClient();
    const defaultOpts = client.getDefaultOptions();
    expect(defaultOpts.queries?.refetchOnWindowFocus).toBe(false);
  });

  it('disables refetchOnReconnect', () => {
    const client = makeQueryClient();
    const defaultOpts = client.getDefaultOptions();
    expect(defaultOpts.queries?.refetchOnReconnect).toBe(false);
  });

  it('sets retry to 1', () => {
    const client = makeQueryClient();
    const defaultOpts = client.getDefaultOptions();
    expect(defaultOpts.queries?.retry).toBe(1);
  });
});
