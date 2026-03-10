import { create } from 'zustand';
import { MovieStatus } from '@/types';

type FilterType = 'all' | MovieStatus;
export type SortBy = 'popular' | 'top_rated' | 'latest' | 'upcoming';

interface FilterState {
  selectedFilter: FilterType;
  selectedGenres: string[];
  selectedPlatforms: string[];
  selectedProductionHouses: string[];
  sortBy: SortBy;
  searchQuery: string;
  setFilter: (filter: FilterType) => void;
  toggleGenre: (genre: string) => void;
  togglePlatform: (platformId: string) => void;
  toggleProductionHouse: (id: string) => void;
  setSortBy: (sortBy: SortBy) => void;
  setSearchQuery: (query: string) => void;
  clearAll: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  selectedFilter: 'all',
  selectedGenres: [],
  selectedPlatforms: [],
  selectedProductionHouses: [],
  sortBy: 'popular',
  searchQuery: '',

  setFilter: (filter) => set({ selectedFilter: filter }),

  toggleGenre: (genre) =>
    set((state) => ({
      selectedGenres: state.selectedGenres.includes(genre)
        ? state.selectedGenres.filter((g) => g !== genre)
        : [...state.selectedGenres, genre],
    })),

  togglePlatform: (platformId) =>
    set((state) => ({
      selectedPlatforms: state.selectedPlatforms.includes(platformId)
        ? state.selectedPlatforms.filter((p) => p !== platformId)
        : [...state.selectedPlatforms, platformId],
    })),

  toggleProductionHouse: (id) =>
    set((state) => ({
      selectedProductionHouses: state.selectedProductionHouses.includes(id)
        ? state.selectedProductionHouses.filter((p) => p !== id)
        : [...state.selectedProductionHouses, id],
    })),

  setSortBy: (sortBy) => set({ sortBy }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  clearAll: () =>
    set({
      selectedFilter: 'all',
      selectedGenres: [],
      selectedPlatforms: [],
      selectedProductionHouses: [],
      sortBy: 'popular',
      searchQuery: '',
    }),
}));
