import { createUploadHandler } from '@/lib/upload-handler';
import { AVATAR_VARIANTS } from '@/lib/image-resize';

// @contract: POST /api/upload/profile-avatar — accepts multipart form with a single 'file' field.
// Returns { url: string } with the relative R2 key (e.g. "uuid.jpg"), not a full URL.
// @boundary: max 5 MB, JPEG/PNG/WebP only — enforced by upload-handler via upload-config.ts
// @sideeffect: writes original + AVATAR_VARIANTS (_sm, _md, _lg) to R2 bucket 'faniverz-profile-avatars'
// @coupling: AVATAR_VARIANTS from image-resize.ts -> variant-config.ts -> @shared/variant-config;
// bucket name must match R2 bucket in Cloudflare; baseUrlEnvVar must be set in .env.local
// @edge: old avatar is never deleted from R2 when a user uploads a new one — each upload creates
// a new UUID key, leaving the previous avatar objects orphaned indefinitely
export const POST = createUploadHandler({
  bucket: 'faniverz-profile-avatars',
  variants: AVATAR_VARIANTS,
  baseUrlEnvVar: 'R2_PUBLIC_BASE_URL_AVATARS',
  label: 'Profile avatar',
});
