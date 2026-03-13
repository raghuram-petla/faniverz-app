'use client';
import { createCrudHooks } from '@/hooks/createCrudHooks';
import type { SurpriseContent } from '@/lib/types';

// @coupling: createCrudHooks — delegates all CRUD logic to the generic factory
// @contract: created_at descending — newest surprise content appears first
const crud = createCrudHooks<SurpriseContent>({
  table: 'surprise_content',
  queryKeyBase: 'surprise',
  orderBy: 'created_at',
  orderAscending: false,
  paginated: false,
});

export const useAdminSurprise = crud.useSimpleList;
export const useAdminSurpriseItem = crud.useSingle;
export const useCreateSurprise = crud.useCreate;
export const useUpdateSurprise = crud.useUpdate;
export const useDeleteSurprise = crud.useDelete;
