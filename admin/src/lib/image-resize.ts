// @boundary: sharp is a native binary — it works on the Next.js server but NOT in
// Edge Runtime or browser bundles. If any route using image-resize is deployed with
// edge runtime, the import fails at build time with "Module not found: sharp".
import sharp from 'sharp';
import { VARIANT_SPECS, type VariantSpec } from '@/lib/variant-config';

// Re-export variant arrays for upload routes
export type ImageVariant = VariantSpec;
export const POSTER_VARIANTS = VARIANT_SPECS.poster;
export const BACKDROP_VARIANTS = VARIANT_SPECS.backdrop;
export const PHOTO_VARIANTS = VARIANT_SPECS.photo;
export const AVATAR_VARIANTS = VARIANT_SPECS.avatar;

// @contract: generates resized variants but NEVER generates an 'original' — the caller
// (r2-sync.ts, upload-handler.ts) is responsible for uploading the original buffer
// separately alongside the generated variants. If a caller only uploads variants
// without the original, the DB stores the original-keyed URL but R2 has no matching object.
// @assumes: withoutEnlargement=true means variants larger than the source are skipped
// silently — a 100px-wide actor photo uploaded as a poster will produce _sm (200px)
// variant that is actually 100px, not upscaled. The _md and _lg variants will also
// be 100px, NOT the requested 400/800px.
export async function generateVariants(
  buffer: Buffer,
  contentType: string,
  variants: ImageVariant[],
): Promise<{ suffix: string; buffer: Buffer; contentType: string }[]> {
  const format =
    contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpeg';

  const results = await Promise.all(
    variants.map(async (variant) => {
      const resized = await sharp(buffer)
        .resize(variant.width, variant.height, { fit: 'inside', withoutEnlargement: true })
        [format]({ quality: variant.quality })
        .toBuffer();
      return { suffix: variant.suffix, buffer: resized, contentType };
    }),
  );

  return results;
}
