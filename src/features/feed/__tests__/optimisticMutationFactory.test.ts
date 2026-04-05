import { QueryClient } from '@tanstack/react-query';
import { createOptimisticMutation } from '../optimisticMutationFactory';

// Helper to make a QueryClient that never retries
function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

describe('createOptimisticMutation', () => {
  describe('onMutate — primary keys only', () => {
    it('cancels queries and applies primaryUpdater to each matching key', async () => {
      const client = makeClient();
      const cancelSpy = jest.spyOn(client, 'cancelQueries');

      // Seed cache under two different primary query keys
      client.setQueryData(['news-feed', undefined], { pages: [['item-a']] });
      client.setQueryData(['other-feed', undefined], { pages: [['item-b']] });

      type Vars = { value: string };
      type Cache = { pages: string[][] };

      const handlers = createOptimisticMutation<Vars, Cache>(client, {
        queryKeys: ['news-feed'] as const,
        primaryUpdater: (old, { value }) => ({
          ...old,
          pages: old.pages.map((p) => p.map((x) => x + value)),
        }),
      });

      await handlers.onMutate!({ value: '-updated' });

      // Cancel was called for the target key
      expect(cancelSpy).toHaveBeenCalledWith({ queryKey: ['news-feed'] });
      // Primary cache updated
      expect(client.getQueryData(['news-feed', undefined])).toEqual({
        pages: [['item-a-updated']],
      });
      // Unrelated cache left alone
      expect(client.getQueryData(['other-feed', undefined])).toEqual({ pages: [['item-b']] });
    });

    it('returns primarySnapshots with the pre-mutation data', async () => {
      const client = makeClient();
      const original = { pages: [['original-item']] };
      client.setQueryData(['test-key', 'a'], original);

      const handlers = createOptimisticMutation<{ x: number }, { pages: string[][] }>(client, {
        queryKeys: ['test-key'] as const,
        primaryUpdater: (old) => ({ ...old, pages: [['replaced']] }),
      });

      const ctx = await handlers.onMutate!({ x: 1 });

      expect(ctx.primarySnapshots).toHaveLength(1);
      expect(ctx.primarySnapshots[0].data).toEqual(original);
    });

    it('skips undefined cache entries (no crash on empty cache)', async () => {
      const client = makeClient();
      // No data seeded

      const handlers = createOptimisticMutation<{ x: number }, { pages: string[][] }>(client, {
        queryKeys: ['missing-key'] as const,
        primaryUpdater: (old) => old,
      });

      await expect(handlers.onMutate!({ x: 1 })).resolves.not.toThrow();
    });
  });

  describe('onMutate — secondary key', () => {
    it('cancels and updates secondary cache with secondaryUpdater', async () => {
      const client = makeClient();
      const cancelSpy = jest.spyOn(client, 'cancelQueries');

      type Vars = { id: string };
      type Primary = { pages: string[][] };
      type Secondary = Record<string, true>;

      client.setQueryData(['primary-key', 'x'], { pages: [['a']] });
      client.setQueryData(['secondary-key', 'x'], { existing: true as const });

      const handlers = createOptimisticMutation<Vars, Primary, Secondary>(client, {
        queryKeys: ['primary-key'] as const,
        secondaryQueryKey: 'secondary-key',
        primaryUpdater: (old) => old,
        secondaryUpdater: (old, { id }) => ({ ...old, [id]: true as const }),
      });

      const ctx = await handlers.onMutate!({ id: 'new-item' });

      expect(cancelSpy).toHaveBeenCalledWith({ queryKey: ['secondary-key'] });
      expect(client.getQueryData(['secondary-key', 'x'])).toEqual({
        existing: true,
        'new-item': true,
      });
      expect(ctx.secondarySnapshots).toHaveLength(1);
      expect(ctx.secondarySnapshots![0].data).toEqual({ existing: true });
    });

    it('applies secondaryUpdater even when cache data is undefined (loading state)', async () => {
      const client = makeClient();

      type Vars = { id: string };
      type Primary = { pages: string[][] };
      type Secondary = Record<string, true>;

      // Simulate a query that exists but has no data yet (still loading).
      // We seed it via getQueryCache to create the entry without data.
      client.getQueryCache().build(client, { queryKey: ['sec-loading', 'user1', ['a']] });

      const handlers = createOptimisticMutation<Vars, Primary, Secondary>(client, {
        queryKeys: ['primary'] as const,
        secondaryQueryKey: 'sec-loading',
        primaryUpdater: (old) => old,
        secondaryUpdater: (old, { id }) => ({ ...(old ?? ({} as Secondary)), [id]: true as const }),
      });

      await handlers.onMutate!({ id: 'new-item' });

      // The updater should have created data even though old was undefined
      expect(client.getQueryData(['sec-loading', 'user1', ['a']])).toEqual({
        'new-item': true,
      });
    });

    it('does not touch secondary cache when secondaryQueryKey is absent', async () => {
      const client = makeClient();
      client.setQueryData(['sec-key', 'x'], { data: 1 });

      const handlers = createOptimisticMutation<{ v: number }, { pages: string[][] }>(client, {
        queryKeys: ['primary-key'] as const,
        primaryUpdater: (old) => old,
      });

      const ctx = await handlers.onMutate!({ v: 1 });
      expect(ctx.secondarySnapshots).toBeUndefined();
      // Secondary key untouched
      expect(client.getQueryData(['sec-key', 'x'])).toEqual({ data: 1 });
    });
  });

  describe('onError — rollback', () => {
    it('restores primary snapshots on error', async () => {
      const client = makeClient();
      const original = { pages: [['original']] };
      client.setQueryData(['feed', 'a'], original);

      const handlers = createOptimisticMutation<{ x: number }, { pages: string[][] }>(client, {
        queryKeys: ['feed'] as const,
        primaryUpdater: () => ({ pages: [['mutated']] }),
      });

      const ctx = await handlers.onMutate!({ x: 1 });
      // Cache is now mutated
      expect(client.getQueryData(['feed', 'a'])).toEqual({ pages: [['mutated']] });

      handlers.onError!(new Error('boom'), { x: 1 }, ctx);
      // Cache restored
      expect(client.getQueryData(['feed', 'a'])).toEqual(original);
    });

    it('restores secondary snapshots on error', async () => {
      const client = makeClient();
      const original: Record<string, true> = { old: true };
      client.setQueryData(['sec', 'a'], original);

      type Vars = { id: string };
      type Primary = { pages: string[][] };
      type Secondary = Record<string, true>;

      const handlers = createOptimisticMutation<Vars, Primary, Secondary>(client, {
        queryKeys: ['primary'] as const,
        secondaryQueryKey: 'sec',
        primaryUpdater: (old) => old,
        secondaryUpdater: (old, { id }) => ({ ...old, [id]: true }),
      });

      const ctx = await handlers.onMutate!({ id: 'added' });
      expect(client.getQueryData(['sec', 'a'])).toEqual({ old: true, added: true });

      handlers.onError!(new Error('boom'), { id: 'added' }, ctx);
      expect(client.getQueryData(['sec', 'a'])).toEqual(original);
    });

    it('calls optional onError callback after rollback', async () => {
      const client = makeClient();
      const onErrorCallback = jest.fn();

      const handlers = createOptimisticMutation<{ x: number }, { pages: string[][] }>(client, {
        queryKeys: ['k'] as const,
        primaryUpdater: (old) => old,
        onError: onErrorCallback,
      });

      const ctx = await handlers.onMutate!({ x: 1 });
      handlers.onError!(new Error('err'), { x: 1 }, ctx);

      expect(onErrorCallback).toHaveBeenCalledWith(new Error('err'), { x: 1 });
    });

    it('does not crash when context is undefined', () => {
      const client = makeClient();
      const handlers = createOptimisticMutation<{ x: number }, { pages: string[][] }>(client, {
        queryKeys: ['k'] as const,
        primaryUpdater: (old) => old,
      });

      expect(() => handlers.onError!(new Error('no ctx'), { x: 1 }, undefined)).not.toThrow();
    });
  });

  describe('onSettled — invalidation', () => {
    it('invalidates all primary query keys', () => {
      const client = makeClient();
      const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

      const handlers = createOptimisticMutation<{ x: number }, { pages: string[][] }>(client, {
        queryKeys: ['key-a', 'key-b'] as const,
        primaryUpdater: (old) => old,
      });

      handlers.onSettled!();

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['key-a'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['key-b'] });
    });

    it('invalidates secondary query key when configured', () => {
      const client = makeClient();
      const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

      type V = { x: number };
      type P = { pages: string[][] };
      type S = Record<string, true>;

      const handlers = createOptimisticMutation<V, P, S>(client, {
        queryKeys: ['primary'] as const,
        secondaryQueryKey: 'secondary',
        primaryUpdater: (old) => old,
        secondaryUpdater: (old) => old,
      });

      handlers.onSettled!();

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['primary'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['secondary'] });
    });

    it('does not invalidate secondary when not configured', () => {
      const client = makeClient();
      const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

      const handlers = createOptimisticMutation<{ x: number }, { pages: string[][] }>(client, {
        queryKeys: ['only-primary'] as const,
        primaryUpdater: (old) => old,
      });

      handlers.onSettled!();

      expect(invalidateSpy).toHaveBeenCalledTimes(1);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['only-primary'] });
    });
  });

  describe('multiple primary query keys', () => {
    it('applies updates to all primary query keys', async () => {
      const client = makeClient();
      client.setQueryData(['feed-a', 'x'], { pages: [['a1']] });
      client.setQueryData(['feed-b', 'x'], { pages: [['b1']] });

      const handlers = createOptimisticMutation<{ v: string }, { pages: string[][] }>(client, {
        queryKeys: ['feed-a', 'feed-b'] as const,
        primaryUpdater: (old, { v }) => ({
          ...old,
          pages: old.pages.map((p) => p.map((x) => x + v)),
        }),
      });

      await handlers.onMutate!({ v: '-updated' });

      expect(client.getQueryData(['feed-a', 'x'])).toEqual({ pages: [['a1-updated']] });
      expect(client.getQueryData(['feed-b', 'x'])).toEqual({ pages: [['b1-updated']] });
    });

    it('restores all primary keys on error', async () => {
      const client = makeClient();
      const origA = { pages: [['a']] };
      const origB = { pages: [['b']] };
      client.setQueryData(['feed-a', 'x'], origA);
      client.setQueryData(['feed-b', 'x'], origB);

      const handlers = createOptimisticMutation<{ v: string }, { pages: string[][] }>(client, {
        queryKeys: ['feed-a', 'feed-b'] as const,
        primaryUpdater: () => ({ pages: [['mutated']] }),
      });

      const ctx = await handlers.onMutate!({ v: 'x' });
      handlers.onError!(new Error('fail'), { v: 'x' }, ctx);

      expect(client.getQueryData(['feed-a', 'x'])).toEqual(origA);
      expect(client.getQueryData(['feed-b', 'x'])).toEqual(origB);
    });
  });
});
