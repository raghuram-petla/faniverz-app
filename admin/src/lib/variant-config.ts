// Re-export from shared source of truth
// @coupling: admin's image-resize.ts and the mobile app's getImageUrl() both depend on
// the same variant suffixes (_sm, _md, _lg) defined in @shared/variant-config. If the
// shared config changes suffix names, all existing R2 objects with old suffixes become
// unreachable — mobile shows broken images until a full re-sync uploads new-suffix copies.
export { VARIANT_SPECS } from '@shared/variant-config';
export type { VariantSpec, VariantType } from '@shared/variant-config';
