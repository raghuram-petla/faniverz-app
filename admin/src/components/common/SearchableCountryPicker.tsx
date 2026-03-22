'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import type { Country } from '@shared/types';

function countryFlag(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}

export interface SearchableCountryPickerProps {
  countries: Country[];
  onSelect: (code: string) => void;
  onCancel: () => void;
}

export function SearchableCountryPicker({
  countries,
  onSelect,
  onCancel,
}: SearchableCountryPickerProps) {
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = query.trim()
    ? countries.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.code.toLowerCase().includes(query.toLowerCase()),
      )
    : countries;

  // @contract: reset highlight when filter changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  // @contract: scroll highlighted item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[highlightIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[highlightIndex]) onSelect(filtered[highlightIndex].code);
      } else if (e.key === 'Escape') {
        onCancel();
      }
    },
    [filtered, highlightIndex, onSelect, onCancel],
  );

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search country..."
            className="w-48 bg-input border border-outline rounded-lg pl-8 pr-3 py-1.5 text-sm text-on-surface outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-on-surface-muted hover:text-on-surface"
        >
          Cancel
        </button>
      </div>
      {filtered.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-10 mt-1 w-64 max-h-60 overflow-y-auto bg-surface-card border border-outline rounded-lg shadow-lg"
        >
          {filtered.map((c, i) => (
            <button
              key={c.code}
              type="button"
              onClick={() => onSelect(c.code)}
              onMouseEnter={() => setHighlightIndex(i)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${
                i === highlightIndex
                  ? 'bg-red-600 text-white'
                  : 'text-on-surface hover:bg-input-active'
              }`}
            >
              <span>{countryFlag(c.code)}</span>
              <span>{c.name}</span>
              <span
                className={`ml-auto ${i === highlightIndex ? 'text-white/60' : 'text-on-surface-disabled'}`}
              >
                {c.code}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
