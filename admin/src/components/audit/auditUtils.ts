// @edge: compares fields using JSON.stringify, which means objects with the same keys
// in different order are treated as different (e.g. {a:1,b:2} vs {b:2,a:1}). In
// practice this rarely triggers false positives because Supabase returns consistent
// key ordering, but manually constructed audit details could show phantom "changes".
// @assumes: details.old and details.new are flat or shallow objects. Deeply nested
// objects are compared as serialized strings, so a deeply-nested field change shows
// the entire subtree as changed, not just the leaf field.
export function getChangedFields(details: Record<string, unknown>): Record<string, unknown> | null {
  const old = details.old as Record<string, unknown> | undefined;
  const newVal = details.new as Record<string, unknown> | undefined;
  if (!old || !newVal) return null;

  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(newVal)) {
    if (JSON.stringify(old[key]) !== JSON.stringify(newVal[key])) {
      changes[key] = { from: old[key], to: newVal[key] };
    }
  }
  return Object.keys(changes).length > 0 ? changes : null;
}

/** Format details for display — show diff for updates, relevant data for create/delete */
export function formatDetails(action: string, details: Record<string, unknown>): string {
  if (action === 'update') {
    const diff = getChangedFields(details);
    if (diff) return JSON.stringify(diff, null, 2);
  }
  if (action === 'create' && details.new) {
    return JSON.stringify(details.new, null, 2);
  }
  if (action === 'delete' && details.old) {
    return JSON.stringify(details.old, null, 2);
  }
  return JSON.stringify(details, null, 2);
}

// @contract Extracts a human-readable name from audit details based on entity_type
// Falls back to null if no recognizable name field is found
export function getEntityDisplayName(
  entityType: string,
  details: Record<string, unknown>,
): string | null {
  // @assumes details has `new` for create/update, `old` for delete
  const entity = (details.new ?? details.old) as Record<string, unknown> | undefined;
  if (!entity) return null;

  // @edge Each entity type has a different "name" field
  switch (entityType) {
    case 'movies':
      return (entity.title as string) ?? null;
    case 'actors':
      return (entity.name as string) ?? null;
    case 'platforms':
    case 'production_houses':
      return (entity.name as string) ?? null;
    case 'movie_cast':
      return (entity.character_name as string) ?? null;
    case 'notifications':
    case 'surprise_content':
      return (entity.title as string) ?? null;
    case 'movie_posters':
      return (entity.poster_type as string) ?? null;
    case 'movie_theatrical_runs':
      return (entity.status as string) ?? null;
    case 'movie_platforms':
      return (entity.platform_name as string) ?? null;
    case 'movie_production_houses':
      return (entity.production_house_name as string) ?? null;
    default:
      // Try common name fields
      return (entity.title as string) ?? (entity.name as string) ?? null;
  }
}

// @contract Determines if an audit entry can be reverted
// Sync actions and entries without sufficient data cannot be reverted
export function canRevert(action: string, details: Record<string, unknown>): boolean {
  if (action === 'sync') return false;
  if (action === 'update' && !details?.old) return false;
  if (action === 'delete' && !details?.old) return false;
  if (action === 'create' && !details?.new) return false;
  return true;
}

// @contract Returns a human-readable description of what reverting will do
export function getRevertDescription(action: string): string {
  switch (action) {
    case 'update':
      return 'Restore previous values';
    case 'create':
      return 'Delete this entity';
    case 'delete':
      return 'Re-create this entity';
    default:
      return 'Revert this change';
  }
}

export const actionStyles: Record<string, { bg: string; text: string }> = {
  create: { bg: 'bg-green-600/20', text: 'text-green-400' },
  update: { bg: 'bg-blue-600/20', text: 'text-blue-400' },
  delete: { bg: 'bg-red-600/20', text: 'text-red-400' },
  sync: { bg: 'bg-purple-600/20', text: 'text-purple-400' },
};
