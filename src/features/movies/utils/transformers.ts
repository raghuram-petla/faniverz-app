import type { CalendarEntry } from '@/types/movie';
import type { ReleaseTypeFilter } from '@/stores/useFilterStore';

export function groupEntriesByDate(entries: CalendarEntry[]): Record<string, CalendarEntry[]> {
  const grouped: Record<string, CalendarEntry[]> = {};
  for (const entry of entries) {
    if (!grouped[entry.date]) {
      grouped[entry.date] = [];
    }
    grouped[entry.date].push(entry);
  }
  return grouped;
}

export function filterEntriesByReleaseType(
  entries: CalendarEntry[],
  filter: ReleaseTypeFilter
): CalendarEntry[] {
  if (filter === 'all') return entries;
  if (filter === 'theatrical') {
    return entries.filter((e) => e.dotType === 'theatrical');
  }
  // 'ott' filter shows both OTT premieres and OTT originals
  return entries.filter((e) => e.dotType === 'ott_premiere' || e.dotType === 'ott_original');
}

export function getDotsForDate(
  grouped: Record<string, CalendarEntry[]>,
  date: string
): CalendarEntry[] {
  return grouped[date] ?? [];
}
