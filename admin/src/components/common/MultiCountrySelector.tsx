'use client';
import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import type { Country } from '@shared/types';
import { countryFlag } from '@/components/common/CountryDropdown';

// @contract Multi-country checkbox selector with "All countries" toggle and search
export interface MultiCountrySelectorProps {
  countries: Country[];
  selectedCodes: Set<string>;
  onChange: (codes: Set<string>) => void;
}

export function MultiCountrySelector({
  countries,
  selectedCodes,
  onChange,
}: MultiCountrySelectorProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return countries;
    const q = query.toLowerCase();
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [countries, query]);

  const allSelected = countries.length > 0 && selectedCodes.size === countries.length;

  const handleToggleAll = () => {
    if (allSelected) {
      onChange(new Set());
    } else {
      onChange(new Set(countries.map((c) => c.code)));
    }
  };

  const handleToggle = (code: string) => {
    const next = new Set(selectedCodes);
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    onChange(next);
  };

  return (
    <div className="border border-outline rounded-lg overflow-hidden">
      {/* Search + All toggle */}
      <div className="flex items-center gap-2 p-2 border-b border-outline bg-surface-card">
        <label className="flex items-center gap-2 text-sm cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={handleToggleAll}
            className="accent-red-600 w-3.5 h-3.5"
          />
          <span className="text-on-surface font-medium">All ({countries.length})</span>
        </label>
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-on-surface-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-full bg-input rounded pl-7 pr-2 py-1 text-xs text-on-surface outline-none focus:ring-1 focus:ring-red-600"
          />
        </div>
        {selectedCodes.size > 0 && !allSelected && (
          <span className="text-xs text-on-surface-muted shrink-0">
            {selectedCodes.size} selected
          </span>
        )}
      </div>
      {/* Country grid */}
      <div className="max-h-36 overflow-y-auto p-2 grid grid-cols-2 gap-x-3 gap-y-0.5">
        {filtered.map((c) => (
          <label
            key={c.code}
            className="flex items-center gap-1.5 text-sm cursor-pointer py-0.5 hover:bg-input-active rounded px-1"
          >
            <input
              type="checkbox"
              checked={selectedCodes.has(c.code)}
              onChange={() => handleToggle(c.code)}
              className="accent-red-600 w-3.5 h-3.5 shrink-0"
            />
            <span className="truncate">
              {countryFlag(c.code)} {c.name}
            </span>
          </label>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-on-surface-disabled col-span-2 py-1">No countries found</p>
        )}
      </div>
    </div>
  );
}
