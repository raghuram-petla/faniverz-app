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

// @contract Extracts a human-readable name from audit details based on entity_type.
// Falls back to null if no recognizable name field is found.
// @coupling Field names MUST match actual DB column names (not denormalized names).
// Junction tables that only store FK UUIDs should return null here — the DB view
// resolves their display names via JOINs (see audit_log_view).
// @invariant Every entry in AUDIT_ENTITY_TYPES must have an explicit case here.
// The auditEntityDisplayNameCoverage test enforces this — never add a new entity
// type to AUDIT_ENTITY_TYPES without adding a corresponding case below.
export function getEntityDisplayName(
  entityType: string,
  details: Record<string, unknown>,
): string | null {
  // @assumes details has `new` for create/update, `old` for delete
  const entity = (details.new ?? details.old) as Record<string, unknown> | undefined;
  if (!entity) return null;

  // @edge Each entity type has a different "name" field — matches TG_TABLE_NAME values
  switch (entityType) {
    // ── Tables with `title` field ──────────────────────────────────────
    case 'movies':
    case 'notifications':
    case 'surprise_content':
    case 'news_feed':
      return (entity.title as string) ?? null;

    // ── Tables with `name` field ───────────────────────────────────────
    case 'actors':
    case 'platforms':
    case 'production_houses':
    case 'countries':
    case 'languages':
    case 'admin_roles':
      return (entity.name as string) ?? null;

    // ── Admin junction tables resolved by DB view (JOINs profiles for name) ──
    case 'admin_user_roles':
    case 'admin_ph_assignments':
      return null;

    case 'admin_invitations':
      return (entity.email as string) ?? null;

    // ── Movie sub-entity tables with inline name fields ────────────────
    case 'movie_cast':
      // @coupling actual column is `role_name`, not `character_name`
      return (entity.role_name as string) ?? null;
    case 'movie_images':
      return (entity.title as string) ?? (entity.image_type as string) ?? null;
    case 'movie_backdrops':
      return (entity.image_type as string) ?? null;
    case 'movie_posters':
      return (entity.title as string) ?? null;
    case 'movie_videos':
      return (entity.title as string) ?? null;
    case 'movie_keywords':
      // @coupling actual column is `keyword_name`, not `keyword`
      return (entity.keyword_name as string) ?? null;

    // ── Junction tables resolved by DB view (no name field in table) ───
    // These return null here; the DB view resolves them via JOINs.
    // The page display uses: entity_display_name ?? getEntityDisplayName() ?? truncatedId
    case 'movie_theatrical_runs':
    case 'movie_platforms':
    case 'movie_platform_availability':
    case 'movie_production_houses':
    case 'user_languages':
      return null;

    default:
      // @edge Unknown entity type — try common name fields as last resort.
      // If you land here, add an explicit case above and update AUDIT_ENTITY_TYPES.
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
  create: { bg: 'bg-green-600/20', text: 'text-status-green' },
  update: { bg: 'bg-blue-600/20', text: 'text-status-blue' },
  delete: { bg: 'bg-red-600/20', text: 'text-status-red' },
  sync: { bg: 'bg-purple-600/20', text: 'text-status-purple' },
};
