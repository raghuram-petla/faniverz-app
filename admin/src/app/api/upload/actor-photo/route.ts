import { createUploadHandler } from '@/lib/upload-handler';
import { PHOTO_VARIANTS } from '@/lib/image-resize';

// @contract: POST /api/upload/actor-photo — accepts multipart form with a single 'file' field.
// Returns { url: string } with the relative R2 key (e.g. "uuid.jpg"), not a full URL.
// @boundary: max 5 MB, JPEG/PNG/WebP only — enforced by upload-handler via upload-config.ts
// @sideeffect: writes original + PHOTO_VARIANTS (_sm, _md, _lg) to R2 bucket 'faniverz-actor-photos'
// @coupling: PHOTO_VARIANTS from image-resize.ts -> variant-config.ts -> @shared/variant-config;
// bucket name must match the R2 bucket provisioned in Cloudflare; baseUrlEnvVar must be set in .env.local
// @edge: partial upload failure (some variants written, others not) returns 500 but does not
// clean up already-written objects — orphaned variants accumulate in R2 with no GC mechanism
export const POST = createUploadHandler({
  bucket: 'faniverz-actor-photos',
  variants: PHOTO_VARIANTS,
  baseUrlEnvVar: 'R2_PUBLIC_BASE_URL_ACTORS',
  label: 'Actor photo',
});
