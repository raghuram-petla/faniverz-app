import { useQuery } from '@tanstack/react-query';
import { fetchSurpriseContent } from './api';
import { SurpriseCategory } from '@/types';

export function useSurpriseContent(category?: SurpriseCategory) {
  return useQuery({
    queryKey: ['surprise', category],
    queryFn: () => fetchSurpriseContent(category),
    staleTime: 15 * 60 * 1000,
  });
}
