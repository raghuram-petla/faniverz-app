import { useMemo, useCallback } from 'react';
import { useFormChanges } from '@/hooks/useFormChanges';
import type { FieldConfig, FieldChange } from '@/hooks/useFormChanges';
import type { MovieForm } from '@/hooks/useMovieEditTypes';
import type {
  PendingVideoAdd,
  PendingPosterAdd,
  PendingPlatformAdd,
  PendingPHAdd,
} from '@/hooks/useMovieEditTypes';
import type { PendingCastAdd } from '@/components/movie-edit/CastSection';
import type { PendingRun } from '@/components/movie-edit/TheatricalRunsSection';

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
  { key: 'backdrop_focus_x', label: 'Focal Point X', type: 'number' },
  { key: 'backdrop_focus_y', label: 'Focal Point Y', type: 'number' },
];

// Minimal interfaces for server data lookups (only fields we need for display names)
interface CastRow {
  id: string;
  actor?: { name: string } | null;
  character_name?: string | null;
}
interface VideoRow {
  id: string;
  title: string;
}
interface PosterRow {
  id: string;
  title: string;
}
interface PlatformRow {
  platform_id: string;
  platform?: { name: string } | null;
}
interface PHRow {
  production_house_id: string;
  production_house?: { name: string } | null;
}
interface RunRow {
  id: string;
  release_date: string;
  label?: string | null;
}

export interface UseMovieEditChangesParams {
  form: MovieForm;
  initialForm: MovieForm | null;
  setForm: React.Dispatch<React.SetStateAction<MovieForm>>;
  setInitialForm: React.Dispatch<React.SetStateAction<MovieForm | null>>;
  // Cast
  pendingCastAdds: PendingCastAdd[];
  pendingCastRemoveIds: Set<string>;
  localCastOrder: string[] | null;
  castData: CastRow[];
  setPendingCastAdds: React.Dispatch<React.SetStateAction<PendingCastAdd[]>>;
  setPendingCastRemoveIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setLocalCastOrder: (order: string[] | null) => void;
  // Videos
  pendingVideoAdds: PendingVideoAdd[];
  pendingVideoRemoveIds: Set<string>;
  videosData: VideoRow[];
  setPendingVideoAdds: React.Dispatch<React.SetStateAction<PendingVideoAdd[]>>;
  setPendingVideoRemoveIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  // Posters
  pendingPosterAdds: PendingPosterAdd[];
  pendingPosterRemoveIds: Set<string>;
  pendingMainPosterId: string | null;
  postersData: PosterRow[];
  setPendingPosterAdds: React.Dispatch<React.SetStateAction<PendingPosterAdd[]>>;
  setPendingPosterRemoveIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setPendingMainPosterId: (id: string | null) => void;
  // Platforms
  pendingPlatformAdds: PendingPlatformAdd[];
  pendingPlatformRemoveIds: Set<string>;
  moviePlatforms: PlatformRow[];
  setPendingPlatformAdds: React.Dispatch<React.SetStateAction<PendingPlatformAdd[]>>;
  setPendingPlatformRemoveIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  // Production Houses
  pendingPHAdds: PendingPHAdd[];
  pendingPHRemoveIds: Set<string>;
  movieProductionHouses: PHRow[];
  setPendingPHAdds: React.Dispatch<React.SetStateAction<PendingPHAdd[]>>;
  setPendingPHRemoveIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  // Theatrical Runs
  pendingRunAdds: PendingRun[];
  pendingRunRemoveIds: Set<string>;
  pendingRunEndIds: Map<string, string>;
  theatricalRuns: RunRow[];
  setPendingRunAdds: React.Dispatch<React.SetStateAction<PendingRun[]>>;
  setPendingRunRemoveIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setPendingRunEndIds: React.Dispatch<React.SetStateAction<Map<string, string>>>;
  // Reset
  resetPendingState: () => void;
}

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
    params.pendingPosterAdds.forEach((p, i) => {
      result.push(makeChange(`entity:poster-add-${i}`, 'Posters', '(empty)', `+ ${p.title}`));
    });
    params.pendingPosterRemoveIds.forEach((id) => {
      const poster = params.postersData.find((p) => p.id === id);
      result.push(
        makeChange(`entity:poster-remove-${id}`, 'Posters', poster?.title ?? id, '(removed)'),
      );
    });
    if (params.pendingMainPosterId) {
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
  }, [initialForm, setForm, params.resetPendingState]);

  return { changes, changeCount: changes.length, onRevertField, onDiscard };
}

// @sideeffect Undoes a single entity-level pending change
function revertEntity(key: string, p: UseMovieEditChangesParams) {
  if (key.startsWith('entity:cast-add-')) {
    const idx = parseInt(key.split('-').pop()!, 10);
    p.setPendingCastAdds((prev) => prev.filter((_, i) => i !== idx));
  } else if (key.startsWith('entity:cast-remove-')) {
    const id = key.replace('entity:cast-remove-', '');
    p.setPendingCastRemoveIds((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
  } else if (key === 'entity:cast-reorder') {
    p.setLocalCastOrder(null);
  } else if (key.startsWith('entity:video-add-')) {
    const idx = parseInt(key.split('-').pop()!, 10);
    p.setPendingVideoAdds((prev) => prev.filter((_, i) => i !== idx));
  } else if (key.startsWith('entity:video-remove-')) {
    const id = key.replace('entity:video-remove-', '');
    p.setPendingVideoRemoveIds((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
  } else if (key.startsWith('entity:poster-add-')) {
    const idx = parseInt(key.split('-').pop()!, 10);
    p.setPendingPosterAdds((prev) => prev.filter((_, i) => i !== idx));
  } else if (key.startsWith('entity:poster-remove-')) {
    const id = key.replace('entity:poster-remove-', '');
    p.setPendingPosterRemoveIds((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
  } else if (key === 'entity:main-poster') {
    p.setPendingMainPosterId(null);
  } else if (key.startsWith('entity:platform-add-')) {
    const idx = parseInt(key.split('-').pop()!, 10);
    p.setPendingPlatformAdds((prev) => prev.filter((_, i) => i !== idx));
  } else if (key.startsWith('entity:platform-remove-')) {
    const id = key.replace('entity:platform-remove-', '');
    p.setPendingPlatformRemoveIds((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
  } else if (key.startsWith('entity:ph-add-')) {
    const idx = parseInt(key.split('-').pop()!, 10);
    p.setPendingPHAdds((prev) => prev.filter((_, i) => i !== idx));
  } else if (key.startsWith('entity:ph-remove-')) {
    const id = key.replace('entity:ph-remove-', '');
    p.setPendingPHRemoveIds((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
  } else if (key.startsWith('entity:run-add-')) {
    const idx = parseInt(key.split('-').pop()!, 10);
    p.setPendingRunAdds((prev) => prev.filter((_, i) => i !== idx));
  } else if (key.startsWith('entity:run-remove-')) {
    const id = key.replace('entity:run-remove-', '');
    p.setPendingRunRemoveIds((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
  } else if (key.startsWith('entity:run-end-')) {
    const id = key.replace('entity:run-end-', '');
    p.setPendingRunEndIds((prev) => {
      const m = new Map(prev);
      m.delete(id);
      return m;
    });
  }
}
