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

export const actionStyles: Record<string, { bg: string; text: string }> = {
  create: { bg: 'bg-green-600/20', text: 'text-green-400' },
  update: { bg: 'bg-blue-600/20', text: 'text-blue-400' },
  delete: { bg: 'bg-red-600/20', text: 'text-red-400' },
  sync: { bg: 'bg-purple-600/20', text: 'text-purple-400' },
};
