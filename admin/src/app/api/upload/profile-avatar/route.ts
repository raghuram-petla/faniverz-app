import { createUploadHandler } from '@/lib/upload-handler';
import { AVATAR_VARIANTS } from '@/lib/image-resize';

export const POST = createUploadHandler({
  bucket: 'faniverz-profile-avatars',
  variants: AVATAR_VARIANTS,
  baseUrlEnvVar: 'R2_PUBLIC_BASE_URL_AVATARS',
  label: 'Profile avatar',
});
