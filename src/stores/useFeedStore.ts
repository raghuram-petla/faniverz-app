import { create } from 'zustand';
import type { FeedFilterOption } from '@/types';

interface FeedState {
  filter: FeedFilterOption;
  setFilter: (filter: FeedFilterOption) => void;
}

export const useFeedStore = create<FeedState>((set) => ({
  filter: 'all',
  setFilter: (filter) => set({ filter }),
}));
