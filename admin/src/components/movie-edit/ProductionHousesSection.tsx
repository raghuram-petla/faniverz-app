'use client';
import { useState } from 'react';
import { Building2, Plus, X } from 'lucide-react';
import type { ProductionHouse } from '@/lib/types';

type PendingPH = {
  production_house_id: string;
  _ph?: ProductionHouse;
};

interface MovieProductionHouse {
  movie_id: string;
  production_house_id: string;
  production_house?: ProductionHouse;
}

interface Props {
  visibleProductionHouses: MovieProductionHouse[];
  allProductionHouses: ProductionHouse[];
  onAdd: (ph: PendingPH) => void;
  onRemove: (phId: string, isPending: boolean) => void;
  pendingPHAdds: PendingPH[];
}

export function ProductionHousesSection({
  visibleProductionHouses,
  allProductionHouses,
  onAdd,
  onRemove,
  pendingPHAdds,
}: Props) {
  const [selectedId, setSelectedId] = useState('');

  return (
    <div className="space-y-4">
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
                    src={mph.production_house.logo_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="w-5 h-5 text-on-surface-subtle" />
                )}
              </div>
              <span className="text-on-surface font-medium flex-1">
                {mph.production_house?.name ?? mph.production_house_id}
              </span>
              <button
                onClick={() => {
                  const isPending = pendingPHAdds.some(
                    (p) => p.production_house_id === mph.production_house_id,
                  );
                  onRemove(mph.production_house_id, isPending);
                }}
                className="p-1 rounded hover:bg-input text-on-surface-subtle hover:text-red-400"
                aria-label={`Remove ${mph.production_house?.name}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-surface-elevated rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-on-surface-muted">Add Production House</p>
        <div className="flex gap-3">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="flex-1 bg-input rounded-lg px-3 py-2 text-on-surface text-sm outline-none focus:ring-2 focus:ring-red-600"
          >
            <option value="">Select production house…</option>
            {allProductionHouses
              .filter(
                (ph) => !visibleProductionHouses.some((mph) => mph.production_house_id === ph.id),
              )
              .map((ph) => (
                <option key={ph.id} value={ph.id}>
                  {ph.name}
                </option>
              ))}
          </select>
          <button
            type="button"
            disabled={!selectedId}
            onClick={() => {
              const ph = allProductionHouses.find((p) => p.id === selectedId);
              onAdd({ production_house_id: selectedId, _ph: ph });
              setSelectedId('');
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-on-surface text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
