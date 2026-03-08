import { createUploadHandler } from '@/lib/upload-handler';
import { PHOTO_VARIANTS } from '@/lib/image-resize';

export const POST = createUploadHandler({
  bucket: 'faniverz-production-house-logos',
  variants: PHOTO_VARIANTS,
  baseUrlEnvVar: 'R2_PUBLIC_BASE_URL_PRODUCTION_HOUSES',
  label: 'Production house logo',
});
