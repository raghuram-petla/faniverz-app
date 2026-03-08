import { createUploadHandler } from '@/lib/upload-handler';
import { POSTER_VARIANTS } from '@/lib/image-resize';

export const POST = createUploadHandler({
  bucket: 'faniverz-movie-posters',
  variants: POSTER_VARIANTS,
  baseUrlEnvVar: 'R2_PUBLIC_BASE_URL_POSTERS',
  label: 'Movie poster',
});
