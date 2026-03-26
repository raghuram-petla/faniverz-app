'use client';
import { useState, useMemo } from 'react';

import { useAdminPlatforms } from '@/hooks/useAdminPlatforms';
import { useCountries } from '@/hooks/useAdminMovieAvailability';
import { usePermissions } from '@/hooks/usePermissions';
import { CountryAvailabilityPanel } from './CountryAvailabilityPanel';
import { CountryDropdown } from '@/components/common/CountryDropdown';
import { MultiCountrySelector } from '@/components/common/MultiCountrySelector';
import { INPUT_CLASSES } from '@/components/common/FormField';
import { Button } from '@/components/common/Button';
import type { MoviePlatformAvailability, AvailabilityType, OTTPlatform } from '@shared/types';

const AVAIL_LABELS: Record<AvailabilityType, string> = {
  flatrate: 'Stream',
  rent: 'Rent',
  buy: 'Buy',
  ads: 'Free with Ads',
  free: 'Free',
};
const AVAIL_ORDER: AvailabilityType[] = ['flatrate', 'rent', 'buy', 'ads', 'free'];

// @contract Pending-state driven OTT availability section with multi-country add form
export interface PlatformsSectionProps {
  visibleAvailability: MoviePlatformAvailability[];
  pendingIds: Set<string>;
  showAddForm: boolean;
  onCloseAddForm: () => void;
  onAdd: (data: {
    platform_id: string;
    country_code: string;
    availability_type: AvailabilityType;
    available_from: string | null;
    streaming_url: string | null;
    _platform?: OTTPlatform;
  }) => void;
  onRemove: (id: string, isPending: boolean) => void;
}

export function PlatformsSection({
  visibleAvailability,
  pendingIds,
  showAddForm,
  onCloseAddForm,
  onAdd,
  onRemove,
}: PlatformsSectionProps) {
  const { isReadOnly } = usePermissions();
  const { data: rawAllPlatforms } = useAdminPlatforms();
  /* v8 ignore start */
  const allPlatforms = useMemo(() => rawAllPlatforms ?? [], [rawAllPlatforms]);
  /* v8 ignore stop */
  const { data: rawCountries } = useCountries();
  /* v8 ignore start */
  const countries = useMemo(() => rawCountries ?? [], [rawCountries]);
  /* v8 ignore stop */

  // ── Country dropdown state ──
  const populatedCountries = useMemo(() => {
    const codes = [...new Set(visibleAvailability.map((r) => r.country_code))];
    return codes.sort((a, b) => {
      /* v8 ignore start */
      const orderA = countries.find((c) => c.code === a)?.display_order ?? 999;
      const orderB = countries.find((c) => c.code === b)?.display_order ?? 999;
      /* v8 ignore stop */
      return orderA - orderB;
    });
  }, [visibleAvailability, countries]);

  const [activeCountry, setActiveCountry] = useState('IN');
  const effectiveCountry = populatedCountries.includes(activeCountry)
    ? activeCountry
    : (populatedCountries[0] ?? 'IN');

  const activeRows = useMemo(
    () => visibleAvailability.filter((r) => r.country_code === effectiveCountry),
    [visibleAvailability, effectiveCountry],
  );
  const countryName = (code: string) => countries.find((c) => c.code === code)?.name ?? code;
  const countByCountry = (code: string) =>
    visibleAvailability.filter((r) => r.country_code === code).length;

  // ── Add form state ──
  const [selectedPlatformId, setSelectedPlatformId] = useState('');
  const [availType, setAvailType] = useState<AvailabilityType>('flatrate');
  const [availableFrom, setAvailableFrom] = useState('');
  const [streamingUrl, setStreamingUrl] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set());

  // @contract Build dedup set from ALL availability
  const allExistingKeys = useMemo(
    () =>
      new Set(
        visibleAvailability.map((r) => `${r.platform_id}:${r.availability_type}:${r.country_code}`),
      ),
    [visibleAvailability],
  );

  // @contract Filter platforms available in ANY selected country's regions
  const availablePlatforms = useMemo(
    () =>
      selectedCountries.size === 0
        ? allPlatforms
        : allPlatforms.filter((p) => (p.regions ?? []).some((r) => selectedCountries.has(r))),
    [allPlatforms, selectedCountries],
  );

  const handleAdd = () => {
    const platform = allPlatforms.find((p) => p.id === selectedPlatformId);
    for (const cc of selectedCountries) {
      const key = `${selectedPlatformId}:${availType}:${cc}`;
      if (allExistingKeys.has(key)) continue;
      onAdd({
        platform_id: selectedPlatformId,
        country_code: cc,
        availability_type: availType,
        available_from: availableFrom || null,
        streaming_url: streamingUrl || null,
        _platform: platform,
      });
    }
    setSelectedPlatformId('');
    setAvailType('flatrate');
    setAvailableFrom('');
    setStreamingUrl('');
    setSelectedCountries(new Set());
    onCloseAddForm();
  };

  const addButtonLabel = useMemo(() => {
    if (selectedCountries.size === countries.length && countries.length > 1)
      return 'Add to all countries';
    if (selectedCountries.size > 1) return `Add to ${selectedCountries.size} countries`;
    return 'Add';
  }, [selectedCountries.size, countries.length]);

  return (
    <div className="space-y-4">
      {/* Add form — top level, triggered by SectionCard header button */}
      {!isReadOnly && showAddForm && (
        <div className="bg-surface-elevated rounded-xl p-4 space-y-3">
          <MultiCountrySelector
            countries={countries}
            selectedCodes={selectedCountries}
            onChange={setSelectedCountries}
          />
          <div className="flex gap-3">
            <select
              value={selectedPlatformId}
              onChange={(e) => setSelectedPlatformId(e.target.value)}
              className={`flex-[3] min-w-0 ${INPUT_CLASSES.compact}`}
            >
              <option value="">Select platform…</option>
              {availablePlatforms.map((p) => (
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
            <Button
              variant="primary"
              size="md"
              disabled={!selectedPlatformId || selectedCountries.size === 0}
              onClick={handleAdd}
            >
              {addButtonLabel}
            </Button>
            <button
              onClick={onCloseAddForm}
              className="text-on-surface-muted px-4 py-2 rounded-lg text-sm hover:bg-input"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Country display — dropdown to switch between countries */}
      {populatedCountries.length > 0 && (
        <>
          <CountryDropdown
            countries={populatedCountries.map((code) => ({
              code,
              name: countryName(code),
              display_order: countries.find((c) => c.code === code)?.display_order ?? 999,
            }))}
            value={effectiveCountry}
            onChange={setActiveCountry}
            formatLabel={(c) => {
              const count = countByCountry(c.code);
              return count > 0 ? `${c.name} (${count})` : c.name;
            }}
          />
          <CountryAvailabilityPanel
            rows={activeRows}
            isReadOnly={isReadOnly}
            pendingIds={pendingIds}
            onRemove={onRemove}
          />
        </>
      )}

      {populatedCountries.length === 0 && !showAddForm && (
        <p className="text-sm text-on-surface-subtle">
          No OTT availability data. Click + Add to add platforms, or sync from TMDB.
        </p>
      )}
    </div>
  );
}
