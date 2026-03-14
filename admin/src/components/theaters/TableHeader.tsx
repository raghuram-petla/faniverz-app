// @contract Reusable table header for theater movie tables
export interface TableHeaderProps {
  showCountdown?: boolean;
  showLabel?: boolean;
  showActions?: boolean;
}

const thClass =
  'text-left text-xs font-medium text-on-surface-subtle uppercase tracking-wider px-4 py-3';
const thRightClass =
  'text-right text-xs font-medium text-on-surface-subtle uppercase tracking-wider px-4 py-3';

export function TableHeader({ showCountdown, showLabel, showActions = true }: TableHeaderProps) {
  return (
    <thead>
      <tr className="border-b border-outline">
        <th className={thClass}>Movie</th>
        <th className={thClass}>Release Date</th>
        {showLabel && <th className={thClass}>Label</th>}
        {showCountdown && <th className={thClass}>Countdown</th>}
        {showActions && <th className={thRightClass} />}
      </tr>
    </thead>
  );
}
