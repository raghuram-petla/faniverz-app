import { createUploadHandler } from '@/lib/upload-handler';
import { POSTER_VARIANTS } from '@/lib/image-resize';

// @contract: POST /api/upload/movie-poster — accepts multipart form with a single 'file' field.
// Returns { url: string } with the relative R2 key (e.g. "uuid.jpg"), not a full URL.
// @boundary: max 5 MB, JPEG/PNG/WebP only — enforced by upload-handler via upload-config.ts
// @sideeffect: writes original + POSTER_VARIANTS (_sm, _md, _lg) to R2 bucket 'faniverz-movie-posters'
// @coupling: POSTER_VARIANTS from image-resize.ts -> variant-config.ts -> @shared/variant-config;
// bucket name must match R2 bucket in Cloudflare; baseUrlEnvVar must be set in .env.local
// @edge: if admin uploads a poster then re-syncs from TMDB, the TMDB sync overwrites poster_url
// in the DB with a tmdbId-keyed URL, orphaning the UUID-keyed upload in R2 permanently
export const POST = createUploadHandler({
  bucket: 'faniverz-movie-posters',
  variants: POSTER_VARIANTS,
  baseUrlEnvVar: 'R2_PUBLIC_BASE_URL_POSTERS',
  label: 'Movie poster',
});
