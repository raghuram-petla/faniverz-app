'use client';
import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import { createCrudHooks } from '@/hooks/createCrudHooks';
import type { ProductionHouse } from '@/lib/types';

const PAGE_SIZE = 50;

// @coupling: createCrudHooks — single/create/update/delete delegated to generic factory
// @edge: enabledFn skips queries for 1-char search strings to avoid noisy partial matches
const crud = createCrudHooks<ProductionHouse>({
  table: 'production_houses',
  queryKeyBase: 'production-houses',
  singleKeyBase: 'production-house',
  orderBy: 'name',
  orderAscending: true,
  searchField: 'name',
  enabledFn: (s) => s.length >= 2 || s === '',
});

/**
 * List production houses. PH admins only see their assigned PHs.
 * Pass productionHouseIds to scope for PH admins.
 */
// @contract: PH admins receive only their scoped production houses; super admins see all
// @assumes: productionHouseIds is populated from the user's role_assignments for PH scoping
// @nullable: productionHouseIds — omit or pass empty to get unscoped (super admin) results
export function useAdminProductionHouses(
  search = '',
  productionHouseIds?: string[],
  // @edge: set to false to skip the query until needed (e.g., when PH role isn't selected)
  enabled = true,
) {
  const hasPHScope = productionHouseIds && productionHouseIds.length > 0;
  // @contract: sorted IDs for stable cache key — prevents redundant refetches on array reorder
  const sortedIds = useMemo(() => productionHouseIds?.slice().sort(), [productionHouseIds]);

  return useInfiniteQuery({
    queryKey: ['admin', 'production-houses', search, sortedIds],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase.from('production_houses').select('*').order('name').range(from, to);
      if (hasPHScope) {
        query = query.in('id', productionHouseIds);
      }
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as ProductionHouse[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length < PAGE_SIZE ? undefined : lastPageParam + 1,
    // @contract: both conditions must hold — caller's enabled flag AND search length check
    enabled: enabled && (search.length >= 2 || search === ''),
  });
}

export const useAdminProductionHouse = crud.useSingle;
export const useCreateProductionHouse = crud.useCreate;
export const useUpdateProductionHouse = crud.useUpdate;
export const useDeleteProductionHouse = crud.useDelete;
