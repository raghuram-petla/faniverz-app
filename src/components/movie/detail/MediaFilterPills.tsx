import { useMemo } from 'react';
import { FilterPillBar } from '@/components/common/FilterPillBar';
import type { FilterPillConfig } from '@/components/common/FilterPillBar';

/** @contract Horizontal scrollable pill bar for filtering media by category */
export interface MediaFilterPillsProps {
  /** @assumes First category is always "All" — no validation enforced */
  categories: string[];
  active: string;
  onSelect: (category: string) => void;
}

/** @contract Delegates to FilterPillBar — single source of truth for pill styling */
export function MediaFilterPills({ categories, active, onSelect }: MediaFilterPillsProps) {
  const pills: FilterPillConfig[] = useMemo(
    () => categories.map((cat) => ({ label: cat, value: cat })),
    [categories],
  );

  return (
    <FilterPillBar pills={pills} activeValue={active} onSelect={onSelect} showBackground={false} />
  );
}
