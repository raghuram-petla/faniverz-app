import type { UseMovieEditChangesParams } from './useMovieEditTypes';

// @sideeffect Undoes a single entity-level pending change
export function revertEntity(key: string, p: UseMovieEditChangesParams) {
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
    const _id = key.replace('entity:poster-add-', '');
    p.setPendingPosterAdds((prev) => prev.filter((poster) => poster._id !== _id));
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
