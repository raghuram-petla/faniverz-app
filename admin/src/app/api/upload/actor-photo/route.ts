import { createUploadHandler } from '@/lib/upload-handler';
import { PHOTO_VARIANTS } from '@/lib/image-resize';

export const POST = createUploadHandler({
  bucket: 'faniverz-actor-photos',
  variants: PHOTO_VARIANTS,
  baseUrlEnvVar: 'R2_PUBLIC_BASE_URL_ACTORS',
  label: 'Actor photo',
});
