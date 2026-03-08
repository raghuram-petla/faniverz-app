import { createUploadHandler } from '@/lib/upload-handler';
import { PHOTO_VARIANTS } from '@/lib/image-resize';

export const POST = createUploadHandler({
  bucket: 'faniverz-platform-logos',
  variants: PHOTO_VARIANTS,
  baseUrlEnvVar: 'R2_PUBLIC_BASE_URL_PLATFORMS',
  label: 'Platform logo',
});
