'use client';
import { useState } from 'react';
import { Building2, Plus, X } from 'lucide-react';
import type { ProductionHouse } from '@/lib/types';
import { getImageUrl } from '@shared/imageUrl';
import { INPUT_CLASSES } from '@/components/common/FormField';
import { Button } from '@/components/common/Button';

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
                    src={getImageUrl(mph.production_house.logo_url, 'sm')!}
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

      <div className="bg-surface-elevated rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-on-surface-muted">Add Production House</p>
        <div className="flex gap-3">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className={`flex-1 ${INPUT_CLASSES.compact}`}
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
          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={!selectedId}
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              const ph = allProductionHouses.find((p) => p.id === selectedId);
              onAdd({ production_house_id: selectedId, _ph: ph });
              setSelectedId('');
            }}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
