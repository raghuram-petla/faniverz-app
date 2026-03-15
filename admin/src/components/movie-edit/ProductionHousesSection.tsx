'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Building2, Plus, X, Loader2 } from 'lucide-react';
import type { ProductionHouse } from '@/lib/types';
import { getImageUrl } from '@shared/imageUrl';
import { Button } from '@/components/common/Button';

type PendingPH = {
  production_house_id: string;
  // @coupling _ph carries display data; stripped before DB save
  _ph?: ProductionHouse;
};

interface MovieProductionHouse {
  movie_id: string;
  production_house_id: string;
  production_house?: ProductionHouse;
}

// @contract controlled typeahead — parent provides filtered list and manages search state
export interface Props {
  visibleProductionHouses: MovieProductionHouse[];
  productionHouses: ProductionHouse[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAdd: (ph: PendingPH) => void;
  onRemove: (phId: string, isPending: boolean) => void;
  pendingPHAdds: PendingPH[];
  // @contract quick-add callback — creates PH with just a name; auto-selects on completion
  onQuickAdd?: (name: string) => Promise<void>;
  quickAddPending?: boolean;
  showAddForm: boolean;
  onCloseAddForm: () => void;
}

export function ProductionHousesSection({
  visibleProductionHouses,
  productionHouses,
  searchQuery,
  onSearchChange,
  onAdd,
  onRemove,
  pendingPHAdds,
  onQuickAdd,
  quickAddPending,
  showAddForm,
  onCloseAddForm,
}: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // @contract -1 = nothing highlighted; 0..N-1 = PH item; N = quick-add button
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // @invariant already-added PHs are excluded from search results
  const filtered = productionHouses.filter(
    (ph) => !visibleProductionHouses.some((mph) => mph.production_house_id === ph.id),
  );

  const showDropdown = dropdownOpen && searchQuery.length >= 2;
  const hasQuickAdd = onQuickAdd && filtered.length === 0 && searchQuery.trim().length >= 2;
  const totalItems = filtered.length + (hasQuickAdd ? 1 : 0);

  // @sideeffect reset highlight when results or dropdown visibility changes
  useEffect(() => {
    setHighlightIndex(-1);
  }, [filtered.length, showDropdown]);

  // @sideeffect scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-dropdown-item]');
    const el = items[highlightIndex] as HTMLElement | undefined;
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [highlightIndex]);

  // @sideeffect close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (ph: ProductionHouse) => {
      onAdd({ production_house_id: ph.id, _ph: ph });
      onSearchChange('');
      setDropdownOpen(false);
      onCloseAddForm();
    },
    [onAdd, onSearchChange],
  );

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
      if (highlightIndex >= 0 && highlightIndex < filtered.length) {
        handleSelect(filtered[highlightIndex]);
      } else if (highlightIndex === filtered.length && hasQuickAdd) {
        onQuickAdd!(searchQuery.trim());
      }
    } else if (e.key === 'Escape') {
      setDropdownOpen(false);
      setHighlightIndex(-1);
    }
  }

  return (
    <div className="space-y-4">
      {showAddForm && (
        <div className="bg-surface-elevated rounded-xl p-4 space-y-3">
          <div ref={wrapperRef} className="relative">
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
            {showDropdown && (
              <div
                ref={listRef}
                className="absolute z-40 top-full mt-1 left-0 right-0 bg-surface border border-outline rounded-lg shadow-xl max-h-48 overflow-y-auto"
              >
                {filtered.length > 0 ? (
                  filtered.map((ph, i) => (
                    <button
                      key={ph.id}
                      type="button"
                      data-dropdown-item
                      onClick={() => handleSelect(ph)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-on-surface hover:bg-input text-left ${i === highlightIndex ? 'bg-input' : ''}`}
                    >
                      <div className="w-6 h-6 rounded bg-input overflow-hidden shrink-0 flex items-center justify-center">
                        {ph.logo_url ? (
                          <img
                            src={getImageUrl(ph.logo_url, 'sm') ?? ph.logo_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Building2 className="w-3 h-3 text-on-surface-subtle" />
                        )}
                      </div>
                      {ph.name}
                    </button>
                  ))
                ) : (
                  <>
                    <p className="px-3 py-2 text-sm text-on-surface-subtle">
                      No matching production houses
                    </p>
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
          <button
            type="button"
            onClick={() => {
              onCloseAddForm();
              onSearchChange('');
              setDropdownOpen(false);
            }}
            className="text-on-surface-muted px-4 py-2 rounded-lg text-sm hover:bg-input"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Production house list — below add form */}
      {visibleProductionHouses.length > 0 && (
        <div className="space-y-2">
          {visibleProductionHouses.map((mph) => (
            <div
              key={mph.production_house_id}
              className="flex items-center gap-3 bg-surface-elevated rounded-xl px-4 py-3"
            >
              <div className="w-10 h-10 rounded-lg bg-input flex items-center justify-center overflow-hidden shrink-0">
                {mph.production_house?.logo_url ? (
                  <img
                    src={
                      getImageUrl(mph.production_house.logo_url, 'sm') ??
                      mph.production_house.logo_url
                    }
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="w-5 h-5 text-on-surface-subtle" />
                )}
              </div>
              {/* @nullable production_house relation — falls back to raw ID */}
              <span className="text-on-surface font-medium flex-1">
                {mph.production_house?.name ?? mph.production_house_id}
              </span>
              <Button
                variant="icon"
                size="sm"
                onClick={() => {
                  const isPending = pendingPHAdds.some(
                    (p) => p.production_house_id === mph.production_house_id,
                  );
                  onRemove(mph.production_house_id, isPending);
                }}
                aria-label={`Remove ${mph.production_house?.name}`}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
