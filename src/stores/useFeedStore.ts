import { create } from 'zustand';
import type { FeedFilterOption } from '@/types';

interface FeedState {
  filter: FeedFilterOption;
  setFilter: (filter: FeedFilterOption) => void;
}

// @coupling filter value drives query params in useFeedQuery — must match FeedFilterOption type
// @invariant filter defaults to 'all', showing unfiltered feed on first render
export const useFeedStore = create<FeedState>((set) => ({
  filter: 'all',
  setFilter: (filter) => set({ filter }),
}));
