'use client';
import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import type { MoviePlatformAvailability, OTTPlatform, AvailabilityType } from '@shared/types';
import { AvailabilityRow } from './AvailabilityRow';
import { INPUT_CLASSES } from '@/components/common/FormField';
import { Button } from '@/components/common/Button';

const AVAIL_LABELS: Record<AvailabilityType, string> = {
  flatrate: 'Stream',
  rent: 'Rent',
  buy: 'Buy',
  ads: 'Free with Ads',
  free: 'Free',
};
const AVAIL_ORDER: AvailabilityType[] = ['flatrate', 'rent', 'buy', 'ads', 'free'];

export interface CountryAvailabilityPanelProps {
  countryCode: string;
  rows: MoviePlatformAvailability[];
  movieId: string;
  allPlatforms: OTTPlatform[];
  isReadOnly: boolean;
  onAdd: (data: {
    platform_id: string;
    country_code: string;
    availability_type: AvailabilityType;
    available_from: string | null;
    streaming_url: string | null;
  }) => void;
  onRemove: (id: string, movieId: string) => void;
}

export function CountryAvailabilityPanel({
  countryCode,
  rows,
  movieId,
  allPlatforms,
  isReadOnly,
  onAdd,
  onRemove,
}: CountryAvailabilityPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPlatformId, setSelectedPlatformId] = useState('');
  const [availType, setAvailType] = useState<AvailabilityType>('flatrate');
  const [availableFrom, setAvailableFrom] = useState('');
  const [streamingUrl, setStreamingUrl] = useState('');
  const [manualCollapsed, setManualCollapsed] = useState<
    Partial<Record<AvailabilityType, boolean>>
  >({});
  // @invariant rows grouped by AvailabilityType and rendered in AVAIL_ORDER for consistent section ordering
  const grouped = new Map<AvailabilityType, MoviePlatformAvailability[]>();
  for (const r of rows) {
    const list = grouped.get(r.availability_type) ?? [];
    list.push(r);
    grouped.set(r.availability_type, list);
  }

  const existingKeys = new Set(rows.map((r) => `${r.platform_id}:${r.availability_type}`));

  const handleAdd = () => {
    onAdd({
      platform_id: selectedPlatformId,
      country_code: countryCode,
      availability_type: availType,
      available_from: availableFrom || null,
      streaming_url: streamingUrl || null,
    });
    setSelectedPlatformId('');
    setAvailableFrom('');
    setStreamingUrl('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-3">
      {/* Availability type sections */}
      {AVAIL_ORDER.map((type) => {
        const items = grouped.get(type) ?? [];
        // @contract: sections with data default to expanded; empty sections hidden
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
                  <AvailabilityRow key={r.id} row={r} onRemove={onRemove} isReadOnly={isReadOnly} />
                ))}
                {items.length === 0 && (
                  <p className="text-xs text-on-surface-disabled pl-6">
                    No {AVAIL_LABELS[type].toLowerCase()} providers
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Add button */}
      {!isReadOnly && !showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 text-sm text-on-surface-muted hover:text-on-surface"
        >
          <Plus className="w-4 h-4" /> Add platform
        </button>
      )}

      {/* Add form — below everything */}
      {!isReadOnly && showAddForm && (
        <div className="bg-surface-elevated rounded-xl p-4 space-y-3">
          <div className="flex gap-3">
            <select
              value={selectedPlatformId}
              onChange={(e) => setSelectedPlatformId(e.target.value)}
              className={`flex-[3] min-w-0 ${INPUT_CLASSES.compact}`}
            >
              <option value="">Select platform…</option>
              {allPlatforms
                .filter(
                  (p) =>
                    !existingKeys.has(`${p.id}:${availType}`) &&
                    (p.regions ?? []).includes(countryCode),
                )
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
            <select
              value={availType}
              onChange={(e) => setAvailType(e.target.value as AvailabilityType)}
              className={`flex-[2] min-w-0 ${INPUT_CLASSES.compact}`}
            >
              {AVAIL_ORDER.map((t) => (
                <option key={t} value={t}>
                  {AVAIL_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <input
              type="date"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
              placeholder="Available from"
              className={`flex-1 ${INPUT_CLASSES.compact}`}
            />
            <input
              type="url"
              value={streamingUrl}
              onChange={(e) => setStreamingUrl(e.target.value)}
              placeholder="Streaming URL (optional)"
              className={`flex-[2] ${INPUT_CLASSES.compact}`}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="md" disabled={!selectedPlatformId} onClick={handleAdd}>
              Add
            </Button>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-on-surface-muted px-4 py-2 rounded-lg text-sm hover:bg-input"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
