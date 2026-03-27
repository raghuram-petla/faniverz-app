'use client';
import type { FeedType } from '@/lib/types';

/** @sync tab values must match FeedType union from @/lib/types; 'all' is a filter-only sentinel */
const TABS: { label: string; value: FeedType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Videos', value: 'video' },
  { label: 'Posters', value: 'poster' },
  { label: 'Backdrops', value: 'backdrop' },
  { label: 'Surprise', value: 'surprise' },
  { label: 'Updates', value: 'update' },
];

export interface FeedFilterTabsProps {
  selected: FeedType | 'all';
  onChange: (value: FeedType | 'all') => void;
}

export function FeedFilterTabs({ selected, onChange }: FeedFilterTabsProps) {
  return (
    <div className="flex gap-1 bg-surface-elevated rounded-lg p-1">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selected === tab.value
              ? 'bg-red-600 text-white'
              : 'text-on-surface-muted hover:text-on-surface hover:bg-input'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
