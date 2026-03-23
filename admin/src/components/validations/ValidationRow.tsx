'use client';

import React from 'react';
import { Wrench } from 'lucide-react';
import type { ScanResult } from '@/hooks/useValidationTypes';
import { itemKey, hasIssue } from '@/hooks/useValidations';

export interface ValidationRowProps {
  item: ScanResult;
  isSelected: boolean;
  onToggle: () => void;
  isReadOnly: boolean;
  onFixSingle: (item: ScanResult) => void;
}

const URL_TYPE_STYLES: Record<string, string> = {
  local: 'bg-green-900/30 text-green-400 border-green-700',
  external: 'bg-amber-900/30 text-amber-400 border-amber-700',
  full_r2: 'bg-blue-900/30 text-blue-400 border-blue-700',
};

const URL_TYPE_LABELS: Record<string, string> = {
  local: 'Local',
  external: 'External',
  full_r2: 'Full R2',
};

// @contract: renders a single scan result row with variant status dots and fix action
export function ValidationRow({
  item,
  isSelected,
  onToggle,
  isReadOnly,
  onFixSingle,
}: ValidationRowProps) {
  const issue = hasIssue(item);
  const key = itemKey(item);
  // @edge: basic scan returns null for all variant fields — show dash instead of dots
  const isDeepScanned = item.originalExists !== null;

  return (
    <tr key={key} className={`border-b border-outline ${issue ? 'bg-red-950/10' : ''}`}>
      <td className="px-3 py-2">
        {issue && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            className="rounded border-outline"
            aria-label={`Select ${item.entityLabel}`}
          />
        )}
      </td>
      <td className="px-3 py-2 text-sm text-on-surface">{item.entityLabel}</td>
      <td className="px-3 py-2 text-xs text-on-surface-muted">{item.field}</td>
      <td className="px-3 py-2">
        <span className={`text-xs px-2 py-0.5 rounded border ${URL_TYPE_STYLES[item.urlType]}`}>
          {URL_TYPE_LABELS[item.urlType]}
        </span>
      </td>
      <td className="px-3 py-2">{isDeepScanned ? renderDot(item.originalExists) : renderDash()}</td>
      <td className="px-3 py-2">{isDeepScanned ? renderDot(item.variants.sm) : renderDash()}</td>
      <td className="px-3 py-2">{isDeepScanned ? renderDot(item.variants.md) : renderDash()}</td>
      <td className="px-3 py-2">{isDeepScanned ? renderDot(item.variants.lg) : renderDash()}</td>
      <td
        className="px-3 py-2 text-xs text-on-surface-muted max-w-[200px] truncate"
        title={item.currentUrl}
      >
        {item.currentUrl}
      </td>
      <td className="px-3 py-2">
        {issue && !isReadOnly && (
          <button
            onClick={() => onFixSingle(item)}
            className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 flex items-center gap-1"
            title="Fix this item"
          >
            <Wrench className="w-3 h-3" />
            Fix
          </button>
        )}
      </td>
    </tr>
  );
}

/** @contract tri-state dot: green=exists, red=missing, gray=N/A (null) */
function renderDot(value: boolean | null): React.ReactElement {
  if (value === null)
    return <span className="inline-block w-3 h-3 rounded-full bg-zinc-600" title="N/A" />;
  if (value) return <span className="inline-block w-3 h-3 rounded-full bg-green-500" title="OK" />;
  return <span className="inline-block w-3 h-3 rounded-full bg-red-500" title="Missing" />;
}

function renderDash(): React.ReactElement {
  return <span className="text-xs text-on-surface-muted">—</span>;
}
