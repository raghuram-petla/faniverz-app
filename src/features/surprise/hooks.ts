import { useQuery } from '@tanstack/react-query';
import { fetchSurpriseContent } from './api';
import { SurpriseCategory } from '@/types';

// @coupling: staleTime 15min (3x default) — admin changes to surprise_content won't reflect for up to 15 minutes on the mobile app. Pull-to-refresh bypasses this via refetch().
export function useSurpriseContent(category?: SurpriseCategory) {
  return useQuery({
    queryKey: ['surprise', category],
    queryFn: () => fetchSurpriseContent(category),
    staleTime: 15 * 60 * 1000,
  });
}
