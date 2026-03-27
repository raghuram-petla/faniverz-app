import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Search, Loader2 } from 'lucide-react';

// @contract: Reusable searchable checkbox list field used in invite forms for PH and language assignment
export interface CheckboxListFieldItem {
  id: string;
  name: string;
  /** @nullable Optional image URL shown as a small avatar next to the name */
  imageUrl?: string | null;
}

export interface CheckboxListFieldProps {
  label: string;
  hint?: string;
  items: CheckboxListFieldItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  emptyMessage: string;
  /** @contract When provided, search is delegated to the parent (server-side);
   * otherwise the component filters items locally. */
  onSearch?: (query: string) => void;
  /** Items that are selected but may not be in the current search results.
   * @contract Merged with items so selected entries always remain visible. */
  selectedItems?: CheckboxListFieldItem[];
  /** @contract When true, shows a loading spinner instead of empty/no-results messages */
  isLoading?: boolean;
}

export function CheckboxListField({
  label,
  hint,
  items,
  selectedIds,
  onToggle,
  emptyMessage,
  onSearch,
  selectedItems,
  isLoading,
}: CheckboxListFieldProps) {
  const [search, setSearch] = useState('');

  function handleSearch(q: string) {
    setSearch(q);
    if (onSearch) onSearch(q);
  }

  // @contract: When onSearch is set, items are already server-filtered — only merge selected.
  // When onSearch is not set, filter locally. Selected items always appear first.
  const displayed = useMemo(() => {
    let base: CheckboxListFieldItem[];
    if (onSearch) {
      // Server-side search: merge selected items that aren't in current results
      const resultIds = new Set(items.map((i) => i.id));
      const missingSelected = (selectedItems ?? []).filter((s) => !resultIds.has(s.id));
      base = [...missingSelected, ...items];
    } else {
      // Client-side search
      const q = search.toLowerCase();
      base = q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
    }
    return [...base].sort((a, b) => {
      const aSelected = selectedIds.includes(a.id) ? 0 : 1;
      const bSelected = selectedIds.includes(b.id) ? 0 : 1;
      return aSelected - bSelected;
    });
  }, [items, search, selectedIds, onSearch, selectedItems]);

  const hasNoData = onSearch ? items.length === 0 && !search : items.length === 0;

  return (
    <div>
      <label className="block text-sm font-medium text-on-surface mb-2">
        {label}
        {hint && <span className="text-on-surface-subtle font-normal"> {hint}</span>}
      </label>
      <div className="border border-outline rounded-lg overflow-hidden">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-subtle" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={`Search ${label.toLowerCase().replace('assign ', '')}...`}
            className="w-full bg-input pl-8 pr-3 py-2 text-sm text-on-surface outline-none placeholder:text-on-surface-subtle"
          />
        </div>
        <div className="space-y-1 max-h-48 overflow-y-auto p-2">
          {onSearch && search.length === 1 && (
            <p className="text-sm text-on-surface-subtle px-2 py-1">
              Type at least 2 characters to search
            </p>
          )}
          {isLoading && displayed.length === 0 && (
            <div className="flex justify-center py-3">
              <Loader2 className="w-5 h-5 animate-spin text-on-surface-subtle" />
            </div>
          )}
          {!isLoading && hasNoData && search.length !== 1 && (
            <p className="text-sm text-on-surface-subtle px-2 py-1">{emptyMessage}</p>
          )}
          {!isLoading && !hasNoData && displayed.length === 0 && search.length !== 1 && (
            <p className="text-sm text-on-surface-subtle px-2 py-1">
              No results for &ldquo;{search}&rdquo;
            </p>
          )}
          {displayed.map((item) => (
            <label
              key={item.id}
              className="flex items-center gap-3 cursor-pointer hover:bg-surface-elevated rounded-lg px-2 py-1.5"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={() => onToggle(item.id)}
                className="rounded border-outline accent-red-600"
              />
              {item.imageUrl && (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  width={20}
                  height={20}
                  className="rounded-sm object-contain"
                  unoptimized
                />
              )}
              <span className="text-sm text-on-surface">{item.name}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
