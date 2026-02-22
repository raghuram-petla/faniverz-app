import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ReleaseTypeFilter = 'all' | 'theatrical' | 'ott';
export type SortBy = 'date_asc' | 'date_desc' | 'popularity' | 'rating';

interface FilterState {
  releaseType: ReleaseTypeFilter;
  sortBy: SortBy;
  setReleaseType: (releaseType: ReleaseTypeFilter) => void;
  setSortBy: (sortBy: SortBy) => void;
}

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      releaseType: 'all',
      sortBy: 'date_asc',
      setReleaseType: (releaseType) => set({ releaseType }),
      setSortBy: (sortBy) => set({ sortBy }),
    }),
    {
      name: 'faniverz-filters',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
