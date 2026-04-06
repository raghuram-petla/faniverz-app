'use client';

import { Star } from 'lucide-react';

// @contract reusable star rating input for editorial review craft ratings (1-5)
export interface CraftRatingInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export function CraftRatingInput({ label, value, onChange }: CraftRatingInputProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-on-surface-muted w-32">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-0.5 transition-colors"
            aria-label={`Rate ${label} ${star} stars`}
          >
            <Star
              className={`w-5 h-5 ${
                star <= value
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-none text-on-surface-disabled'
              }`}
            />
          </button>
        ))}
        <span className="text-xs text-on-surface-subtle ml-2 w-4 text-center">{value || '-'}</span>
      </div>
    </div>
  );
}
