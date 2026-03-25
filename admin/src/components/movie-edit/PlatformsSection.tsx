'use client';
import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';

import { useAdminPlatforms } from '@/hooks/useAdminPlatforms';
import {
  useMovieAvailability,
  useCountries,
  useAddMovieAvailability,
  useRemoveMovieAvailability,
} from '@/hooks/useAdminMovieAvailability';
import { usePermissions } from '@/hooks/usePermissions';
import { CountryAvailabilityPanel } from './CountryAvailabilityPanel';
import { CountryDropdown } from '@/components/common/CountryDropdown';
import { SearchableCountryPicker } from '@/components/common/SearchableCountryPicker';

// @contract live CRUD for movie-platform availability — changes save immediately (not via dock)
// @coupling useMovieAvailability, useAdminPlatforms, useCountries all auto-refetch on mutation
export interface PlatformsSectionProps {
  movieId: string;
}

export function PlatformsSection({ movieId }: PlatformsSectionProps) {
  const { isReadOnly } = usePermissions();
  const { data: rawAvailability } = useMovieAvailability(movieId);
  /* v8 ignore start */
  const availability = useMemo(() => rawAvailability ?? [], [rawAvailability]);
  /* v8 ignore stop */
  const { data: rawAllPlatforms } = useAdminPlatforms();
  /* v8 ignore start */
  const allPlatforms = rawAllPlatforms ?? [];
  /* v8 ignore stop */
  const { data: rawCountries } = useCountries();
  /* v8 ignore start */
  const countries = useMemo(() => rawCountries ?? [], [rawCountries]);
  /* v8 ignore stop */
  const addAvailability = useAddMovieAvailability();
  const removeAvailability = useRemoveMovieAvailability();

  const populatedCountries = useMemo(() => {
    const codes = [...new Set(availability.map((r) => r.country_code))];
    return codes.sort((a, b) => {
      /* v8 ignore start */
      const orderA = countries.find((c) => c.code === a)?.display_order ?? 999;
      /* v8 ignore stop */
      /* v8 ignore start */
      const orderB = countries.find((c) => c.code === b)?.display_order ?? 999;
      /* v8 ignore stop */
      return orderA - orderB;
    });
  }, [availability, countries]);

  const [activeCountry, setActiveCountry] = useState('IN');
  const [showAddCountry, setShowAddCountry] = useState(false);
  // @contract: manually added empty countries (not yet in availability data)
  const [addedCountries, setAddedCountries] = useState<string[]>([]);

  const allVisibleCountries = useMemo(() => {
    const set = new Set([...populatedCountries, ...addedCountries]);
    return [...set].sort((a, b) => {
      /* v8 ignore start */
      const orderA = countries.find((c) => c.code === a)?.display_order ?? 999;
      /* v8 ignore stop */
      /* v8 ignore start */
      const orderB = countries.find((c) => c.code === b)?.display_order ?? 999;
      /* v8 ignore stop */
      return orderA - orderB;
    });
  }, [populatedCountries, addedCountries, countries]);

  const effectiveCountry = allVisibleCountries.includes(activeCountry)
    ? activeCountry
    : (allVisibleCountries[0] ?? 'IN');

  const activeRows = useMemo(
    () => availability.filter((r) => r.country_code === effectiveCountry),
    [availability, effectiveCountry],
  );

  const countryName = (code: string) => countries.find((c) => c.code === code)?.name ?? code;
  const countByCountry = (code: string) =>
    availability.filter((r) => r.country_code === code).length;

  const handleAddCountry = (code: string) => {
    /* v8 ignore start */
    if (code) {
      /* v8 ignore stop */
      setAddedCountries((prev) => [...new Set([...prev, code])]);
      setActiveCountry(code);
      setShowAddCountry(false);
    }
  };

  const availableCountries = countries.filter((c) => !allVisibleCountries.includes(c.code));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {allVisibleCountries.length > 0 && (
          <CountryDropdown
            countries={allVisibleCountries.map((code) => ({
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
        )}

        {!isReadOnly && !showAddCountry && (
          <button
            onClick={() => setShowAddCountry(true)}
            className="flex items-center gap-1.5 text-sm text-on-surface-muted hover:text-on-surface bg-input hover:bg-input-active px-3 py-2.5 rounded-lg border border-outline"
          >
            <Plus className="w-4 h-4" /> Add Country
          </button>
        )}

        {showAddCountry && (
          <SearchableCountryPicker
            countries={availableCountries}
            onSelect={(code) => handleAddCountry(code)}
            onCancel={() => setShowAddCountry(false)}
          />
        )}
      </div>

      {allVisibleCountries.length === 0 && !showAddCountry && (
        <p className="text-sm text-on-surface-subtle">
          No OTT availability data. Sync this movie from TMDB to populate.
        </p>
      )}

      {effectiveCountry && allVisibleCountries.length > 0 && (
        <CountryAvailabilityPanel
          countryCode={effectiveCountry}
          rows={activeRows}
          movieId={movieId}
          allPlatforms={allPlatforms}
          isReadOnly={isReadOnly}
          onAdd={(data) => addAvailability.mutate({ movie_id: movieId, ...data })}
          onRemove={(id, movie_id) => removeAvailability.mutate({ id, movie_id })}
        />
      )}
    </div>
  );
}
