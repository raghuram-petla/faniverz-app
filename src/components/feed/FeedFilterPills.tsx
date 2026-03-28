import { FEED_PILLS } from '@/constants/feedHelpers';
import { FilterPillBar } from '@/components/common/FilterPillBar';
import type { FeedFilterOption } from '@/types';

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
