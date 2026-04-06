'use client';

import { useState } from 'react';
import { Newspaper, Star, Loader2, Check, AlertCircle } from 'lucide-react';
import { FormInput, FormTextarea } from '@/components/common/FormField';
import { CraftRatingInput } from '@/components/common/CraftRatingInput';
import { SectionCard } from './SectionCard';
import { useEditorialReviewState } from '@/hooks/useEditorialReviewState';
import { CRAFT_NAMES, CRAFT_LABELS } from '@shared/constants';
import type { CraftName } from '@shared/types';

// @contract self-contained section — owns its own state hook and save button
// @coupling useEditorialReviewState manages fetch, form state, and save
export interface EditorialReviewSectionProps {
  movieId: string;
}

export function EditorialReviewSection({ movieId }: EditorialReviewSectionProps) {
  const {
    form,
    updateField,
    isDirty,
    isLoading,
    hasExisting,
    computedOverall,
    saveStatus,
    handleSave,
  } = useEditorialReviewState(movieId);

  const [saveError, setSaveError] = useState<string | null>(null);

  const onSave = async () => {
    setSaveError(null);
    const error = await handleSave();
    if (error) setSaveError(error);
  };

  if (isLoading) {
    return (
      <SectionCard title="Editorial Review" icon={Newspaper}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-on-surface-muted" />
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Editorial Review" icon={Newspaper}>
      <div className="space-y-5">
        {/* Title */}
        <FormInput
          label="Review Title"
          required
          value={form.title}
          onValueChange={(v) => updateField('title', v)}
          placeholder="e.g. A visual masterpiece with a gripping narrative"
        />

        {/* Body */}
        <FormTextarea
          label="Review Body"
          required
          value={form.body}
          onValueChange={(v) => updateField('body', v)}
          rows={8}
          placeholder="Write the editorial review..."
        />

        {/* Craft Ratings */}
        <div>
          <label className="block text-sm text-on-surface-muted mb-3">Craft Ratings *</label>
          <div className="bg-input rounded-xl p-4 space-y-3">
            {CRAFT_NAMES.map((craft: CraftName) => (
              <CraftRatingInput
                key={craft}
                label={CRAFT_LABELS[craft]}
                value={form[`rating_${craft}` as keyof typeof form] as number}
                onChange={(v) => updateField(`rating_${craft}` as keyof typeof form, v)}
              />
            ))}

            {/* Overall Rating */}
            {computedOverall && (
              <div className="flex items-center justify-between pt-3 border-t border-outline-subtle">
                <span className="text-sm font-bold text-on-surface">Overall</span>
                <div className="flex items-center gap-1.5">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="text-lg font-bold text-on-surface">{computedOverall}</span>
                  <span className="text-xs text-on-surface-subtle">/ 5</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Published Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => updateField('is_published', !form.is_published)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.is_published ? 'bg-red-600' : 'bg-input'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                form.is_published ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm text-on-surface-muted">
            {form.is_published ? 'Published' : 'Draft'}
          </span>
        </div>

        {/* Save Button + Status */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onSave}
            disabled={saveStatus === 'saving' || (!isDirty && hasExisting)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              saveStatus === 'saving' || (!isDirty && hasExisting)
                ? 'bg-input text-on-surface-disabled cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {saveStatus === 'saving' ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </span>
            ) : hasExisting ? (
              'Update Review'
            ) : (
              'Create Review'
            )}
          </button>

          {saveStatus === 'success' && (
            <span className="flex items-center gap-1 text-sm text-green-500">
              <Check className="w-4 h-4" /> Saved
            </span>
          )}

          {saveError && (
            <span className="flex items-center gap-1 text-sm text-red-500">
              <AlertCircle className="w-4 h-4" /> {saveError}
            </span>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
