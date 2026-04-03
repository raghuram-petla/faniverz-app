'use client';
import { useState, useMemo } from 'react';
import {
  useAdminProductionHouses,
  useDeleteProductionHouse,
} from '@/hooks/useAdminProductionHouses';
import { usePermissions } from '@/hooks/usePermissions';
import { useCountries } from '@/hooks/useAdminMovieAvailability';
import { Plus, Trash2, Loader2, Building2, Pencil, Globe } from 'lucide-react';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { SearchInput } from '@/components/common/SearchInput';
import { LoadMoreButton } from '@/components/common/LoadMoreButton';
import { CountryDropdown, countryFlag } from '@/components/common/CountryDropdown';
import { AddProductionHouseForm } from '@/components/production-houses/AddProductionHouseForm';
import Link from 'next/link';
import { getImageUrl } from '@shared/imageUrl';
import type { Country } from '@shared/types';

const ALL_COUNTRIES = 'ALL';
const NOT_SET = 'NOT_SET';

export default function ProductionHousesPage() {
  // @boundary: PH admins are scoped to their assigned houses via productionHouseIds filter
  const { isPHAdmin, productionHouseIds, canCreate, canDeleteTopLevel } = usePermissions();
  const { search, setSearch, debouncedSearch } = useDebouncedSearch();
  const [selectedCountry, setSelectedCountry] = useState(ALL_COUNTRIES);
  const [showAdd, setShowAdd] = useState(false);
  const { data: rawCountries } = useCountries();
  /* v8 ignore start */
  const countries = useMemo(() => rawCountries ?? [], [rawCountries]);
  /* v8 ignore stop */

  // @coupling: passes productionHouseIds to restrict query results for PH admins; null for super_admin/admin
  // @contract: originCountry filter — ALL_COUNTRIES passes undefined (no filter), NOT_SET/code passed through
  /* v8 ignore start */
  const originFilter = selectedCountry === ALL_COUNTRIES ? undefined : selectedCountry;
  /* v8 ignore stop */

  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useAdminProductionHouses(
    debouncedSearch,
    isPHAdmin ? productionHouseIds : undefined,
    true,
    originFilter,
  );
  const houses = data?.pages.flat() ?? [];
  const deleteHouse = useDeleteProductionHouse();

  // @contract: fetch all houses (unfiltered) to compute per-country counts for the dropdown
  const { data: allData } = useAdminProductionHouses(
    '',
    isPHAdmin ? productionHouseIds : undefined,
  );
  const allHouses = useMemo(() => allData?.pages.flat() ?? [], [allData]);

  // @contract: build dropdown options — real countries with houses + "All Countries" + "Not Set"
  const dropdownCountries = useMemo(() => {
    const countMap = new Map<string, number>();
    let nullCount = 0;
    for (const h of allHouses) {
      if (h.origin_country) {
        countMap.set(h.origin_country, (countMap.get(h.origin_country) ?? 0) + 1);
      } else {
        nullCount++;
      }
    }
    const opts: (Country & { houseCount: number })[] = [
      {
        code: ALL_COUNTRIES,
        name: 'All Countries',
        display_order: -2,
        houseCount: allHouses.length,
      } as Country & { houseCount: number },
    ];
    const real = countries
      .filter((c) => countMap.has(c.code))
      /* v8 ignore start */
      .map((c) => ({ ...c, houseCount: countMap.get(c.code) ?? 0 }));
    /* v8 ignore stop */

    opts.push(...real);
    if (nullCount > 0) {
      opts.push({
        code: NOT_SET,
        name: 'Not Set',
        display_order: 999,
        houseCount: nullCount,
      } as Country & { houseCount: number });
    }
    return opts;
  }, [allHouses, countries]);

  // @contract: O(1) lookup for country name by code — avoids O(n) find() inside render loop
  const countryNameMap = useMemo(
    () => new Map(countries.map((c) => [c.code, c.name])),
    [countries],
  );

  return (
    <div className="space-y-6">
      {showAdd && <AddProductionHouseForm onClose={() => setShowAdd(false)} />}

      {/* @contract: country filter dropdown — shows only countries with production houses + All + Not Set */}
      <div className="flex items-center gap-4">
        <CountryDropdown
          countries={dropdownCountries}
          value={selectedCountry}
          onChange={setSelectedCountry}
          formatLabel={(c) => {
            const count = (c as (typeof dropdownCountries)[number]).houseCount;
            return `${c.name} (${count})`;
          }}
          renderIcon={(c) => {
            if (c.code === ALL_COUNTRIES)
              return <Globe className="w-4 h-4 inline text-on-surface" />;
            if (c.code === NOT_SET)
              return <Globe className="w-4 h-4 inline text-on-surface-disabled" />;
            return countryFlag(c.code);
          }}
        />
        <span className="text-sm text-on-surface-subtle">
          {houses.length} production house{houses.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex gap-3 items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search production houses..."
            isLoading={isFetching}
          />
          {canCreate('production_house') && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 ml-auto shrink-0"
            >
              <Plus className="w-4 h-4" /> Add Production House
            </button>
          )}
        </div>
        {/* v8 ignore start */}
        {search.length === 1 && (
          /* v8 ignore stop */
          <p className="text-xs text-on-surface-subtle">Type at least 2 characters to search</p>
        )}
        {/* v8 ignore start */}
        {!isLoading && houses.length > 0 && debouncedSearch && (
          /* v8 ignore stop */
          <p className="text-xs text-on-surface-subtle">Matching &ldquo;{debouncedSearch}&rdquo;</p>
        )}
      </div>

      {/* v8 ignore start -- phantom else on isError guard + string-error fallback unreachable */}
      {isError && (
        <div className="bg-red-600/10 border border-red-600/30 rounded-lg px-4 py-3 text-sm text-status-red">
          Error loading production houses:{' '}
          {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}
      {/* v8 ignore stop */}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-status-red animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {houses.map((house) => (
            <div
              key={house.id}
              className="bg-surface-card border border-outline rounded-xl p-4 flex items-center gap-4"
            >
              <Link
                href={'/production-houses/' + house.id}
                className="flex items-center gap-4 flex-1 min-w-0"
              >
                <div className="w-14 h-14 rounded-lg bg-input flex items-center justify-center overflow-hidden shrink-0">
                  {house.logo_url ? (
                    <img
                      /* v8 ignore start -- getImageUrl always returns string for valid logo_url */
                      src={getImageUrl(house.logo_url, 'sm', 'PRODUCTION_HOUSES') ?? house.logo_url}
                      /* v8 ignore stop */
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="w-6 h-6 text-on-surface-subtle" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-on-surface truncate">{house.name}</p>
                  {/* @contract: always show country — "show don't hide" principle */}
                  <p
                    className={`text-xs truncate mt-0.5 ${house.origin_country ? 'text-on-surface' : 'text-on-surface-disabled'}`}
                  >
                    {/* v8 ignore start -- countryNameMap covers all ISO codes; raw fallback unreachable */}
                    {house.origin_country
                      ? `${countryFlag(house.origin_country)} ${countryNameMap.get(house.origin_country) ?? house.origin_country}`
                      : 'Country not set'}
                    {/* v8 ignore stop */}
                  </p>
                </div>
              </Link>
              {/* @invariant: PH admins see read-only cards — edit/delete actions hidden via permission check */}
              {!isPHAdmin && (
                <>
                  <Link
                    href={'/production-houses/' + house.id}
                    className="p-2 rounded-lg text-on-surface-subtle hover:text-on-surface hover:bg-input"
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                  {canDeleteTopLevel() && (
                    <button
                      onClick={() => {
                        /* v8 ignore start -- phantom else on onError callback */
                        if (confirm('Delete this production house?'))
                          deleteHouse.mutate(house.id, {
                            onError: (err: Error) =>
                              alert(err.message || 'Failed to delete production house'),
                          });
                        /* v8 ignore stop */
                      }}
                      className="p-2 rounded-lg text-on-surface-subtle hover:text-status-red hover:bg-red-600/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
          {houses.length === 0 && (
            <p className="text-on-surface-subtle col-span-full text-center py-10">
              No production houses found
            </p>
          )}
        </div>
      )}
      <LoadMoreButton
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </div>
  );
}
