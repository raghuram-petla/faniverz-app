import { create } from 'zustand';
import { FEED_PILLS } from '@/constants/feedHelpers';
import type { FeedFilterOption } from '@/types';

interface FeedState {
  filter: FeedFilterOption;
  pageIndex: number;
  setFilter: (filter: FeedFilterOption) => void;
  setPageIndex: (index: number) => void;
}

// @coupling filter value drives query params in useFeedQuery — must match FeedFilterOption type
// @invariant filter defaults to 'all', showing unfiltered feed on first render
// @sync pageIndex and filter are kept in sync — changing one updates the other
export const useFeedStore = create<FeedState>((set) => ({
  filter: 'all',
  pageIndex: 0,
  setFilter: (filter) => {
    const index = FEED_PILLS.findIndex((p) => p.value === filter);
    set({ filter, pageIndex: index >= 0 ? index : 0 });
  },
  setPageIndex: (pageIndex) => {
    const pill = FEED_PILLS[pageIndex];
    if (pill) set({ pageIndex, filter: pill.value as FeedFilterOption });
  },
}));
