import { createUploadHandler } from '@/lib/upload-handler';
import { PHOTO_VARIANTS } from '@/lib/image-resize';

// @contract: POST /api/upload/platform-logo — accepts multipart form with a single 'file' field.
// Returns { url: string } with the relative R2 key (e.g. "uuid.png"), not a full URL.
// @boundary: max 5 MB, JPEG/PNG/WebP only — enforced by upload-handler via upload-config.ts
// @sideeffect: writes original + PHOTO_VARIANTS (_sm, _md, _lg) to R2 bucket 'faniverz-platform-logos'
// @coupling: uses PHOTO_VARIANTS (not a logo-specific variant set) — platform logos are resized
// with the same dimensions as actor photos; bucket name must match R2 bucket in Cloudflare
// @edge: platform logos are often transparent PNGs; the resize pipeline preserves format but
// quality param applies JPEG-style compression to PNGs which has no effect (PNG is lossless)
export const POST = createUploadHandler({
  bucket: 'faniverz-platform-logos',
  variants: PHOTO_VARIANTS,
  baseUrlEnvVar: 'R2_PUBLIC_BASE_URL_PLATFORMS',
  label: 'Platform logo',
});
