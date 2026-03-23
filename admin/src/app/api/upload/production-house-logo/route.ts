import { createUploadHandler } from '@/lib/upload-handler';
import { PHOTO_VARIANTS } from '@/lib/image-resize';

// @contract: POST /api/upload/production-house-logo — accepts multipart form with a single 'file' field.
// Returns { url: string } with the relative R2 key (e.g. "uuid.png"), not a full URL.
// @boundary: max 5 MB, JPEG/PNG/WebP only — enforced by upload-handler via upload-config.ts
// @sideeffect: writes original + PHOTO_VARIANTS (_sm, _md, _lg) to R2 bucket 'faniverz-production-house-logos'
// @coupling: uses PHOTO_VARIANTS (not a logo-specific variant set) — production house logos
// are resized with the same dimensions as actor photos; bucket name must match R2 in Cloudflare
// @edge: production_house_admin role CAN upload here (bucket includes 'production') but cannot
// upload to other buckets — see upload-handler.ts role check
export const POST = createUploadHandler({
  bucket: 'faniverz-production-house-logos',
  variants: PHOTO_VARIANTS,
  baseUrlEnvVar: 'R2_PUBLIC_BASE_URL_PRODUCTION_HOUSES',
  label: 'Production house logo',
});
