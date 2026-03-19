import { useMemo, useCallback } from 'react';
import { useFormChanges } from '@/hooks/useFormChanges';
import type { FieldConfig, FieldChange } from '@/hooks/useFormChanges';
import type { MovieForm, UseMovieEditChangesParams } from '@/hooks/useMovieEditTypes';
import { revertEntity } from './useMovieEditChangesRevert';

export type { UseMovieEditChangesParams } from '@/hooks/useMovieEditTypes';

// @contract Basic info fields tracked in the dock
const BASIC_FIELD_CONFIG: FieldConfig[] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'poster_url', label: 'Poster', type: 'image' },
  { key: 'backdrop_url', label: 'Backdrop', type: 'image' },
  { key: 'release_date', label: 'Release Date', type: 'date' },
  { key: 'runtime', label: 'Runtime', type: 'number' },
  {
    key: 'certification',
    label: 'Certification',
    type: 'select',
    options: { U: 'U', UA: 'UA', A: 'A' },
  },
  { key: 'synopsis', label: 'Synopsis', type: 'text' },
  { key: 'trailer_url', label: 'Trailer URL', type: 'text' },
  { key: 'in_theaters', label: 'In Theaters', type: 'boolean' },
  { key: 'premiere_date', label: 'Premiere Date', type: 'date' },
  { key: 'original_language', label: 'Language', type: 'text' },
  { key: 'is_featured', label: 'Featured', type: 'boolean' },
  { key: 'tmdb_id', label: 'TMDB ID', type: 'number' },
  { key: 'backdrop_focus_x', label: 'Focal Point X', type: 'number' },
  { key: 'backdrop_focus_y', label: 'Focal Point Y', type: 'number' },
];

function makeChange(key: string, label: string, oldDisp: string, newDisp: string): FieldChange {
  return {
    key,
    label,
    type: 'text',
    oldValue: oldDisp,
    newValue: newDisp,
    oldDisplay: oldDisp,
    newDisplay: newDisp,
  };
}

// @contract Generates unified FieldChange[] from basic info + all entity pending state
export function useMovieEditChanges(params: UseMovieEditChangesParams) {
  const { form, initialForm, setForm } = params;

  // Basic info field diffs (excludes genres — handled separately)
  const { changes: basicChanges } = useFormChanges(BASIC_FIELD_CONFIG, initialForm, form);

  // Genre diff
  const genreChanges = useMemo((): FieldChange[] => {
    if (!initialForm) return [];
    const added = form.genres.filter((g) => !initialForm.genres.includes(g));
    const removed = initialForm.genres.filter((g) => !form.genres.includes(g));
    if (added.length === 0 && removed.length === 0) return [];
    const oldParts = removed.map((g) => `- ${g}`);
    const newParts = added.map((g) => `+ ${g}`);
    return [
      makeChange(
        'genres',
        'Genres',
        oldParts.join(', ') || '(none)',
        newParts.join(', ') || '(none)',
      ),
    ];
  }, [form.genres, initialForm]);

  // Entity-level changes
  const entityChanges = useMemo((): FieldChange[] => {
    const result: FieldChange[] = [];
    // Cast
    params.pendingCastAdds.forEach((c, i) => {
      const name = c._actor?.name ?? 'Unknown';
      const char = c.role_name ? ` as ${c.role_name}` : '';
      result.push(makeChange(`entity:cast-add-${i}`, 'Cast', '(empty)', `+ ${name}${char}`));
    });
    params.pendingCastRemoveIds.forEach((id) => {
      const cast = params.castData.find((c) => c.id === id);
      result.push(
        makeChange(`entity:cast-remove-${id}`, 'Cast', cast?.actor?.name ?? id, '(removed)'),
      );
    });
    if (params.localCastOrder) {
      result.push(makeChange('entity:cast-reorder', 'Cast Order', 'Original', 'Reordered'));
    }
    // Videos
    params.pendingVideoAdds.forEach((v, i) => {
      result.push(makeChange(`entity:video-add-${i}`, 'Videos', '(empty)', `+ ${v.title}`));
    });
    params.pendingVideoRemoveIds.forEach((id) => {
      const vid = params.videosData.find((v) => v.id === id);
      result.push(makeChange(`entity:video-remove-${id}`, 'Videos', vid?.title ?? id, '(removed)'));
    });
    // Posters
    params.pendingPosterAdds.forEach((p) => {
      result.push(makeChange(`entity:poster-add-${p._id}`, 'Posters', '(empty)', `+ ${p.title}`));
    });
    params.pendingPosterRemoveIds.forEach((id) => {
      const poster = params.postersData.find((p) => p.id === id);
      result.push(
        makeChange(`entity:poster-remove-${id}`, 'Posters', poster?.title ?? id, '(removed)'),
      );
    });
    // @contract only show Main Poster change if the pending selection differs from the saved DB main
    if (params.pendingMainPosterId && params.pendingMainPosterId !== params.savedMainPosterId) {
      result.push(makeChange('entity:main-poster', 'Main Poster', 'Current', 'Changed'));
    }
    // Platforms
    params.pendingPlatformAdds.forEach((p, i) => {
      const from = p.available_from ? ` from ${p.available_from}` : '';
      result.push(
        makeChange(
          `entity:platform-add-${i}`,
          'Platforms',
          '(empty)',
          `+ ${p._platform?.name ?? p.platform_id}${from}`,
        ),
      );
    });
    params.pendingPlatformRemoveIds.forEach((id) => {
      const mp = params.moviePlatforms.find((p) => p.platform_id === id);
      result.push(
        makeChange(
          `entity:platform-remove-${id}`,
          'Platforms',
          mp?.platform?.name ?? id,
          '(removed)',
        ),
      );
    });
    // Production Houses
    params.pendingPHAdds.forEach((ph, i) => {
      result.push(
        makeChange(
          `entity:ph-add-${i}`,
          'Prod. Houses',
          '(empty)',
          `+ ${ph._ph?.name ?? ph.production_house_id}`,
        ),
      );
    });
    params.pendingPHRemoveIds.forEach((id) => {
      const mph = params.movieProductionHouses.find((p) => p.production_house_id === id);
      result.push(
        makeChange(
          `entity:ph-remove-${id}`,
          'Prod. Houses',
          mph?.production_house?.name ?? id,
          '(removed)',
        ),
      );
    });
    // Theatrical Runs
    params.pendingRunAdds.forEach((r, i) => {
      const label = r.label ? ` (${r.label})` : '';
      result.push(
        makeChange(`entity:run-add-${i}`, 'Runs', '(empty)', `+ ${r.release_date}${label}`),
      );
    });
    params.pendingRunRemoveIds.forEach((id) => {
      const run = params.theatricalRuns.find((r) => r.id === id);
      result.push(
        makeChange(`entity:run-remove-${id}`, 'Runs', run?.release_date ?? id, '(removed)'),
      );
    });
    params.pendingRunEndIds.forEach((endDate, id) => {
      const run = params.theatricalRuns.find((r) => r.id === id);
      result.push(
        makeChange(
          `entity:run-end-${id}`,
          'Run Ending',
          run?.release_date ?? id,
          `ends ${endDate}`,
        ),
      );
    });
    return result;
  }, [
    params.pendingCastAdds,
    params.pendingCastRemoveIds,
    params.localCastOrder,
    params.castData,
    params.pendingVideoAdds,
    params.pendingVideoRemoveIds,
    params.videosData,
    params.pendingPosterAdds,
    params.pendingPosterRemoveIds,
    params.postersData,
    params.pendingMainPosterId,
    params.savedMainPosterId,
    params.pendingPlatformAdds,
    params.pendingPlatformRemoveIds,
    params.moviePlatforms,
    params.pendingPHAdds,
    params.pendingPHRemoveIds,
    params.movieProductionHouses,
    params.pendingRunAdds,
    params.pendingRunRemoveIds,
    params.pendingRunEndIds,
    params.theatricalRuns,
  ]);

  const changes = useMemo(
    () => [...basicChanges, ...genreChanges, ...entityChanges],
    [basicChanges, genreChanges, entityChanges],
  );

  const onRevertField = useCallback(
    (key: string) => {
      if (!initialForm) return;
      // Genre revert
      if (key === 'genres') {
        setForm((prev) => ({ ...prev, genres: initialForm.genres }));
        return;
      }
      // Entity revert
      if (key.startsWith('entity:')) {
        revertEntity(key, params);
        return;
      }
      // Basic info field revert
      setForm((prev) => ({ ...prev, [key]: initialForm[key as keyof MovieForm] }));
    },
    [initialForm, setForm, params],
  );

  const onDiscard = useCallback(() => {
    if (initialForm) setForm(initialForm);
    params.resetPendingState();
  }, [initialForm, setForm, params]);

  return { changes, changeCount: changes.length, onRevertField, onDiscard };
}
