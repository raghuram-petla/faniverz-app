import { FEED_PILLS } from '@/constants/feedHelpers';
import { FilterPillBar } from '@/components/common/FilterPillBar';
import type { FeedFilterOption } from '@/types';

/** @invariant Measured pill bar height — paddingVertical(6)*2 + fontSize(18) + border(1)*2 + paddingBottom(8) */
export const FEED_PILL_BAR_HEIGHT = 40;

export interface FeedFilterPillsProps {
  filter: FeedFilterOption;
  setFilter: (f: FeedFilterOption) => void;
}

/** @coupling FEED_PILLS — pill config drives available filter options and their colors */
/** @contract Delegates to FilterPillBar — single source of truth for pill styling */
export function FeedFilterPills({ filter, setFilter }: FeedFilterPillsProps) {
  return (
    <FilterPillBar
      pills={FEED_PILLS}
      activeValue={filter}
      onSelect={(v) => setFilter(v as FeedFilterOption)}
    />
  );
}
