import type { ImportMovieResult } from '@/hooks/useSync';

export interface ImportProgress {
  tmdbId: number;
  title: string;
  status: 'pending' | 'importing' | 'done' | 'failed';
  result?: ImportMovieResult;
  error?: string;
}

export function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return 'In progress...';
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const statusStyles: Record<string, { bg: string; text: string }> = {
  running: { bg: 'bg-blue-600/20', text: 'text-blue-400' },
  success: { bg: 'bg-green-600/20', text: 'text-green-400' },
  failed: { bg: 'bg-red-600/20', text: 'text-red-400' },
};

export const CURRENT_YEAR = new Date().getFullYear();
export const YEARS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR + 1 - i);
export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
