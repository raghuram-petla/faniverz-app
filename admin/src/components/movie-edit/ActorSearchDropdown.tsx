'use client';
import { useState } from 'react';
import { User } from 'lucide-react';
import type { Actor } from '@/lib/types';

interface Props {
  actors: Actor[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelect: (actor: Actor) => void;
  selectedActorId: string;
}

export function ActorSearchDropdown({
  actors,
  searchQuery,
  onSearchChange,
  onSelect,
  selectedActorId,
}: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="relative">
      <label className="block text-xs text-white/40 mb-1">Person *</label>
      <input
        type="text"
        placeholder="Type to search…"
        value={searchQuery}
        onChange={(e) => {
          onSearchChange(e.target.value);
          setDropdownOpen(true);
        }}
        onFocus={() => setDropdownOpen(true)}
        className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
      />
      {dropdownOpen && searchQuery.length >= 2 && !selectedActorId && (
        <div className="absolute z-40 top-full mt-1 left-0 right-0 bg-zinc-800 border border-white/10 rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {actors.length > 0 ? (
            actors.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  onSelect(a);
                  setDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/10 text-left"
              >
                <div className="w-6 h-6 rounded-full bg-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                  {a.photo_url ? (
                    <img src={a.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-3 h-3 text-white/40" />
                  )}
                </div>
                {a.name}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-white/40">No matching actors found</p>
          )}
        </div>
      )}
    </div>
  );
}
