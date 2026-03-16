'use client';
import { useState, useRef, useEffect } from 'react';
import { User, Plus, Loader2 } from 'lucide-react';
import type { Actor } from '@/lib/types';
import { getImageUrl } from '@shared/imageUrl';

// @contract controlled typeahead — parent provides filtered actors list and manages search state
interface Props {
  actors: Actor[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelect: (actor: Actor) => void;
  // @invariant when selectedActorId is truthy, dropdown hides even if searchQuery >= 2 chars
  selectedActorId: string;
  // @contract quick-add callback — creates actor with just a name; returns the created Actor
  onQuickAdd?: (name: string) => Promise<void>;
  quickAddPending?: boolean;
}

export function ActorSearchDropdown({
  actors,
  searchQuery,
  onSearchChange,
  onSelect,
  selectedActorId,
  onQuickAdd,
  quickAddPending,
}: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // @contract -1 = nothing highlighted; 0..actors.length-1 = actor; actors.length = quick-add
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  const showDropdown = dropdownOpen && searchQuery.length >= 2 && !selectedActorId;
  const hasQuickAdd = onQuickAdd && actors.length === 0 && searchQuery.trim().length >= 2;
  // @invariant total navigable items: actors count + 1 if quick-add visible
  const totalItems = actors.length + (hasQuickAdd ? 1 : 0);

  // @sideeffect reset highlight when actors list or dropdown visibility changes
  useEffect(() => {
    setHighlightIndex(-1);
  }, [actors, showDropdown]);

  // @sideeffect scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-dropdown-item]');
    const el = items[highlightIndex] as HTMLElement | undefined;
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [highlightIndex]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || totalItems === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < actors.length) {
        onSelect(actors[highlightIndex]);
        setDropdownOpen(false);
      } else if (highlightIndex === actors.length && hasQuickAdd) {
        onQuickAdd!(searchQuery.trim());
      }
    } else if (e.key === 'Escape') {
      setDropdownOpen(false);
      setHighlightIndex(-1);
    }
  }

  return (
    <div className="relative">
      <label className="block text-xs text-on-surface-subtle mb-1">Person *</label>
      <input
        type="text"
        placeholder="Type to search…"
        value={searchQuery}
        onChange={(e) => {
          onSearchChange(e.target.value);
          setDropdownOpen(true);
        }}
        onFocus={() => setDropdownOpen(true)}
        onKeyDown={handleKeyDown}
        className="w-full bg-input rounded-lg px-3 py-2 text-on-surface text-sm outline-none focus:ring-2 focus:ring-red-600"
      />
      {/* @edge dropdown only opens with >= 2 chars AND no actor already selected */}
      {showDropdown && (
        <div
          ref={listRef}
          className="absolute z-40 top-full mt-1 left-0 right-0 bg-surface border border-outline rounded-lg shadow-xl max-h-48 overflow-y-auto"
        >
          {actors.length > 0 ? (
            actors.map((a, i) => (
              <button
                key={a.id}
                type="button"
                data-dropdown-item
                onClick={() => {
                  onSelect(a);
                  setDropdownOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-on-surface hover:bg-input text-left ${i === highlightIndex ? 'bg-input' : ''}`}
              >
                <div className="w-6 h-6 rounded-full bg-input overflow-hidden shrink-0 flex items-center justify-center">
                  {/* @nullable photo_url — falls back to generic User icon */}
                  {a.photo_url ? (
                    <img
                      src={getImageUrl(a.photo_url, 'sm', 'ACTORS') ?? a.photo_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-3 h-3 text-on-surface-subtle" />
                  )}
                </div>
                {a.name}
              </button>
            ))
          ) : (
            <>
              <p className="px-3 py-2 text-sm text-on-surface-subtle">No matching actors found</p>
              {/* @sideeffect quick-add creates actor in DB and auto-selects */}
              {hasQuickAdd && (
                <button
                  type="button"
                  data-dropdown-item
                  disabled={quickAddPending}
                  onClick={() => onQuickAdd!(searchQuery.trim())}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-status-red hover:bg-input rounded-b-lg disabled:opacity-50 ${highlightIndex === 0 ? 'bg-input' : ''}`}
                >
                  {quickAddPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {quickAddPending ? 'Creating…' : `Create "${searchQuery.trim()}"`}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
