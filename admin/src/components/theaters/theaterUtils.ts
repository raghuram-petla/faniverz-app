import type { DateAction } from './PendingChangesSection';

// @contract Pending change: toggle direction + date + movie title for display + optional label
// @edge When inTheaters=true and date < releaseDate, dateAction determines what gets updated
export interface PendingChange {
  inTheaters: boolean;
  date: string;
  title: string;
  posterUrl: string | null;
  posterImageType?: 'poster' | 'backdrop' | null;
  label?: string | null;
  releaseDate: string | null;
  dateAction: DateAction;
}

// @edge: parse as UTC to avoid timezone-induced off-by-one near day boundaries
export function daysUntil(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const releaseUtc = Date.UTC(y, m - 1, d);
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.ceil((releaseUtc - todayUtc) / 86400000);
  return diff <= 0 ? 'Today' : diff === 1 ? 'Tomorrow' : `In ${diff} days`;
}
