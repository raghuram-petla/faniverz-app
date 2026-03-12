'use client';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';

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
}

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
  } = config;

  const listKey = ['admin', queryKeyBase] as const;
  const singleKey = (id: string) => ['admin', singleKeyBase, id] as const;

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
      enabled: enabledFn ? enabledFn(search) : true,
    });
  }

  function useSimpleList() {
    return useQuery({
      queryKey: [...listKey],
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

  function useList(search = '') {
    if (paginated) return usePaginatedList(search);
    return useSimpleList();
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

  function useCreate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (entity: Partial<T>) => {
        const { data, error } = await supabase.from(table).insert(entity).select().single();
        if (error) throw error;
        return data as unknown as T;
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: [...listKey] });
      },
      onError: (error: Error) => {
        window.alert(error.message || 'Operation failed');
      },
    });
  }

  function useUpdate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async ({ id, ...entity }: Partial<T> & { id: string }) => {
        const { data, error } = await supabase
          .from(table)
          .update(entity)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data as unknown as T;
      },
      onSuccess: (data: T) => {
        qc.invalidateQueries({ queryKey: [...listKey] });
        qc.invalidateQueries({ queryKey: singleKey(data.id) });
      },
      onError: (error: Error) => {
        window.alert(error.message || 'Operation failed');
      },
    });
  }

  function useDelete() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
        return id;
      },
      onSuccess: (id: string) => {
        qc.invalidateQueries({ queryKey: [...listKey] });
        qc.invalidateQueries({ queryKey: singleKey(id) });
      },
      onError: (error: Error) => {
        window.alert(error.message || 'Operation failed');
      },
    });
  }

  return { useList, usePaginatedList, useSimpleList, useSingle, useCreate, useUpdate, useDelete };
}
