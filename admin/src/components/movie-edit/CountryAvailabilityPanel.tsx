'use client';
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { MoviePlatformAvailability, AvailabilityType } from '@shared/types';
import { AvailabilityRow } from './AvailabilityRow';

const AVAIL_LABELS: Record<AvailabilityType, string> = {
  flatrate: 'Stream',
  rent: 'Rent',
  buy: 'Buy',
  ads: 'Free with Ads',
  free: 'Free',
};
const AVAIL_ORDER: AvailabilityType[] = ['flatrate', 'rent', 'buy', 'ads', 'free'];

// @contract Display-only panel for a single country's availability rows (grouped by type)
export interface CountryAvailabilityPanelProps {
  rows: MoviePlatformAvailability[];
  isReadOnly: boolean;
  pendingIds: Set<string>;
  onRemove: (id: string, isPending: boolean) => void;
}

export function CountryAvailabilityPanel({
  rows,
  isReadOnly,
  pendingIds,
  onRemove,
}: CountryAvailabilityPanelProps) {
  const [manualCollapsed, setManualCollapsed] = useState<
    Partial<Record<AvailabilityType, boolean>>
  >({});

  const grouped = new Map<AvailabilityType, MoviePlatformAvailability[]>();
  for (const r of rows) {
    const list = grouped.get(r.availability_type) ?? [];
    list.push(r);
    grouped.set(r.availability_type, list);
  }

  if (rows.length === 0) {
    return <p className="text-sm text-on-surface-subtle">No platforms for this country yet.</p>;
  }

  return (
    <div className="space-y-3">
      {AVAIL_ORDER.map((type) => {
        const items = grouped.get(type) ?? [];
        const isOpen =
          manualCollapsed[type] !== undefined ? !manualCollapsed[type] : items.length > 0;
        if (items.length === 0 && !isOpen) return null;
        return (
          <div key={type}>
            <button
              onClick={() => setManualCollapsed((c) => ({ ...c, [type]: isOpen }))}
              className="flex items-center gap-2 text-sm font-medium text-on-surface-muted hover:text-on-surface w-full py-1"
            >
              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              {AVAIL_LABELS[type]} ({items.length})
            </button>
            {isOpen && (
              <div className="space-y-2 mt-1">
                {items.map((r) => (
                  <AvailabilityRow
                    key={r.id}
                    row={r}
                    isPending={pendingIds.has(r.id)}
                    onRemove={(id) => onRemove(id, pendingIds.has(id))}
                    isReadOnly={isReadOnly}
                  />
                ))}
                {/* v8 ignore start */}
                {items.length === 0 && (
                  /* v8 ignore stop */
                  <p className="text-xs text-on-surface-disabled pl-6">
                    No {AVAIL_LABELS[type].toLowerCase()} providers
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
