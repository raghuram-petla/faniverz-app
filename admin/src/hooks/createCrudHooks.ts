'use client';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { crudFetch } from '@/lib/admin-crud-client';

const DEFAULT_PAGE_SIZE = 50;

export interface CrudConfig {
  /** Supabase table name */
  table: string;
  /** Base query key, e.g. 'movies' → ['admin', 'movies'] */
  queryKeyBase: string;
  /** Key for single-item queries, e.g. 'movie' → ['admin', 'movie', id]. Defaults to queryKeyBase */
  singleKeyBase?: string;
  /** Column to order by */
  orderBy: string;
  /** Sort direction (default false = descending) */
  orderAscending?: boolean;
  /** Column to ilike-search on */
  searchField?: string;
  /** Items per page for paginated lists (default 50) */
  pageSize?: number;
  /** false = useQuery with limit instead of useInfiniteQuery (default true) */
  paginated?: boolean;
  /** Custom select string (default '*') */
  select?: string;
  /** Custom enabled logic for list queries */
  enabledFn?: (search: string) => boolean;
  /** Additional query key prefixes to invalidate on any mutation */
  extraInvalidateKeys?: readonly string[][];
}

// @contract T must have an 'id' field — used for single-item invalidation and update/delete keys
// @boundary Reads via Supabase browser client (RLS); writes via /api/admin-crud (service role)
export function createCrudHooks<T extends { id: string }>(config: CrudConfig) {
  const {
    table,
    queryKeyBase,
    singleKeyBase = queryKeyBase,
    orderBy,
    orderAscending = false,
    searchField,
    select = '*',
    paginated = true,
    pageSize = DEFAULT_PAGE_SIZE,
    enabledFn,
    extraInvalidateKeys = [],
  } = config;

  const listKey = ['admin', queryKeyBase] as const;
  const singleKey = (id: string) => ['admin', singleKeyBase, id] as const;

  function invalidateExtra(qc: ReturnType<typeof useQueryClient>) {
    for (const key of extraInvalidateKeys) {
      qc.invalidateQueries({ queryKey: key });
    }
  }

  function usePaginatedList(search = '') {
    return useInfiniteQuery({
      queryKey: [...listKey, search],
      queryFn: async ({ pageParam = 0 }) => {
        const from = pageParam * pageSize;
        const to = from + pageSize - 1;
        let query = supabase
          .from(table)
          .select(select)
          .order(orderBy, { ascending: orderAscending })
          .range(from, to);
        if (search && searchField) query = query.ilike(searchField, `%${search}%`);
        const { data, error } = await query;
        if (error) throw error;
        return data as unknown as T[];
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage: T[], _allPages: T[][], lastPageParam: number) =>
        lastPage.length === pageSize ? lastPageParam + 1 : undefined,
      // @invariant paginated is a static factory param — guard prevents firing when not needed
      enabled: paginated && (enabledFn ? enabledFn(search) : true),
    });
  }

  // @edge Hard limit of 5000 rows — no pagination; suitable only for small reference tables
  // @invariant enabled:!paginated prevents a redundant 5000-row fetch when hook is called
  // unconditionally alongside usePaginatedList (required by rules-of-hooks)
  function useSimpleList() {
    return useQuery({
      queryKey: [...listKey],
      enabled: !paginated,
      queryFn: async () => {
        const { data, error } = await supabase
          .from(table)
          .select(select)
          .order(orderBy, { ascending: orderAscending })
          .limit(5000);
        if (error) throw error;
        return data as unknown as T[];
      },
    });
  }

  // @invariant paginated is a static factory parameter — always calls both hooks so
  // hook call order is stable across renders; returns appropriate result based on config
  function useList(search = '') {
    const paginatedResult = usePaginatedList(search);
    const simpleResult = useSimpleList();
    return paginated ? paginatedResult : simpleResult;
  }

  function useSingle(id: string) {
    return useQuery({
      queryKey: singleKey(id),
      queryFn: async () => {
        const { data, error } = await supabase.from(table).select(select).eq('id', id).single();
        if (error) throw error;
        return data as unknown as T;
      },
      enabled: !!id,
    });
  }

  // @sideeffect: writes via /api/admin-crud using service role (bypasses RLS)
  function useCreate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (entity: Partial<T>) => {
        return crudFetch<T>('POST', { table, data: entity });
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [...listKey] });
        invalidateExtra(qc);
      },
      onError: (error: Error) => {
        window.alert(error.message || 'Operation failed');
      },
    });
  }

  // @sideeffect: writes via /api/admin-crud using service role (bypasses RLS)
  function useUpdate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async ({ id, ...entity }: Partial<T> & { id: string }) => {
        return crudFetch<T>('PATCH', { table, id, data: entity });
      },
      onSuccess: (data: T) => {
        qc.invalidateQueries({ queryKey: [...listKey] });
        qc.invalidateQueries({ queryKey: singleKey(data.id) });
        invalidateExtra(qc);
      },
      onError: (error: Error) => {
        window.alert(error.message || 'Operation failed');
      },
    });
  }

  // @sideeffect: writes via /api/admin-crud using service role (bypasses RLS)
  function useDelete() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (id: string) => {
        await crudFetch<{ success: true }>('DELETE', { table, id });
        return id;
      },
      onSuccess: (id: string) => {
        qc.invalidateQueries({ queryKey: [...listKey] });
        qc.invalidateQueries({ queryKey: singleKey(id) });
        invalidateExtra(qc);
      },
      onError: (error: Error) => {
        window.alert(error.message || 'Operation failed');
      },
    });
  }

  return { useList, usePaginatedList, useSimpleList, useSingle, useCreate, useUpdate, useDelete };
}
