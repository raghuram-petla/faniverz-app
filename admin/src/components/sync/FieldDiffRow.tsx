import { CheckCircle2 } from 'lucide-react';
import type { FillableField } from '@/lib/syncUtils';
import type { FieldStatus } from './fieldDiffHelpers';

// @contract Renders a single row in the field diff table with checkbox, DB value, TMDB value, and status
export interface FieldDiffRowProps {
  fieldKey: FillableField;
  label: string;
  dbDisplay: string;
  tmdbDisplay: string;
  status: FieldStatus;
  isApplied: boolean;
  isSelected: boolean;
  isSaving: boolean;
  /** Raw DB/TMDB URLs for media preview thumbnails */
  dbMediaUrl?: string | null;
  tmdbMediaUrl?: string | null;
  rowBg: string;
  onToggle: (key: FillableField) => void;
}

const statusColor: Record<FieldStatus, string> = {
  missing: 'text-status-green',
  changed: 'text-status-yellow',
  same: 'text-on-surface-disabled',
};
const statusLabel: Record<FieldStatus, string> = {
  missing: 'missing',
  changed: 'changed',
  same: 'same',
};

export function FieldDiffRow({
  fieldKey,
  label,
  dbDisplay,
  tmdbDisplay,
  status,
  isApplied,
  isSelected,
  isSaving,
  dbMediaUrl,
  tmdbMediaUrl,
  rowBg,
  onToggle,
}: FieldDiffRowProps) {
  const isPoster = fieldKey === 'poster_url';
  const isBackdrop = fieldKey === 'backdrop_url';

  return (
    <tr className={rowBg}>
      <td className="py-2 pr-3 align-top">
        <input
          type="checkbox"
          checked={isApplied || isSelected}
          disabled={isApplied || isSaving}
          onChange={() => onToggle(fieldKey)}
          className="accent-red-600"
        />
      </td>
      <td
        className={`py-2 pr-3 align-top ${isApplied ? 'line-through text-on-surface-disabled' : 'text-on-surface'}`}
      >
        {label}
      </td>
      <td
        className={`py-2 pr-3 align-top ${status === 'same' ? 'text-on-surface-subtle' : status === 'missing' ? 'text-status-red' : 'text-on-surface-subtle'}`}
      >
        {isApplied ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-status-green inline" />
        ) : (
          dbDisplay || '—'
        )}
        {isPoster && dbMediaUrl && (
          <img src={dbMediaUrl} alt="" className="w-12 h-16 object-cover rounded mt-1" />
        )}
        {isBackdrop && dbMediaUrl && (
          <img src={dbMediaUrl} alt="" className="w-24 h-14 object-cover rounded mt-1" />
        )}
      </td>
      <td className="py-2 pr-3 align-top text-on-surface-subtle">
        {tmdbDisplay || '—'}
        {isPoster && tmdbMediaUrl && (
          <img src={tmdbMediaUrl} alt="" className="w-12 h-16 object-cover rounded mt-1" />
        )}
        {isBackdrop && tmdbMediaUrl && (
          <img src={tmdbMediaUrl} alt="" className="w-24 h-14 object-cover rounded mt-1" />
        )}
      </td>
      <td className={`py-2 align-top text-right ${statusColor[status]}`}>
        {isApplied ? '' : statusLabel[status]}
      </td>
    </tr>
  );
}
