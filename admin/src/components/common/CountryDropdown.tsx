'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import type { Country } from '@shared/types';

// @contract: converts a 2-letter ISO country code to a flag emoji via regional indicator symbols
export function countryFlag(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}

export interface CountryDropdownProps {
  countries: Country[];
  value: string;
  onChange: (code: string) => void;
  /** @contract Optional formatter for each option label (e.g. append platform count) */
  formatLabel?: (country: Country) => string;
  /** @contract Optional custom icon renderer — overrides the default flag emoji for specific codes */
  renderIcon?: (country: Country) => React.ReactNode;
}

export function CountryDropdown({
  countries,
  value,
  onChange,
  formatLabel,
  renderIcon,
}: CountryDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = countries.find((c) => c.code === value);

  const filtered = query.trim()
    ? countries.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.code.toLowerCase().includes(query.toLowerCase()),
      )
    : countries;

  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[highlightIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

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
        if (filtered[highlightIndex]) {
          onChange(filtered[highlightIndex].code);
          setOpen(false);
        }
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    },
    [filtered, highlightIndex, onChange],
  );

  // @contract: renderIcon overrides the default flag emoji for specific country codes
  const iconFor = (c: Country) => renderIcon?.(c) ?? countryFlag(c.code);
  const labelText = selected ? (formatLabel ? formatLabel(selected) : selected.name) : null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-input border border-outline rounded-lg px-4 py-2.5 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-red-600 min-w-[200px]"
      >
        <span className="flex-1 text-left truncate flex items-center gap-1.5">
          {selected ? (
            <>
              {iconFor(selected)} {labelText}
            </>
          ) : (
            'Select country…'
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-on-surface-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-72 bg-surface-card border border-outline rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-outline">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-muted" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search country..."
                className="w-full bg-input rounded-lg pl-8 pr-3 py-1.5 text-sm text-on-surface outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
          </div>
          <div ref={listRef} className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-on-surface-disabled">No countries found</p>
            ) : (
              filtered.map((c, i) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    onChange(c.code);
                    setOpen(false);
                  }}
                  onMouseEnter={() => setHighlightIndex(i)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${
                    i === highlightIndex
                      ? 'bg-red-600 text-white'
                      : c.code === value
                        ? 'bg-input-active text-on-surface'
                        : 'text-on-surface hover:bg-input-active'
                  }`}
                >
                  <span>{iconFor(c)}</span>
                  <span>{formatLabel ? formatLabel(c) : c.name}</span>
                  <span
                    className={`ml-auto text-xs ${i === highlightIndex ? 'text-white/60' : 'text-on-surface-disabled'}`}
                  >
                    {c.code}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
