import { createUploadHandler } from '@/lib/upload-handler';
import { BACKDROP_VARIANTS } from '@/lib/image-resize';

export const POST = createUploadHandler({
  bucket: 'faniverz-movie-backdrops',
  variants: BACKDROP_VARIANTS,
  baseUrlEnvVar: 'R2_PUBLIC_BASE_URL_BACKDROPS',
  label: 'Movie backdrop',
});
