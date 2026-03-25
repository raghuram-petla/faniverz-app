'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { MONTHS } from './syncHelpers';

export interface MonthMultiSelectProps {
  /** @contract selected month numbers (1-12); empty array means "all months" */
  selected: number[];
  onChange: (months: number[]) => void;
}

/** @contract Multi-select dropdown for choosing any combination of months */
export function MonthMultiSelect({ selected, onChange }: MonthMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // @sideeffect close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (month: number) => {
    if (selected.includes(month)) {
      onChange(selected.filter((m) => m !== month));
    } else {
      onChange([...selected, month].sort((a, b) => a - b));
    }
  };

  const selectAll = () => onChange([]);
  const isAll = selected.length === 0;

  /** @contract display label summarises selection concisely */
  const label = isAll
    ? 'All months'
    : selected.length <= 3
      ? selected.map((m) => MONTHS[m - 1].slice(0, 3)).join(', ')
      : `${selected.length} months`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-input rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-red-600 min-w-[140px] justify-between"
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-48 bg-surface-card border border-outline rounded-lg shadow-lg py-1 max-h-72 overflow-y-auto">
          {/* All months option */}
          <button
            type="button"
            onClick={selectAll}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-input transition-colors ${isAll ? 'text-red-500 font-medium' : 'text-on-surface'}`}
          >
            <span className="w-4 h-4 flex items-center justify-center">
              {isAll && <Check className="w-4 h-4" />}
            </span>
            All months
          </button>

          <div className="h-px bg-outline mx-2 my-1" />

          {MONTHS.map((name, i) => {
            const monthNum = i + 1;
            const isSelected = selected.includes(monthNum);
            return (
              <button
                key={monthNum}
                type="button"
                onClick={() => toggle(monthNum)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-input transition-colors ${isSelected ? 'text-red-500 font-medium' : 'text-on-surface'}`}
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  {isSelected && <Check className="w-4 h-4" />}
                </span>
                {name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
