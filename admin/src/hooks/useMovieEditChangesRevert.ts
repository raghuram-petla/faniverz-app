import type { UseMovieEditChangesParams } from './useMovieEditTypes';

// @sideeffect Undoes a single entity-level pending change
export function revertEntity(key: string, p: UseMovieEditChangesParams) {
  if (key.startsWith('entity:cast-add-')) {
    // @sync: key format is 'entity:cast-add-{_id}' — extract _id after the prefix
    const _id = key.replace('entity:cast-add-', '');
    p.setPendingCastAdds((prev) => prev.filter((c) => c._id !== _id));
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
    // @sync: key format is 'entity:video-add-{_id}' — extract _id after the prefix
    const _id = key.replace('entity:video-add-', '');
    p.setPendingVideoAdds((prev) => prev.filter((v) => v._id !== _id));
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
    // @sync: key format is 'entity:platform-add-{platform_id}' — filter by stable natural key
    const platformId = key.replace('entity:platform-add-', '');
    p.setPendingPlatformAdds((prev) => prev.filter((item) => item.platform_id !== platformId));
  } else if (key.startsWith('entity:platform-remove-')) {
    const id = key.replace('entity:platform-remove-', '');
    p.setPendingPlatformRemoveIds((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
  } else if (key.startsWith('entity:ph-add-')) {
    // @sync: key format is 'entity:ph-add-{production_house_id}' — filter by stable natural key
    const phId = key.replace('entity:ph-add-', '');
    p.setPendingPHAdds((prev) => prev.filter((item) => item.production_house_id !== phId));
  } else if (key.startsWith('entity:ph-remove-')) {
    const id = key.replace('entity:ph-remove-', '');
    p.setPendingPHRemoveIds((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
  } else if (key.startsWith('entity:run-add-')) {
    // @sync: key format is 'entity:run-add-{_id}' — extract _id and filter by stable UUID, not index
    const _id = key.replace('entity:run-add-', '');
    p.setPendingRunAdds((prev) => prev.filter((r) => r._id !== _id));
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
