'use client';

import { getChangedFields } from './auditUtils';
import { Plus, Minus, ArrowRight } from 'lucide-react';

interface ChangeDetailsProps {
  action: string;
  details: Record<string, unknown>;
}

// @contract Formats a single value for display — handles null, arrays, objects, booleans, strings
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'not set';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'empty list';
    // @edge Short arrays show inline, long arrays show count
    if (value.length <= 3 && value.every((v) => typeof v === 'string' || typeof v === 'number')) {
      return value.join(', ');
    }
    return `${value.length} items`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return 'empty';
    // @edge Show compact key summary for objects
    return `{${keys.join(', ')}}`;
  }
  const str = String(value);
  // @edge Truncate very long strings (e.g. base64 images, long descriptions)
  if (str.length > 200) return `${str.slice(0, 200)}…`;
  return str;
}

// @contract Determines if a value looks like a URL (for rendering as a link)
function isUrl(value: unknown): value is string {
  return typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'));
}

// @contract Renders a value with appropriate styling — URLs as links, nulls as muted
function ValueDisplay({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-on-surface-disabled italic">not set</span>;
  }
  if (isUrl(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-status-blue underline break-all"
      >
        {formatValue(value)}
      </a>
    );
  }
  return <span className="break-all">{formatValue(value)}</span>;
}

// @contract Human-readable field name: snake_case → Title Case
function formatFieldName(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// @contract Filters out internal/noisy fields that don't add value to the audit display
const HIDDEN_FIELDS = new Set(['id', 'created_at', 'updated_at', 'created_by']);

function filterFields(obj: Record<string, unknown>): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!HIDDEN_FIELDS.has(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
}

/** Visual diff display for audit log entries — replaces raw JSON */
export function ChangeDetails({ action, details }: ChangeDetailsProps) {
  if (action === 'update') {
    return <UpdateDetails details={details} />;
  }
  if (action === 'create') {
    const data = (details.new ?? details) as Record<string, unknown>;
    return <CreateDetails data={data} />;
  }
  if (action === 'delete') {
    const data = (details.old ?? details) as Record<string, unknown>;
    return <DeleteDetails data={data} />;
  }
  // @edge sync and unknown actions fall back to entity details view
  const data = (details.new ?? details.old ?? details) as Record<string, unknown>;
  return <EntityDetails data={data} label="Synced Data" />;
}

/** Shows field-by-field before → after for updates */
function UpdateDetails({ details }: { details: Record<string, unknown> }) {
  const changes = getChangedFields(details);

  if (!changes) {
    // @edge No detected changes — show full details as fallback
    return <EntityDetails data={details} label="Details" />;
  }

  const entries = Object.entries(changes as Record<string, { from: unknown; to: unknown }>);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-medium text-on-surface-subtle uppercase tracking-wider">
          {entries.length} field{entries.length !== 1 ? 's' : ''} changed
        </span>
      </div>
      <div className="rounded-lg border border-outline-subtle overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-elevated border-b border-outline-subtle">
              <th className="text-left px-4 py-2 text-xs font-medium text-on-surface-subtle w-1/4">
                Field
              </th>
              <th className="text-left px-4 py-2 text-xs font-medium text-on-surface-subtle w-[37.5%]">
                Before
              </th>
              <th className="text-left px-4 py-2 text-xs font-medium text-on-surface-subtle w-[37.5%]">
                After
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([field, change]) => (
              <tr key={field} className="border-b border-outline-subtle last:border-b-0">
                <td className="px-4 py-2.5 font-medium text-on-surface text-sm">
                  {formatFieldName(field)}
                </td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-start gap-1.5 text-status-red">
                    <Minus className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <ValueDisplay value={change.from} />
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-start gap-1.5 text-status-green">
                    <Plus className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <ValueDisplay value={change.to} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Shows all fields that were added in a create action */
function CreateDetails({ data }: { data: Record<string, unknown> }) {
  const filtered = filterFields(data);
  const entries = Object.entries(filtered);

  if (entries.length === 0) {
    return <p className="text-sm text-on-surface-subtle italic">No details recorded</p>;
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <Plus className="w-4 h-4 text-status-green" />
        <span className="text-xs font-medium text-on-surface-subtle uppercase tracking-wider">
          Created with {entries.length} field{entries.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="rounded-lg border border-green-600/20 overflow-hidden">
        <FieldList entries={entries} accent="green" />
      </div>
    </div>
  );
}

/** Shows all fields that existed before deletion */
function DeleteDetails({ data }: { data: Record<string, unknown> }) {
  const filtered = filterFields(data);
  const entries = Object.entries(filtered);

  if (entries.length === 0) {
    return <p className="text-sm text-on-surface-subtle italic">No details recorded</p>;
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <Minus className="w-4 h-4 text-status-red" />
        <span className="text-xs font-medium text-on-surface-subtle uppercase tracking-wider">
          Deleted entity had {entries.length} field{entries.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="rounded-lg border border-red-600/20 overflow-hidden">
        <FieldList entries={entries} accent="red" />
      </div>
    </div>
  );
}

/** Generic entity details view for sync/unknown actions */
function EntityDetails({ data, label }: { data: Record<string, unknown>; label: string }) {
  const filtered = filterFields(data);
  const entries = Object.entries(filtered);

  if (entries.length === 0) {
    return <p className="text-sm text-on-surface-subtle italic">No details recorded</p>;
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <ArrowRight className="w-4 h-4 text-status-purple" />
        <span className="text-xs font-medium text-on-surface-subtle uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="rounded-lg border border-outline-subtle overflow-hidden">
        <FieldList entries={entries} accent="neutral" />
      </div>
    </div>
  );
}

/** Reusable key-value list with accent color for the left border */
function FieldList({
  entries,
  accent,
}: {
  entries: [string, unknown][];
  accent: 'green' | 'red' | 'neutral';
}) {
  const borderColor =
    accent === 'green'
      ? 'border-l-green-600/40'
      : accent === 'red'
        ? 'border-l-red-600/40'
        : 'border-l-outline-subtle';

  return (
    <div className="divide-y divide-outline-subtle">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className={`flex gap-4 px-4 py-2.5 text-sm border-l-2 ${borderColor} bg-surface`}
        >
          <span className="font-medium text-on-surface w-1/3 shrink-0">{formatFieldName(key)}</span>
          <span className="text-on-surface-muted">
            <ValueDisplay value={value} />
          </span>
        </div>
      ))}
    </div>
  );
}
