// Duplicated from admin/src/lib/image-resize.ts
// Keep in sync — this logic rarely changes.

import sharp from 'sharp';
import { VARIANT_SPECS, type VariantSpec } from './variant-config';

export type ImageVariant = VariantSpec;
export const POSTER_VARIANTS = VARIANT_SPECS.poster;
export const BACKDROP_VARIANTS = VARIANT_SPECS.backdrop;
export const PHOTO_VARIANTS = VARIANT_SPECS.photo;
export const AVATAR_VARIANTS = VARIANT_SPECS.avatar;

export async function generateVariants(
  buffer: Buffer,
  contentType: string,
  variants: ImageVariant[],
): Promise<{ suffix: string; buffer: Buffer; contentType: string }[]> {
  const format =
    contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpeg';

  return Promise.all(
    variants.map(async (variant) => {
      const resized = await sharp(buffer)
        .resize(variant.width, variant.height, { fit: 'inside', withoutEnlargement: true })
        [format]({ quality: variant.quality })
        .toBuffer();
      return { suffix: variant.suffix, buffer: resized, contentType };
    }),
  );
}
