'use client';

import { useState, useMemo } from 'react';
import { useAdminPlatforms, useDeletePlatform } from '@/hooks/useAdminPlatforms';
import { useCountries } from '@/hooks/useAdminMovieAvailability';
import { usePermissions } from '@/hooks/usePermissions';
import { Monitor, Pencil, Trash2, Loader2, Link2, Plus } from 'lucide-react';
import { getImageUrl } from '@shared/imageUrl';
import { CountryDropdown } from '@/components/common/CountryDropdown';
import Link from 'next/link';

export default function PlatformsPage() {
  const { isReadOnly, canDeleteTopLevel } = usePermissions();
  const { data: platforms, isLoading } = useAdminPlatforms();
  const { data: countries = [] } = useCountries();
  const deletePlatform = useDeletePlatform();
  const [selectedCountry, setSelectedCountry] = useState('IN');

  // @contract: filter platforms to those whose regions include the selected country
  const filteredPlatforms = useMemo(
    () => (platforms ?? []).filter((p) => (p.regions ?? []).includes(selectedCountry)),
    [platforms, selectedCountry],
  );

  // @contract: count how many platforms exist per country for the dropdown
  const countriesWithPlatforms = useMemo(() => {
    const countMap = new Map<string, number>();
    for (const p of platforms ?? []) {
      for (const r of p.regions ?? []) {
        countMap.set(r, (countMap.get(r) ?? 0) + 1);
      }
    }
    // Sort: countries with platforms first (by display_order), then rest
    return countries
      .filter((c) => countMap.has(c.code))
      .map((c) => ({ ...c, platformCount: countMap.get(c.code) ?? 0 }));
  }, [platforms, countries]);

  const handleDelete = (id: string) => {
    if (!confirm('Delete this platform? This will also remove all related OTT releases.')) return;
    deletePlatform.mutate(id);
  };

  return (
    <div className="space-y-6">
      {/* Country selector */}
      <div className="flex items-center gap-4">
        <CountryDropdown
          countries={countriesWithPlatforms}
          value={selectedCountry}
          onChange={setSelectedCountry}
          formatLabel={(c) => {
            const count = (c as (typeof countriesWithPlatforms)[number]).platformCount;
            return `${c.name} (${count})`;
          }}
        />
        <span className="text-sm text-on-surface-subtle">
          {filteredPlatforms.length} platform{filteredPlatforms.length !== 1 ? 's' : ''}
        </span>
        {!isReadOnly && (
          <Link
            href={`/platforms/new?country=${selectedCountry}`}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors font-medium ml-auto shrink-0 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Platform
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-on-surface-subtle animate-spin" />
        </div>
      ) : filteredPlatforms.length === 0 ? (
        <div className="text-center py-20 text-on-surface-subtle">
          No platforms available in this country.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlatforms.map((platform) => (
            <div
              key={platform.id}
              className="bg-surface-card border border-outline rounded-xl p-5 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {platform.logo_url ? (
                    <img
                      src={getImageUrl(platform.logo_url, 'sm', 'PLATFORMS') ?? platform.logo_url}
                      alt={platform.name}
                      className="w-12 h-12 rounded-lg object-contain border border-outline shrink-0"
                    />
                  ) : (
                    <span className="w-12 h-12 rounded-lg flex items-center justify-center bg-zinc-700 shrink-0">
                      <Monitor className="w-5 h-5 text-on-surface-subtle" />
                    </span>
                  )}
                  <h3 className="text-on-surface font-semibold text-lg min-w-0 break-words">
                    {platform.name}
                  </h3>
                </div>
                {!isReadOnly && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      href={`/platforms/${platform.id}`}
                      className="p-2 text-on-surface-subtle hover:text-status-blue transition-colors"
                      title="Edit platform"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                    {canDeleteTopLevel() && (
                      <button
                        onClick={() => handleDelete(platform.id)}
                        disabled={deletePlatform.isPending}
                        className="p-2 text-on-surface-subtle hover:text-status-red transition-colors disabled:opacity-50"
                        title="Delete platform"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="text-sm border-t border-outline pt-2">
                <span
                  className={`flex items-center gap-1.5 ${platform.tmdb_provider_id ? 'text-on-surface-subtle' : 'text-on-surface-disabled'}`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  {platform.tmdb_provider_id
                    ? `TMDB #${platform.tmdb_provider_id}`
                    : 'TMDB ID not set'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
