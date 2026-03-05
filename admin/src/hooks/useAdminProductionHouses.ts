'use client';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { ProductionHouse } from '@/lib/types';

const PAGE_SIZE = 50;

/**
 * List production houses. PH admins only see their assigned PHs.
 * Pass productionHouseIds to scope for PH admins.
 */
export function useAdminProductionHouses(search = '', productionHouseIds?: string[]) {
  const hasPHScope = productionHouseIds && productionHouseIds.length > 0;

  return useInfiniteQuery({
    queryKey: ['admin', 'production-houses', search, productionHouseIds],
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
      lastPage.length === PAGE_SIZE ? lastPageParam + 1 : undefined,
    enabled: search.length >= 2 || search === '',
  });
}

export function useAdminProductionHouse(id: string) {
  return useQuery({
    queryKey: ['admin', 'production-house', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_houses')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as ProductionHouse;
    },
    enabled: !!id,
  });
}

export function useCreateProductionHouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (house: Partial<ProductionHouse>) => {
      const { data, error } = await supabase
        .from('production_houses')
        .insert(house)
        .select()
        .single();
      if (error) throw error;
      return data as ProductionHouse;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'production-houses'] });
    },
  });
}

export function useUpdateProductionHouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...house }: Partial<ProductionHouse> & { id: string }) => {
      const { data, error } = await supabase
        .from('production_houses')
        .update(house)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ProductionHouse;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin', 'production-houses'] });
      qc.invalidateQueries({ queryKey: ['admin', 'production-house', data.id] });
    },
  });
}

export function useDeleteProductionHouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('production_houses').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['admin', 'production-houses'] });
      qc.invalidateQueries({ queryKey: ['admin', 'production-house', id] });
    },
  });
}
