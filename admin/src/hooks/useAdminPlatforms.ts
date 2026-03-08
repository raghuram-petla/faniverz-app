'use client';
import { createCrudHooks } from '@/hooks/createCrudHooks';
import type { OTTPlatform } from '@/lib/types';

const crud = createCrudHooks<OTTPlatform>({
  table: 'platforms',
  queryKeyBase: 'platforms',
  orderBy: 'display_order',
  orderAscending: true,
  paginated: false,
});

export const useAdminPlatforms = crud.useSimpleList;
export const useCreatePlatform = crud.useCreate;
export const useUpdatePlatform = crud.useUpdate;
export const useDeletePlatform = crud.useDelete;
