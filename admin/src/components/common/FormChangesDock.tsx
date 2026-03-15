'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { X, ArrowRight, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import type { FieldChange } from '@/hooks/useFormChanges';

export interface FormChangesDockProps {
  changes: FieldChange[];
  changeCount: number;
  saveStatus: 'idle' | 'saving' | 'success';
  onSave: () => void;
  onDiscard: () => void;
  onRevertField?: (key: string) => void;
}

const ROW_HEIGHT = 40;

// @contract Reusable sticky bottom dock showing field-level changes with Discard/Save
export function FormChangesDock({
  changes,
  changeCount,
  saveStatus,
  onSave,
  onDiscard,
  onRevertField,
}: FormChangesDockProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 2);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  }, []);

  useEffect(() => {
    checkScroll();
  }, [changeCount, checkScroll]);

  const scrollBy = (dir: 'up' | 'down') => {
    scrollRef.current?.scrollBy({
      top: dir === 'down' ? ROW_HEIGHT : -ROW_HEIGHT,
      behavior: 'smooth',
    });
  };

  const isDirty = changeCount > 0;
  if (!isDirty && saveStatus !== 'success') return null;

  return (
    <div className="sticky bottom-4 z-40 max-w-2xl mx-auto rounded-2xl border border-dock-border bg-dock shadow-dock">
      {isDirty && (
        <>
          {/* Changes list with scroll indicators */}
          <div className="relative">
            {canScrollUp && (
              <button
                onClick={() => scrollBy('up')}
                className="absolute top-0 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center pt-0.5 pb-1 px-3 rounded-b-lg bg-dock border border-t-0 border-outline text-on-surface-muted hover:text-on-surface transition-colors"
              >
                <ChevronUp className="w-3.5 h-3.5 animate-bounce" />
              </button>
            )}

            <div
              ref={scrollRef}
              onScroll={checkScroll}
              className="px-4 pt-3 pb-2 space-y-1 max-h-48 overflow-y-auto select-none"
            >
              {changes.map((c) => (
                <ChangeRow key={c.key} change={c} onRevert={onRevertField} />
              ))}
            </div>

            {canScrollDown && (
              <button
                onClick={() => scrollBy('down')}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center pb-0.5 pt-1 px-3 rounded-t-lg bg-dock border border-b-0 border-outline text-on-surface-muted hover:text-on-surface transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
              </button>
            )}
          </div>

          {/* Action bar */}
          <div className="px-4 py-2.5 border-t border-outline flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
              <span className="text-sm font-medium text-amber-400">
                {changeCount} unsaved change{changeCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onDiscard}
                disabled={saveStatus === 'saving'}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-input text-on-surface-muted hover:bg-input-hover hover:text-on-surface transition-colors disabled:opacity-50"
              >
                Discard
              </button>
              <button
                onClick={onSave}
                disabled={saveStatus === 'saving'}
                className="flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-all bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/25"
              >
                {saveStatus === 'saving' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {saveStatus === 'success' && !isDirty && (
        <div className="px-4 py-3 flex items-center gap-2 text-green-400">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            ✓ Changes saved successfully
          </span>
        </div>
      )}
    </div>
  );
}

// @contract Single change row: label | old (strikethrough) | → | new | undo
function ChangeRow({
  change,
  onRevert,
}: {
  change: FieldChange;
  onRevert?: (key: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-dock-row rounded-lg text-xs">
      {onRevert && (
        <button
          onClick={() => onRevert(change.key)}
          className="p-0.5 rounded text-on-surface-muted hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
          aria-label={`Undo ${change.label}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
      <span className="font-medium text-on-surface-muted w-24 shrink-0 truncate">
        {change.label}
      </span>
      <span className="text-red-400 line-through truncate max-w-[200px]">{change.oldDisplay}</span>
      <ArrowRight className="w-3 h-3 text-on-surface-subtle shrink-0" />
      <span className="text-green-400 truncate max-w-[200px] flex-1">{change.newDisplay}</span>
    </div>
  );
}
